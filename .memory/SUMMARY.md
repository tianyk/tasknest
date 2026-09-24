# SUMMARY

仅保留长期约束与高频踩坑（≤10 条 / ≤400 tokens）。

## Architecture Invariants

- PRD V1.4：三表 projects / tasks / comments，主键 UUIDv7；SQL 仅在 db，业务规则在 core。
- Task 编号用 projects.next_task_number，与插入共用 IMMEDIATE 事务，防止删除后复用及并发重复。

## Current Pitfalls

- Bun 1.3.0 零测试时退出码为 1，保留 smoke.test.ts。

## Stable Decisions

- 2026-09-24 用户确认从 PRD 删除产品 Memory；仓库 .memory 协作协议保留。
- 用户禁止新增或扩写单元测试；使用静态检查、构建、现有检查及真实 CLI / 集成验收。
- reopen 回 todo，completed_at 仅 done 非空；CLI 使用显式参数，避免 Agent 交互输入。
- 项目、CLI 与路径统一 tasknest 命名。
- Bun + TypeScript 单包、运行时零依赖；TS ~5.9.3、ESLint ^9.39.4、typescript-eslint ^8.56.1，升级需确认。
- MCP 属 Future，届时使用官方 @modelcontextprotocol/sdk。
