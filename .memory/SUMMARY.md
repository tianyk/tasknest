# SUMMARY

仅保留长期约束与高频踩坑（≤10 条 / ≤400 tokens）。

## Architecture Invariants

- PRD V1.3：一期三表 projects / tasks / comments，主键 UUIDv7；Task 编号在项目内递增。

## Current Pitfalls

- Bun 1.3.0 零测试时退出码为 1，保留 smoke.test.ts。
- AGENTS.md 仍有旧产品 Memory 定义；修改需用户单独授权，其他产品文档已同步 PRD V1.3。

## Stable Decisions

- 2026-09-24 用户确认从 PRD 删除产品 Memory；仓库 .memory 协作协议保留。
- 项目、CLI 与路径统一 tasknest 命名。
- Bun + TypeScript 单包、运行时零依赖；TS ~5.9.3、ESLint ^9.39.4、typescript-eslint ^8.56.1，升级需确认。
- MCP 属 Future，届时使用官方 @modelcontextprotocol/sdk。
