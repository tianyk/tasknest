# SUMMARY

仅保留长期约束与高频踩坑（≤10 条 / ≤400 tokens）。

## Architecture Invariants

- PRD V1.4：projects/tasks/comments 三表，UUIDv7；SQL 在 db，业务规则在 core。
- 编号用 projects.next_task_number，与插入共用 IMMEDIATE 事务，防止复用及并发重复。

## Current Pitfalls

- Bun 1.3.0 零测试退出码为 1；保留 smoke.test.ts。

## Stable Decisions

- 产品 Memory 已移除；保留仓库 .memory。
- 禁止新增或扩写单元测试；CLI 集成测试已按用户要求删除，使用静态检查、构建、现有检查及真实 CLI 手动验收。
- reopen 回 todo；completed_at 仅 done 非空；CLI 显式传参。
- Context 按需探索：提供关系与查询入口，由 AI 决定深度，不强制读来源或遍历关系链。
- Bun + TS 单包、运行时零依赖；TS ~5.9.3、ESLint ^9.39.4、typescript-eslint ^8.56.1，升级需确认。
- MCP 属 Future，使用官方 @modelcontextprotocol/sdk。
