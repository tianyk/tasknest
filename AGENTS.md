# AGENTS.md

本文件定义 tasknest 仓库代码生成与修改的强约束规则。
若违反，生成结果视为错误实现。

> **[保护约束]** 未经用户明确批准，任何 Agent 禁止修改本文件（`AGENTS.md`）。若任务涉及修改本文件，必须先向用户确认并获得明确许可，否则视为违规操作。

## Workspace Layout

```text
tasknest/        单包工程（Bun + TypeScript）
src/cli/         CLI 命令层
src/core/        业务用例层（唯一业务入口）
src/db/          SQLite schema / 迁移 / repository
src/config/      全局路径 / 项目标记发现 / TOML 读写
src/mcp/         协议入口占位（Future）
src/types/       共享类型
tests/           bun test
docs/design/     实现设计文档
skills/tasknest/ 官方 Agent Skill
```

---

## 0. 决策优先级

```text
AGENTS.md
> prd.md（唯一产品需求权威源）
> docs/design/*.md（实现设计）
> existing code
```

当规范与现有代码冲突：
- 不要模仿旧代码
- 按本文件与 `prd.md` 生成新实现
- 同一迭代中修正旧代码

文档职责约束：
- `prd.md` 是产品需求与领域模型的唯一权威源，不得因实现反馈直接改写；需求变更须由用户确认后显式更新
- `docs/design/*.md` 只记录实现层面的决策（分层、类型、迁移策略等），不得重复或改写产品需求
- 文档与实现冲突时，先修复不一致，再继续开发
- 所有对话回复、代码注释、提交信息、文档默认使用中文；标识符保持英文

### 0.1 Agent Memory Protocol（REQUIRED）

目标不是维护知识库，而是维护“小而有效的工作记忆”。

#### A. Daily（必做）

每次任务结束，最后一步必须追加：

```text
.memory/daily/{YYYY-MM-DD}.md
```

格式：

```markdown
## {HH:MM} [{agent_name}]
- 完成：一句话结果
- 决策：关键选择及原因（可省略）
- 待办：阻塞项（可省略）
```

要求：
- 只记录结果与关键决策，不写过程
- “决策”必须写明 why（为什么）
- 追加，不覆盖；一次任务一条记录，不合并
- 时间格式 HH:MM，东八区
- agent_name 例如：opencode/cursor/codex/claude-code

#### B. Summary（按需更新）

若任务产生长期仍相关的重要模式，更新：

```text
.memory/SUMMARY.md
```

仅允许记录：
- Architecture Invariants
- Current Pitfalls
- Stable Decisions

限制：
- 总量 ≤10 条，全文 ≤400 tokens
- 每项单行表达
- 默认重写 / 合并：`update > append`
- 若新增记忆价值不足，应选择不写入

#### C. Playbooks（暂缓）

本仓库暂不创建 `.memory/PLAYBOOKS.md`。
当同类套路出现 ≥3 次、且可形成 ≥3 条检查项时，再引入并遵循“update > create、总量 ≤5”。

#### D. Retrieval（任务开始前）

开始任务前：
1. 看最近 3 条 Daily
2. 看 SUMMARY.md
3. 若存在 PLAYBOOKS.md，看相关条目

原则：先检索，再行动。

#### E. Memory Compaction（必须执行）

每累计 20 条 Daily，或每月至少一次：
- 删除失效记忆、合并重复项、压缩表达
- 压缩 SUMMARY.md

原则：`Memory budget > Memory growth`

#### F. Version Control

以下目录必须纳入版本控制：

```text
.memory/daily/
.memory/SUMMARY.md
```

不得加入 `.gitignore`。

---

## 1. 一期范围冻结（Scope Freeze）

