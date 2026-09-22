# 数据库设计（SQLite 落地）

> 表与字段的语义权威定义见 `prd.md` §32；本文只记录 SQLite 落地决策。
> 与 prd.md 冲突时以 prd.md 为准并修正本文。

## 1. 存储位置与打开参数

- 数据库文件：`~/.tasknest/tasknest.db`（目录不存在时由初始化流程创建）
- 打开时必须设置：

```sql
PRAGMA journal_mode = WAL;      -- 单机并发读写
PRAGMA foreign_keys = ON;       -- 启用外键约束
PRAGMA busy_timeout = 5000;     -- 避免瞬时锁冲突直接报错
```

- 时间列统一使用 TEXT，存 UTC ISO-8601（`YYYY-MM-DDTHH:mm:ss.sssZ`）
- 主键统一 TEXT（UUIDv7，由 `Bun.randomUUIDv7()` 生成，禁止依赖 SQLite 自增 ID）

## 2. 一期 Schema（version 1）

```sql
CREATE TABLE projects (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	number INTEGER NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'canceled')),
	derived_from_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	completed_at TEXT,
	UNIQUE (project_id, number)
);

CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX idx_tasks_derived_from ON tasks (derived_from_task_id);

CREATE TABLE comments (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
	type TEXT NOT NULL CHECK (type IN ('comment', 'analysis', 'progress', 'result', 'system')),
	author_type TEXT NOT NULL CHECK (author_type IN ('user', 'agent', 'system')),
	author TEXT,
	content TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT
);

CREATE INDEX idx_comments_task_created ON comments (task_id, created_at);

CREATE TABLE memories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	type TEXT NOT NULL CHECK (type IN ('architecture', 'decision', 'convention', 'constraint', 'domain', 'preference', 'lesson')),
	content TEXT NOT NULL,
	source_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
	created_by TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX idx_memories_project_type ON memories (project_id, type);
CREATE INDEX idx_memories_source_task ON memories (source_task_id);
```

约束说明：

- `status` 五态固定，一期不新增；CHECK 约束用于兜底，业务校验在 core
- `type` / `author_type` 为 PRD §19 预留枚举；一期 CLI 默认写 `comment` + `user`，Agent 可写 `analysis` / `progress` / `result`
- `derived_from_task_id` 是唯一 Task 关系，自引用；被引用 Task 删除时置空而非级联删除
- `memories` 为 PRD §35-§39 一期能力；`id` 使用 SQLite 自增主键（`AUTOINCREMENT` 防止删除后复用），与 Project / Task 的 UUIDv7 策略不同（PRD §32）
- `memories.source_task_id` 可空；来源 Task 删除时置空，Memory 保留（PRD §37）
- `memories.type` 固定七类；`created_by` 记录写入者（如 `user` / `agent`）
- Memory 搜索一期使用 LIKE 多关键词匹配（限定 `project_id`，按 `updated_at` 倒序），不建 FTS 索引
- 禁止提前建 `task_relations` 等未来表

## 3. 编号分配（`number`）

- 人类编号在 Project 内从 1 递增
- 分配必须在同一写事务内完成：

```sql
SELECT COALESCE(MAX(number), 0) + 1 AS next_number FROM tasks WHERE project_id = ?;
```

- 依赖 `UNIQUE(project_id, number)` 兜底；冲突时重试一次
- 一期单进程使用场景不引入独立计数器表
- Memory 不参与 `number` 体系，直接使用 `memories.id` 自增整数引用（`tasknest memory show 17`）

## 4. 迁移策略

- 版本号存于 `PRAGMA user_version`，从 0 开始
- 迁移定义为有序数组：`{ version, up(db) }`，启动时若 `user_version < latest` 则逐个执行并递增
- 迁移在事务中执行；失败必须回滚并抛错，不静默继续
- 已发布迁移只增不改；禁止就地改写历史迁移
- 初始化流程（首次运行 / `tasknest init`）负责创建 `~/.tasknest/` 目录、db 文件与 `Personal` 项目记录

## 5. 待实现时确认项

- `comments.updated_at` 一期是否会被写入（一期 CLI 暂无编辑 Comment 能力）
- `tasks.completed_at` 在 `done` / `canceled` 间的语义：PRD 仅定义完成时间；取消时是否写入需在实现 `updateTaskStatus` 前确认
- Memory 搜索结果是否需要默认上限（一期按 updated_at 倒序返回全部匹配）
