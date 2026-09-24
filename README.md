# TaskNest

**TaskNest = Task + Nest**：Task 是任务，Nest 是巢、聚集和沉淀的地方。

> TaskNest：任务的栖息地。
> A home for tasks.

面向开发者与 AI Coding Agent 的本地项目任务管理工具。

Local-first、CLI-first、AI-first：记录“要做什么”（Task）和“这次工作发生了什么”（Activity）。最终以单个二进制 `tasknest` 分发，无需额外 Runtime。

> 当前状态：**一期功能已实现**（Project 发现 / Task / Status / Activity / split / CLI / SQLite / 单二进制）。
> 产品需求见 [prd.md](./prd.md)。

## 技术栈

- Bun + TypeScript（strict）
- bun:sqlite（本地 SQLite）
- bun build --compile（单二进制 `dist/tasknest`）

## 快速开始

```bash
bun install          # 安装开发依赖
bun run dev          # 运行 CLI 入口（--watch）
bun run typecheck    # 类型检查
bun run lint:check   # ESLint 检查
bun test             # 运行现有检查及集成 / 端到端验收
bun run build        # 编译单二进制 dist/tasknest
```

## 使用示例

```bash
tasknest init                          # 为当前目录建立 Project 标记（未标记时进入 Personal）
tasknest add "支持导出任务"            # 创建 Task（可只有标题）
tasknest comment 1 "第一版只支持导出 Excel"
tasknest start 1                       # 状态别名：start / block / done / cancel / reopen
tasknest split 1 "支持 PDF 导出"       # 拆分并建立 derived_from
tasknest done 1
tasknest list                          # 默认显示 todo / in_progress / blocked
tasknest show 1                        # 详情、来源与评论
```

数据统一存放在 `~/.tasknest/`（`tasknest.db` / `config.toml` / `project.toml`）；项目内 `.tasknest/project.toml` 只负责定位 Project。

## 目录结构

```text
src/cli/         CLI 命令层（解析、输出、退出码）
src/core/        业务用例层（唯一业务入口）
src/db/          schema / 迁移 / repository
src/config/      ~/.tasknest 路径、项目标记发现、TOML 读写
src/mcp/         MCP 占位（Future）
src/types/       共享类型
tests/           现有检查 / 集成与端到端验收（禁止单元测试）
docs/design/     实现设计文档
skills/tasknest/ 官方 Agent Skill
.memory/         AI 协作工作记忆（Daily / Summary）
```

## 文档导航

| 文档 | 内容 |
|------|------|
| [prd.md](./prd.md) | 产品需求（唯一权威源） |
| [docs/design/architecture.md](./docs/design/architecture.md) | 模块分层与工程约定 |
| [docs/design/database-schema.md](./docs/design/database-schema.md) | SQLite 落地与迁移策略 |
| [AGENTS.md](./AGENTS.md) | AI 开发强约束规则 |
| [skills/tasknest/SKILL.md](./skills/tasknest/SKILL.md) | Agent 使用规范（一期） |

## 开发约定

- 验收须通过 `bun run lint:check`、`bun run typecheck`、`bun test` 与 `bun run build`
- 不允许新增或扩写单元测试；功能通过真实 CLI、必要的集成 / 端到端验收验证，验证数据使用隔离目录
- 提交遵循 Conventional Commits，描述使用中文
- 任务结束须追加 `.memory/daily/{YYYY-MM-DD}.md`
- 其余强约束见 [AGENTS.md](./AGENTS.md)
