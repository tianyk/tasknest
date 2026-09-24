---
name: tasknest
description: 使用 tasknest CLI 管理当前项目 Task 的官方规范（MCP 为 Future 能力）。当用户提出未来要做的开发工作、需要查看/更新任务状态、记录开发过程，或需要沿 derived_from 探索任务上下文时使用。默认使用当前目录所属 Project，无需每次传 Project。
---

# tasknest Skill（一期）

> 命令已随一期实现落地；本文件固化 Agent 使用规范（来源 `prd.md` §31）。MCP 属 Future，不在一期。
> 权威需求：`prd.md` §24-§31；输出与退出码以 CLI 实际行为为准。

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
15. 使用 `edit --title` / `--description` 非交互修改任务；空描述表示清空，未传的字段保持不变。
16. Agent 写活动时显式传入 `--author-type agent` 与对应 `--type`，可用 `--author` 标识名称。
17. 已完成或取消的 Task 如需继续执行，先 `reopen` 回到 `todo`，再 `start`；状态转换以 `prd.md` §14 为准。
18. `delete` 会硬删除任务及其评论；保留工作记录但决定不再做时使用 `cancel`。

## 常用入口

```bash
tasknest init                            # 初始化当前目录 Project（可选 --name）
tasknest project                         # 显示当前 Project；project list 列出全部（含最近绑定目录）
tasknest add "支持导出任务"              # 创建 Task（可只有标题）
tasknest list                            # 当前 Project 的未完成 Task
tasknest show 42                         # 查看详情与 Activity
tasknest edit 42 --title "支持 Excel 导出" # 修改标题
tasknest edit 42 --description "只支持 Excel" # 修改描述
tasknest edit 42 --description ""        # 清空描述
tasknest comment 42 "第一版只支持导出 Excel" # 补充 Context
tasknest comment 42 "缺少导出接口" --type analysis --author-type agent --author codex
tasknest start 42                        # 开始
tasknest block 42                        # 阻塞
tasknest done 42                         # 完成
tasknest cancel 42                       # 不再实现（禁止用 done 表达）
tasknest reopen 42                       # 回到 todo
tasknest split 42 "支持 PDF 导出"        # 拆分并建立 derived_from
tasknest split 42 "支持 PDF 导出" --description "单独实现 PDF 格式"
```

MCP Tools 属 Future（规划：`list_projects` / `create_task` / `get_task` / `list_tasks` / `update_task` / `add_comment`）。

## 调用方式

- 一期统一使用 tasknest CLI（目标 Agent 均具备 shell 能力）
- 命令不要求交互输入；错误写入 stderr，退出码含义见 `prd.md` §24，不能只根据输出文字判断成功
- 成功输出示例：`已创建 #12 支持导出任务`；`list` 行格式为 `#编号 [状态] 标题`（状态列固定宽度，编号升序）
- 默认进入当前目录所属 Project；无标记时进入 Personal，无需显式传 Project
- 活动类型开放 `comment` / `analysis` / `progress` / `result`；作者类型开放 `user` / `agent`，`system` 不可由 CLI 指定
- `list --all` 与 `list --status` 互斥；无效参数应修正后再调用
- MCP 属 Future：接入后优先 MCP Tools，并与 CLI 复用同一 core

## 上下文探索原则

系统提供关系，AI 决定探索深度：

- `get_task` 默认只返回当前 Task 与其 `derived_from` 摘要，不自动展开上游全部内容
- 信息不足时再主动 `get_task(上游编号)`
- 不无条件整链遍历
