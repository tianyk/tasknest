# 架构设计（实现层）

> 产品模型与需求以 `prd.md` 为准（§2 核心模型、§33 内部架构）。
> 本文只记录实现层决策；与 prd.md 冲突时以 prd.md 为准并修正本文。

## 1. 分层与依赖方向

```text
            CLI（src/cli）
                   │
                   ▼
            Task Core（src/core）      唯一业务入口
                   │
                   ▼
           Repository（src/db）        schema / 迁移 / 持久化
                   │
                   ▼
             SQLite（bun:sqlite，~/.tasknest/tasknest.db）
```

（Future：MCP 等新入口接入时只能调用 core，不得直连 `src/db`）

硬性约束：

- `src/cli` 只调用 `src/core`，不得直连 `src/db`；`src/mcp` 为一期占位（MCP 属 Future），接入时遵循同一约束
- `src/core` 是唯一业务用例层，全部业务规则集中于此
- `src/db` 不包含业务规则；SQL 仅允许出现在此层
- `src/config` 提供路径解析、项目标记发现、TOML 读写能力，被 core 调用
- `src/types` 只放共享类型，不依赖其他 src 模块
- 禁止反向依赖（db → core、core → cli、core → mcp）

## 2. 模块职责

| 模块 | 职责 | 主要导出（规划） |
|------|------|------------------|
| `src/core/project.ts` | 项目创建与解析 | `createProject` `resolveProject` `listProjects` |
| `src/core/task.ts` | Task 生命周期与查询 | `createTask` `getTask` `listTasks` `updateTask` `updateTaskStatus` `deleteTask` `splitTask` |
| `src/core/comment.ts` | Activity / Comment | `addComment` `listComments` |
| `src/core/errors.ts` | 领域错误 | `ProjectNotFoundError` `TaskNotFoundError` `InvalidStatusTransitionError` 等 |
| `src/db/database.ts` | 连接、PRAGMA、迁移入口 | `openDatabase` `getDatabase` |
| `src/db/migrations/` | 版本化迁移 | 按 `PRAGMA user_version` 递增 |
| `src/db/project_repository.ts` 等 | 数据访问 | 仅返回领域对象，不抛业务错误 |
| `src/config/paths.ts` | `~/.tasknest` 与 marker 路径 | `getTasknestHome` `getDatabasePath` `getProjectMarkerPath` |
| `src/config/project_discovery.ts` | cwd 向上发现 marker，兜底 Personal | `discoverProject` |
| `src/config/toml.ts` | TOML 读写（Bun.TOML.parse + 手写序列化） | `readToml` `writeToml` |
| `src/cli/` | 命令分发与输出 | `main` 及各命令处理器 |
| `src/mcp/server.ts` | （Future）stdio MCP Server 与 tools | `startMcpServer` |

## 3. 关键实现决策

### 3.1 运行与构建

- 运行时只依赖 Bun；TypeScript 直接运行，无编译步骤
- 单二进制：`bun build src/index.ts --compile --outfile dist/tasknest`
- 运行时依赖默认零新增；MCP 属 Future，接入时使用官方 `@modelcontextprotocol/sdk`
- 内置能力优先：`Bun.randomUUIDv7()`（主键）、`Bun.TOML.parse()`（配置）、`bun:sqlite`（存储）、`Bun.file()`（文件读写）

### 3.2 项目解析

- 从 `process.cwd()` 逐级向上查找 `.tasknest/project.toml`，命中即停
- 向上查找不得越过 `$HOME`；未命中时落到 `~/.tasknest/project.toml` 对应的 `Personal` 项目
- 解析结果为领域对象 `Project`；CLI 调用同一实现（未来 MCP 以进程 cwd 解析）

### 3.3 时间与编号

- 时间戳统一为 UTC ISO-8601 字符串（`YYYY-MM-DDTHH:mm:ss.sssZ`），展示时转本地时区
- Project / Task 主键为 UUIDv7（时间有序）；Task 人类编号为项目内自增正整数 `#number`
- 编号分配必须在写事务内完成（见 database-schema.md §3）

### 3.4 错误与输出

- core 抛出领域错误；错误类集中定义在 `src/core/errors.ts`
- CLI 捕获领域错误 → 输出中文文案 + 稳定非零退出码（禁止 stack trace）
- Future 的 MCP 接入时捕获领域错误 → 转译为 tool error；绝不使 Server 进程退出
- 一期 CLI 仅纯文本输出；不提前实现 `--json`

## 4. 明确不做（一期）

Web UI、Remote Server、MCP Server / MCP Tools、账号 / 权限、多人协作、云同步、附件、标签、优先级、截止日期、通知、自定义 Status / Workflow、复杂 Task Relation、Git Commit 自动关联。

完整清单见 `prd.md` §5；领域约束见 `AGENTS.md` §1。