- 一期范围以 `prd.md` §5 为准，只实现：Project Discovery / Personal / Task / Status / Description / Comment / Split / derived_from / Memory / Memory Search / source_task / CLI / Skill / SQLite / 单二进制
- 以下内容一期明确禁止提前实现：Web UI、Remote Server、MCP Server / MCP Tools、账号 / Token / 权限、多人协作、云同步、附件、标签、优先级、截止日期、通知、自定义 Workflow、自定义 Status、复杂 Task Relation（parent/child/depends_on/blocks/related_to/duplicate）、Git Commit 自动关联、语义搜索 / Embedding / FTS5
- 领域约束：
  - Task 是唯一工作单元，不存在 SubTask / ChildTask 类型
  - Status 固定五态：`todo` / `in_progress` / `blocked` / `done` / `canceled`
  - 一期唯一 Task 关系：`derived_from`
  - Memory 类型固定七类：architecture / decision / convention / constraint / domain / preference / lesson
  - Activity 与 Memory 的边界遵循 `prd.md` §20 / §21：只有跨 Task 仍有价值的信息才写入 Memory，不得把开发总结默认当作长期知识
  - Memory 必须保留 `source_task` 追溯（可空）；不自动全量注入 AI，检索走 `searchMemories`
  - 取消的任务必须用 `canceled`，禁止用 `done` 表达“不做了”
- 新增任何领域概念前，必须先修改 `prd.md` 并获得用户确认

---

## 2. Runtime & Tooling Constraints

仅允许以下技术路径（禁止替代实现）：

```text
Runtime:     Bun
Language:    TypeScript（strict）
Package:     bun（bun.lock 为唯一锁文件）
DB:          bun:sqlite（内置）
TOML:        Bun.TOML.parse（内置）
UUID:        Bun.randomUUIDv7（内置）
Binary:      bun build --compile
Test:        bun test
Lint:        ESLint 9 flat config + typescript-eslint
```

REQUIRED
- 依赖安装 / 新增 / 移除必须使用 `bun`，锁文件只认 `bun.lock`
- 运行时依赖默认零新增；新增前必须向用户说明用途并获得确认
- 优先使用 Bun 内置能力（`Bun.file`、`Bun.TOML.parse`、`Bun.randomUUIDv7`、`bun:sqlite`）
- 提交前必须通过 `bun run lint:check` 与 `bun run typecheck`

FORBIDDEN
- `npm install` / `pnpm add` / `yarn add`
- Node.js 运行时依赖替代内置能力：`better-sqlite3`、`sqlite3`、`toml`、`uuid`、`commander`（如确需引入，必须先获得用户确认）
- 引入 ORM（Prisma / Drizzle / TypeORM 等）
- 引入 Web 框架、Vector DB、Embedding、RAG 基础设施
- 使用 CommonJS（`require` / `module.exports`）

---

## 3. Architecture Boundary

```text
                 CLI
                  │
                  ▼
          ┌───────────────┐
          │   Task Core   │  src/core（唯一业务入口）
          └───────┬───────┘
                  ▼
             Repository      src/db
                  ▼
               SQLite
```

（Future：MCP 等新入口接入时只能调用 core，不得直连 `src/db`）

REQUIRED
- `src/cli` 只做命令解析、参数校验、输出与退出码，不得直接访问 `src/db`
- `src/mcp` 为一期占位目录（MCP 属 Future）；接入时只做协议转换（stdio JSON-RPC ↔ core 调用），不得直接访问 `src/db`
- `src/core` 承载全部业务用例（`createProject` / `resolveProject` / `createTask` / `getTask` / `listTasks` / `updateTask` / `updateTaskStatus` / `deleteTask` / `addComment` / `createMemory` / `searchMemories` / `updateMemory` / `deleteMemory` 等）
- `src/db` 只负责 schema、迁移与持久化，不得包含业务规则
- `src/config` 负责 `~/.tasknest` 路径、project marker 发现、TOML 读写
- `src/types` 存放共享类型，不得依赖其他 src 模块

FORBIDDEN
- CLI 与未来 MCP 各自实现一遍业务逻辑
- 在 `src/core` 之外拼 SQL
- 反向依赖（db → core、core → cli 等）

---

## 4. File & Naming Rules

REQUIRED
- `src/**` 与 `tests/**` 文件名统一 `lower_snake_case`
- 目录名统一 `lower_snake_case`
- 导出函数与变量 `camelCase`；类型 / 接口 `PascalCase`；常量 `UPPER_SNAKE_CASE`
- 测试文件命名 `<module>.test.ts`
- 复合语义使用下划线连接，例如 `project_discovery.ts`

