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
	next_task_number INTEGER NOT NULL DEFAULT 1 CHECK (next_task_number >= 1),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	number INTEGER NOT NULL CHECK (number >= 1),
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
```

约束说明：

- `status` 五态固定，一期不新增；CHECK 约束用于兜底，业务校验在 core
- `type` / `author_type` 的开放范围与默认值见 PRD §19 / §26，core 校验输入；数据库保留完整枚举约束
- `derived_from_task_id` 是唯一 Task 关系，自引用；被引用 Task 删除时置空而非级联删除
- 来源与新 Task 属于同一 Project 由 core 在事务内校验；关系只在创建时写入，避免后续编辑引入循环
- `next_task_number` 是内部持久化字段，不加入对外 Project 模型；不得根据现存 Task 的最大编号重置
- 禁止提前建 `task_relations` 等未来表

## 3. 编号分配（`number`）

- 编号语义以 PRD §13 为准，使用 `projects.next_task_number` 持久保存分配进度，无需第四张表。
- `createTask` 与 `splitTask` 共用同一编号分配路径。core 定义业务事务边界，db 层执行 SQL 与事务。
- 使用 `BEGIN IMMEDIATE` 在读取和推进编号前取得写锁，适用于多个 CLI 进程共享同一数据库。
- 先推进游标，取得 `RETURNING` 的 `number`，再作为后续 INSERT 的 `:number` 参数。以下语句在同一个连接、同一事务中执行：

```sql
BEGIN IMMEDIATE;

UPDATE projects
SET next_task_number = next_task_number + 1
WHERE id = :project_id
RETURNING next_task_number - 1 AS number;

INSERT INTO tasks (
	id, project_id, number, title, description, status,
	derived_from_task_id, created_at, updated_at, completed_at
) VALUES (
	:id, :project_id, :number, :title, :description, 'todo',
	:derived_from_task_id, :created_at, :updated_at, NULL
);

COMMIT;
```

- UPDATE 未返回行时，由 core 报 Project 不存在；任何校验或 INSERT 失败都回滚整笔事务，包含游标推进。
- 删除 Task 不修改游标；业务代码不得回退游标。
- `UNIQUE(project_id, number)` 保留为数据完整性兜底；发生冲突时回滚并报告错误，不通过读取最大编号修补。
- 锁等待遵循 `busy_timeout`；超时后报告运行错误，不做无限重试。

## 4. 迁移策略

- 版本号存于 `PRAGMA user_version`，从 0 开始
- 迁移定义为有序数组：`{ version, up(db) }`，启动时若 `user_version < latest` 则逐个执行并递增
- 多进程启动时，在取得 `BEGIN IMMEDIATE` 写锁后重新读取 `user_version`，按实际版本决定是否迁移
- 迁移在事务中执行；失败必须回滚并抛错，不静默继续
- 已发布迁移只增不改；禁止就地改写历史迁移
- 初始化流程（首次运行 / `tasknest init`）负责创建 `~/.tasknest/` 目录、db 文件与 `Personal` 项目记录
- 当前 version 1 是尚未发布的 Schema 设计；功能发布后新增字段必须走追加迁移

## 5. 时间与空值映射

- `tasks.completed_at` 由 core 按 PRD §14 计算，repository 只持久化结果，不决定状态转换。
- 一次实际状态变化的 `updated_at` 与 `completed_at`（需要写入时）使用同一 UTC 时间值；幂等状态更新不执行写入。
- `comments.updated_at` 按 PRD §19 存 `NULL`，不以创建时间填充。
- 可选描述、作者、来源关系和完成时间缺失时存 `NULL`；领域对象缺失值与 SQLite `NULL` 的转换由 repository 完成。
- 状态读取、core 校验和状态更新在同一写事务中完成，避免并发命令基于过期状态执行转换。
