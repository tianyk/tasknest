# SUMMARY

小型工作集；仅保留长期有效约束与高频踩坑（≤10 条 / ≤400 tokens），月度合并去重。

## Architecture Invariants

- 一期四表：projects / tasks / comments / memories；memories 主键为 INTEGER AUTOINCREMENT（PRD §32 例外），其余主键 UUIDv7，Task 另有项目内 #number。

## Current Pitfalls

- Bun 1.3.0 `bun test` 在零测试文件时退出码为 1，脚手架保留 `tests/smoke.test.ts` 保证 CI 通过。

## Stable Decisions

- 品牌：TaskNest = Task + Nest，A home for tasks and memory；项目/CLI/数据目录/marker 统一 tasknest 命名（`~/.tasknest`、`.tasknest/project.toml`、`tasknest.db`、`dist/tasknest`、`skills/tasknest`）。
- Memory 一期落地：七类枚举、LIKE 多关键词检索（不引入 FTS5）、硬删除、source_task 可追溯且来源 Task 删除后置空保留；V1 = Local Task + Memory。
- 单包工程；工具链版本区间固定为 TS ~5.9.3、ESLint ^9.39.4、typescript-eslint ^8.56.1，升级需单独确认。
- 运行时零依赖起步；MCP 属 Future（不在一期），接入时使用官方 `@modelcontextprotocol/sdk`。