FORBIDDEN
- `PascalCase` 或 `kebab-case` 文件名（`src` 内）
- 无语义命名：`utils.ts`、`helper.ts`、`common.ts`、`temp.ts`、`misc.ts`

---

## 5. Implementation Protocol（必须遵循顺序）

实现功能时严格按顺序：
1. 在 `src/types` 定义或更新类型
2. 在 `src/db` 定义 schema / 迁移 / repository
3. 在 `src/core` 实现业务用例（抛领域错误）
4. 在 `src/cli` 接入命令（仅调用 core）
5. 补充 `tests/` 用例
6. 同步 `skills/tasknest/SKILL.md`（若影响 Agent 使用方式）

禁止从 CLI 开始实现业务；MCP 属 Future，接入时同样只能调用 core。

---

## 6. Data & Storage Contract

- 全局数据目录：`~/.tasknest/`（`tasknest.db` / `config.toml` / `project.toml`）
- 项目内 `.tasknest/project.toml` 只负责定位 Project，不保存 Task 数据
- 时间统一存 UTC ISO-8601 字符串，展示层转本地时区
- 主键：Project / Task 使用 UUIDv7；`memories` 使用 `INTEGER PRIMARY KEY AUTOINCREMENT`（本地自增，删除后不复用）
- 人类编号 `#number` 在 Project 内对 Task 递增，`UNIQUE(project_id, number)`；Memory 直接使用自增 id 展示与引用
- 迁移使用 `PRAGMA user_version`，只增不改；已发布迁移禁止就地改写
- 详细规范见 `docs/design/database-schema.md`

---

## 7. Error & Output Contract

- `src/core` 抛领域错误（如 `TaskNotFoundError` / `ProjectNotFoundError` / `MemoryNotFoundError`），错误类集中在 `src/core/errors.ts`
- CLI 捕获领域错误，输出可读中文文案与稳定的非零退出码；禁止裸露 stack trace
- Future 的 MCP 接入时将错误转译为 tool error，不得使 Server 进程崩溃
- 一期 CLI 输出为纯文本；`--json` 属后续能力，不得提前实现

---

## 8. Commit Convention

- 采用 Conventional Commits，描述使用中文
- 类型：`feat` / `fix` / `docs` / `refactor` / `build` / `style` / `chore` / `test`，可带 scope，例如：
  - `feat(cli): 支持 tasknest split 与 derived_from`
  - `fix(core): 修复项目标记向上查找越界`
- 未经用户明确要求，不得执行 git 提交

---

## 9. Task → Docs Mapping

执行任务前必须阅读对应文档：

| Task | Read |
|------|------|
| 了解产品模型 / 需求 / 边界 | `prd.md` |
| 了解数据目录 / Project 发现 / Personal | `prd.md` §6-§11 |
| 写 Task / Status / Comment 逻辑 | `prd.md` §12-§21 + `docs/design/database-schema.md` |
| 写 split / derived_from | `prd.md` §22-§23 |
| 写 Memory / 搜索逻辑 | `prd.md` §35-§39 + `docs/design/database-schema.md` |
| 写 Memory CLI | `prd.md` §26 / §39 + `docs/design/architecture.md` |
| 写 CLI 命令 | `prd.md` §24-§27 |
| （Future）写 MCP Server / Tools | `prd.md` §28-§30 + `docs/design/architecture.md` |
| 更新官方 Skill | `prd.md` §31 + `skills/tasknest/SKILL.md` |
| 了解分层与模块边界 | `docs/design/architecture.md` |

---

## 10. Acceptance Checklist

任何功能交付前必须满足：

- `bun run lint:check` 通过
- `bun run typecheck` 通过
- `bun test` 通过；核心用例（project 发现、状态流转、derived_from、Memory 增删改查与搜索）必须有测试覆盖
- `bun run build` 产出可执行 `dist/tasknest`
- CLI 行为来自 core 实现；未来 MCP 必须复用同一 core
- 未越出一期范围，未提前实现 Memory / Web / 复杂关系
- 任务结束已追加 `.memory/daily/{YYYY-MM-DD}.md`
