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
- core 确定业务事务边界，db 提供事务执行与 repository 操作；SQL 和事务语句都留在 db，编号分配与写入策略见 database-schema.md §3

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
- 按 PRD §9 确定查找边界：遇到 `$HOME` 或文件系统根目录即停止；未命中时解析全局 Personal 标记
- 标记读取 / TOML 解析由 config 完成，core 负责判断标记有效性与 Project 是否存在；失败时按 PRD §9 报错，不静默切换 Project
- 初始化在写入前重新检查当前目录标记，按 PRD §11 实现重复调用行为；文件写入不能覆盖已有的不同绑定
- 解析结果为领域对象 `Project`；CLI 调用同一实现（未来 MCP 以进程 cwd 解析）

### 3.3 时间与编号

- 时间戳统一为 UTC ISO-8601 字符串（`YYYY-MM-DDTHH:mm:ss.sssZ`），展示时转本地时区
- Project / Task / Comment 主键为 UUIDv7（时间有序）；Task 编号由 Project 的内部持久化游标分配（见 database-schema.md §3）
- 编号分配与 Task 插入共用 `BEGIN IMMEDIATE` 写事务，支持多个 CLI 进程；禁止使用现存 Task 最大编号作为分配依据
- 状态转换表及时间字段语义以 PRD §14 为准，由 core 统一校验和计算，CLI 状态别名只做参数转换

### 3.4 错误与输出

- core 抛出领域错误；错误类集中定义在 `src/core/errors.ts`
- CLI 捕获领域错误 → 按 PRD §24 输出中文文案与退出码（禁止 stack trace），参数错误和业务错误采用不同映射
- Future 的 MCP 接入时捕获领域错误 → 转译为 tool error；绝不使 Server 进程退出
- 一期 CLI 仅纯文本输出；不提前实现 `--json`

### 3.5 CLI 参数与输入校验

- 参数名称、默认值、互斥关系与非交互行为以 PRD §24-§27 为准，CLI 不另定业务规则
- CLI 解析参数数量、已知选项和基本格式；core 仍须校验标题、评论、状态、作者类型和 Project / Task 归属，保证未来入口复用相同规则
- `--help` / `--version` 在调用初始化用例前返回；正常业务命令再进入 core 的项目解析流程
- `edit` 未传的字段不进入更新集合，显式空描述转换为清空意图；不能把未传参数误判为清空
- `--author-type` / `--type` 是内容元数据，不引入账号或权限校验

### 3.6 验证方式

- 遵循 AGENTS.md：不编写单元测试，保留 lint、typecheck、构建与现有检查
- 业务验收从真实 CLI 或跨层集成入口执行，使用隔离目录和真实 SQLite，记录输入、输出、退出码及数据结果
- 至少覆盖 PRD §36，以及重复初始化、无效标记、删除后编号不复用、并发创建、非法状态转换、幂等状态更新与来源删除后的派生任务
- 一期验证不为单元测试引入 mock、依赖注入框架或额外测试依赖

## 4. 明确不做（一期）

Web UI、Remote Server、MCP Server / MCP Tools、账号 / 权限、多人协作、云同步、附件、标签、优先级、截止日期、通知、自定义 Status / Workflow、复杂 Task Relation、Git Commit 自动关联。

完整清单见 `prd.md` §5；领域约束见 `AGENTS.md` §1。
