# TaskNest

**TaskNest = Task + Nest**：Task 是任务，Nest 是巢、聚集和沉淀的地方。

> TaskNest：任务与项目记忆的栖息地。
> A home for tasks and memory.

面向开发者与 AI Coding Agent 的本地项目任务管理工具。

Local-first、CLI-first、AI-first：记录“要做什么”（Task）、“这次工作发生了什么”（Activity），以及“以后仍然应该知道什么”（Memory）。最终以单个二进制 `tasknest` 分发，无需额外 Runtime。

> 当前状态：**工程脚手架阶段**，业务命令尚未实现。产品需求见 [prd.md](./prd.md)。

## 技术栈

- Bun + TypeScript（strict）
- bun:sqlite（本地 SQLite）
- bun build --compile（单二进制 `dist/tasknest`）

## 快速开始

```bash
bun install          # 安装开发依赖
bun run dev          # 运行占位入口（--watch）
bun run typecheck    # 类型检查
bun run lint:check   # ESLint 检查
bun test             # 运行测试
bun run build        # 编译单二进制 dist/tasknest
```

## 目录结构

```text
src/cli/         CLI 命令层（解析、输出、退出码）
src/core/        业务用例层（唯一业务入口）
src/db/          schema / 迁移 / repository
src/config/      ~/.tasknest 路径、项目标记发现、TOML 读写
src/mcp/         MCP 占位（Future）
src/types/       共享类型
tests/           bun test
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
| [skills/tasknest/SKILL.md](./skills/tasknest/SKILL.md) | Agent 使用规范（草案） |

## 开发约定

- 提交前必须通过 `bun run lint:check`、`bun run typecheck`、`bun test`
- 提交遵循 Conventional Commits，描述使用中文
- 任务结束须追加 `.memory/daily/{YYYY-MM-DD}.md`
- 其余强约束见 [AGENTS.md](./AGENTS.md)
