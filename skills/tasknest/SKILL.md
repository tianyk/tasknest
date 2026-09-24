---
name: tasknest
description: 使用 tasknest CLI 管理当前项目 Task 的官方规范（MCP 为 Future 能力）。当用户提出未来要做的开发工作、需要查看/更新任务状态、记录开发过程，或需要沿 derived_from 探索任务上下文时使用。默认使用当前目录所属 Project，无需每次传 Project。
---

# tasknest Skill（一期草案）

> 命令尚未实现；本文件先固化 Agent 使用规范（来源 `prd.md` §31），随一期功能落地同步更新。MCP 属 Future，不在一期。
> 权威需求：`prd.md` §24-§31。

## Agent 行为规则

1. 默认使用当前目录 Project，不需要每次传 Project。
2. 用户提出未来工作时可以创建 Task。
3. Task 创建时不要求信息完整。
4. 新需求和约束通过 Activity 补充。
5. 开始处理时设置 `in_progress`。
6. 无法继续时设置 `blocked`，并说明原因。
7. 完成时设置 `done`。
8. 不再实现时使用 `canceled`，不能使用 `done`。
9. 重要分析 / Progress / Result 可以写入 Activity。
10. Scope 过大时创建新 Task + `derived_from`。
11. 派生 Task 不阻塞来源 Task。
12. 当前信息不足时可以读取 `derived_from` Task。
13. 不无条件遍历整个来源链。
14. Task Activity 记录本次工作。

## 常用入口（规划中）

```bash
tasknest add "支持导出任务"              # 创建 Task（可只有标题）
tasknest list                            # 当前 Project 的未完成 Task
tasknest show 42                         # 查看详情与 Activity
tasknest comment 42 "第一版只支持导出 Excel" # 补充 Context
tasknest start 42                        # 开始
tasknest block 42                        # 阻塞
tasknest done 42                         # 完成
tasknest cancel 42                       # 不再实现（禁止用 done 表达）
tasknest split 42 "支持 PDF 导出"        # 拆分并建立 derived_from
```

MCP Tools 属 Future（规划：`list_projects` / `create_task` / `get_task` / `list_tasks` / `update_task` / `add_comment`）。

## 调用方式

- 一期统一使用 tasknest CLI（目标 Agent 均具备 shell 能力）
- MCP 属 Future：接入后优先 MCP Tools，并与 CLI 复用同一 core

## 上下文探索原则

系统提供关系，AI 决定探索深度：

- `get_task` 默认只返回当前 Task 与其 `derived_from` 摘要，不自动展开上游全部内容
- 信息不足时再主动 `get_task(上游编号)`
- 不无条件整链遍历
