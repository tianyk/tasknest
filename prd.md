# TaskNest 一期产品需求文档（AI-first Task CLI）

版本：V1.4

---

## 1. 产品概述

TaskNest 是一款面向开发者和 AI Coding Agent 的本地项目任务管理工具。

它不是传统意义上的 Todo List，而是一个：

Local-first、CLI-first、AI-first 的轻量项目任务与上下文管理系统。

系统不仅记录：

- “接下来需要做什么？”

还需要记录：

- “任务现在进行到哪里？”
- “为什么要这么做？”
- “开发过程中又发现了什么？”
- “这个任务是从哪里拆出来的？”

系统主要面向：

- 人类开发者；
- Claude Code / Codex / OpenCode 等 AI Coding Agent；
- MCP Client；
- AI Skill。

一期提供：

- CLI
- Local SQLite
- Skill

一期不提供：

- Web UI
- Remote Server
- 多人协作
- 账号 / Token
- 云同步

最终程序以单个二进制分发：

```text
tasknest
```

用户无需额外安装 Node.js、Bun 等 Runtime。

---

## 2. 产品核心模型

产品长期模型可以概括为：

```text
          Project
             │
             ▼
            Task
             │
    ┌────────┼────────┐
    │        │        │
 Status   Context  derived_from
             │
          Activity
```

其中：

**Task**

代表：

当前需要完成的一项工作。

**Activity / Comment**

代表：

这个 Task 发生过什么。

产品的两个核心概念：

- Task = 要做什么
- Activity = 这次工作发生了什么

---

## 3. 一期核心目标

一期重点解决：

```text
Capture
   ↓
记录 Task
Manage
   ↓
管理 Task 状态
Enrich
   ↓
持续补充 Context
Execute
   ↓
人 / AI 执行 Task
Evolve
   ↓
范围扩大时拆分新 Task
Record
   ↓
记录开发过程与结果
```

---

## 4. 核心设计原则

### 4.1 Task 是唯一工作单元

系统只有一种 Task。

不存在：

```text
MainTask
SubTask
ChildTask
```

例如：

```text
#42 支持导出任务
```

开发过程中发现 Scope 太大：

```text
#51 支持 PDF 导出
#52 支持异步导出
```

三者都是普通 Task。

只是：

```text
#51 derived_from #42
#52 derived_from #42
```

展示层可以表现为：

```text
#42 支持导出任务
├── #51 支持 PDF 导出
└── #52 支持异步导出
```

但底层不存在特殊 SubTask 类型。

---

### 4.2 Task 可以从一句话开始

创建 Task 时不要求需求完整。

例如：

```text
#42 支持导出任务
```

之后不断补充：

- 第一版只支持导出 Excel。
- 导出字段跟随当前筛选条件。
- 移动端暂时不用支持。

因此：

Task 是逐渐成长的，而不是创建时必须一次性描述完整。

---

### 4.3 Context 属于 Task

Task 开发过程中产生的：

- 需求补充
- 分析
- 进度
- 临时问题
- 实现结果

都属于当前 Task Context。

这些内容应该进入 Task Activity / Comment。

---

### 4.4 AI 按需探索 Context

系统不主动给 AI 注入大量上下文。

例如：

```text
#51 支持 PDF 导出
derived_from:
#42 支持导出任务
```

AI 如果当前信息已经足够：

直接开发

如果不足：

```ts
get_task(42)
```

继续查询。

原则：

系统提供关系，AI 决定探索深度。

---

## 5. 一期范围

一期包含

- Project
- Project 自动发现
- Personal Project
- Task
- Task Status
- Description
- Comment / Activity
- Task Split
- derived_from
- CLI
- Skill
- SQLite
- 单二进制分发

一期明确不包含

- Web UI
- Kanban UI
- Remote Server
- 账号
- Token
- 权限
- 多人协作
- 云同步
- MCP
- 附件
- 标签
- 优先级
- 截止日期
- 通知
- 自定义 Workflow
- 自定义 Status
- 复杂 Task Relation
- depends_on
- blocks relation
- related_to
- duplicate
- Git Commit 自动关联

---

## 6. 本地数据目录

全局数据：

`~/.tasknest/`

结构：

```text
~/.tasknest/
├── tasknest.db
├── config.toml
└── project.toml
```

其中：

**tasknest.db**

保存：

- Projects
- Tasks
- Comments / Activities

项目目录中的 `.tasknest` 只负责定位 Project。

---

## 7. Project

Project 是 Task 的逻辑容器。

例如：

- `todo-app`
- `tasknest`
- `learning-machine`
- `Personal`

模型：

```ts
interface Project {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}
```

内部 ID 推荐：

`UUIDv7`

---

## 8. Project Marker

普通项目通过：

`.tasknest/project.toml`

绑定 Project。

例如：

```text
~/code/todo-app/
├── .git/
├── .tasknest/
│   └── project.toml
├── package.json
└── src/
```

内容：

```toml
id = "019xxxxxxxx"
name = "todo-app"
```

Task 数据不保存在这里。

---

## 9. Project 自动发现

假设：

```text
cwd:
~/code/todo-app/frontend/src/pages/
```

执行：

```bash
tasknest add "修复筛选后分页未重置"
```

系统依次寻找：

```text
~/code/todo-app/frontend/src/pages/.tasknest/project.toml
↓
~/code/todo-app/frontend/src/.tasknest/project.toml
↓
~/code/todo-app/frontend/.tasknest/project.toml
↓
~/code/todo-app/.tasknest/project.toml
```

找到第一个后停止。

如果一直没有：

`$HOME/.tasknest/project.toml`

最终进入：

`Personal`

即：

```text
cwd
 │
 ▼
.tasknest/project.toml
 │
 │ 没有
 ▼
parent
 │
 ▼
...
 │
 ▼
$HOME
 │
 ▼
Personal
```

原则：

最近 Project 优先。

发现边界与异常：

- 当前目录位于 `$HOME` 内时，向上检查至 `$HOME` 后停止；位于 `$HOME` 外时，检查至文件系统根目录后停止。
- 未找到项目标记时，使用 `~/.tasknest/project.toml` 对应的 Personal。
- 找到标记但 TOML 无效、缺少有效 ID 或无法读取时，报告错误，不跳过该标记继续寻找其他 Project。
- 标记引用的 Project 在数据库中不存在时，报告 Project 不存在，不自动改绑到 Personal。

---

## 10. Personal Project

系统始终存在：

`Personal`

对应：

`~/.tasknest/project.toml`

例如：

```bash
cd ~/Downloads
tasknest add "周末买硬盘"
```

没有其他 Project Marker 时：

→ Personal

因此不需要额外的：

`default_project`

概念。

---

## 11. 初始化

首次运行时：

`~/.tasknest/`

不存在，则自动创建：

```text
~/.tasknest/
├── tasknest.db
├── config.toml
└── project.toml
```

同时创建：

Personal Project。

项目初始化：

```bash
cd ~/code/foo
tasknest init
```

生成：

`foo/.tasknest/project.toml`

默认 Project Name：

`foo`

也支持：

```bash
tasknest init --name "Foo Project"
```

初始化规则：

- 全局初始化可重复执行；已有数据必须保留，同一个全局数据目录只初始化一个 Personal。
- `init` 针对当前目录建立标记；当前目录已有有效标记时，返回已绑定的 Project，不重复创建。
- 已有标记时传入相同的 `--name` 可重复执行；传入不同名称报错，一期不通过 `init` 重命名 Project。
- 当前目录没有标记时，显式 `init` 可以创建独立项目，即使父目录已有项目标记。
- 项目名称去除首尾空白后不能为空；标记或数据库异常时报告错误，不覆盖已有标记或数据库。
- 在 `$HOME` 执行 `init` 时，使用该目录已有的 Personal 标记，不能覆盖为普通 Project。

---

## 12. Task

模型：

```ts
interface Task {
  id: string
  number: number
  projectId: string
  title: string
  description?: string
  status: TaskStatus
  derivedFromTaskId?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}
```

---

## 13. Task Identifier

内部：

`UUIDv7`

人类 / AI：

`#42`

Number 在 Project 内递增。

- 从 1 开始；成功创建过的编号不复用，即使对应 Task 已被删除。
- 删除当前最大编号后，新 Task 仍使用更大的编号；例如删除 #3 后，下一个编号为 #4。
- 同一 Project 的多个 CLI 进程并发创建 Task 时，编号必须唯一。
- 创建失败并回滚的编号可以再次使用；不承诺编号始终连续。

约束：

`UNIQUE(project_id, number)`

当前 Project：

```bash
tasknest show 42
```

未来可以支持：

`todo-app#42`

跨 Project Reference。

---

## 14. Task Status

一期固定五个：

- todo
- in_progress
- blocked
- done
- canceled

含义：

| Status | 含义 |
| --- | --- |
| todo | 尚未开始 |
| in_progress | 正在处理 |
| blocked | 当前无法继续 |
| done | 已完成 |
| canceled | 决定不再做 |

主要流程：

```text
TODO
 │
 ▼
IN_PROGRESS
 │
 ├────→ BLOCKED
 │          │
 │          └────→ IN_PROGRESS
 │
 ▼
DONE
```

任何未完成 Task 都可以：

→ CANCELED

完整状态转换规则：

| 当前状态 | 允许变更到的其他状态 |
| --- | --- |
| todo | in_progress / done / canceled |
| in_progress | todo / blocked / done / canceled |
| blocked | todo / in_progress / done / canceled |
| done | todo |
| canceled | todo |

- 新建 Task 固定为 `todo`；允许直接将已完成的待办标为 `done`。
- `reopen` 等价于将状态设置为 `todo`，遵循上表。
- `done` / `canceled` 如需继续处理，先回到 `todo`；禁止直接在两个结束状态之间切换。
- 设置为当前状态是幂等操作：返回成功，不修改时间字段，不产生重复活动。
- 不在表内的转换报领域错误，保留原状态。

时间字段规则：

- 实际进入 `done` 时，将 `completed_at` 设为本次变更时间。
- 处于其他状态时，`completed_at` 为空；重新打开时清空，取消时不写完成时间。
- 实际状态变化更新 `updated_at`；`created_at` 始终保留。

---

## 15. 为什么需要 Blocked / Canceled

**Blocked：**

```text
#42 支持导出任务
等待后端导出 API。
```

表示：

已经开始，但当前无法继续。

**Canceled：**

```text
#51 支持 PDF 导出
产品决定不再实现 PDF 导出。
```

不能标记：

`done`

因为这会让 AI 错误认为 PDF 导出已经实现。

应该：

`canceled`

---

## 16. 未来 Kanban

一期没有 Web。

但 Status 可以天然映射：

```text
TODO        IN PROGRESS        BLOCKED        DONE
────────────────────────────────────────────────
#12         #18                #21            #3
#13         #19                               #7
#14                                           #11
```

Canceled 默认进入 Archive。

一期不实现自定义 Workflow。

---

## 17. Description

Description 表示 Task 当前相对稳定的主体描述。

例如：

```text
#42 支持导出任务
任务列表增加导出能力。
第一期支持 Excel。
```

Description 可选。

Title 去除首尾空白后不能为空。Description 保留正文与换行；空字符串表示清空描述。

允许：

```bash
tasknest add "支持导出任务"
```

只创建 Title。

---

## 18. Task Activity / Comment

Task 在执行过程中会不断产生信息。

例如：

```text
User:
导出字段需要跟随当前筛选条件。
Agent Analysis:
当前 API 缺少导出接口。
Agent Progress:
前端按钮已经完成。
Agent Result:
功能完成，共修改 4 个文件。
```

这些内容属于：

Task Activity。

一期实现上可以继续使用：`comments` 表。

---

## 19. Activity 类型

预留：

- comment
- analysis
- progress
- result
- system

Author：

- user
- agent
- system

模型：

```ts
interface Comment {
  id: string
  taskId: string
  type: CommentType
  authorType: AuthorType
  author?: string
  content: string
  createdAt: Date
  updatedAt?: Date
}
```

一期 CLI：

```bash
tasknest comment 42 "等待后端 API"
```

默认：

```text
type = comment
authorType = user
```

Agent（一期通过 CLI）可以写：

- analysis
- progress
- result

CLI 通过 `--type` 指定活动类型，通过 `--author-type agent` 标记 Agent，通过可选的 `--author` 记录名称（见 §26）。

- `comment` / `analysis` / `progress` / `result` 均可显式写入，正文不能全为空白。
- `system` 类型与 `system` 作者仅作内部保留，一期不开放 CLI 参数，也不自动生成状态变更活动。
- 一期 Comment 仅新增和读取，不提供编辑命令；`updated_at` 创建时为空，并保持为空。

---

## 20. Task Activity 的边界

Activity 回答：

这个 Task 当时发生了什么？

例如：

```text
#42 修改了 TaskList.tsx。
修复了一个 TypeScript Error。
ExportButton 已经完成。
最终修改了 4 个文件。
```

这些属于：

Task Activity

---

## 21. Activity 记录规则

当前 Task 的分析、进度、临时问题与实现结果记录到 Activity。

典型分类：

| 信息 | 归属 |
| --- | --- |
| #42 修改了 4 个文件 | Activity |
| #42 已完成 | Activity |
| 临时 TypeScript Error | Activity |
| 当前 Task 暂不支持移动端 | Activity |
| 当前 Task 等待后端 API | Activity |

---

## 22. Task Split

开发过程中发现 Scope 过大：

```text
#42 支持导出任务
```

执行：

```bash
tasknest split 42 "支持 PDF 导出"
```

创建：

```text
#51 支持 PDF 导出
status:
todo
derived_from:
#42 支持导出任务
```

#51 是普通独立 Task。

因此：

```text
#42 done
#51 todo
```

完全合法。

拆分规则：

- 来源 Task 必须存在且属于当前 Project；来源可以处于任意状态。
- 新 Task 使用新编号、给定标题及可选描述，状态固定为 `todo`，`derived_from` 指向来源 Task。
- 不复制来源 Task 的描述和评论，不改变来源 Task 的状态。

---

## 23. derived_from

一期唯一 Task Relation：

`derived_from`

例如：

```text
#42 支持导出任务
├── #51 支持 PDF 导出
└── #52 支持异步导出
    └── #67 支持导出进度查询
```

数据库实际上：

```text
#51 → #42
#52 → #42
#67 → #52
```

一期不实现：

- parent
- child
- depends_on
- blocks
- related_to
- duplicate

未来需要时再引入：

`task_relations`

一期仅通过 `split` 在创建 Task 时建立 `derived_from`，不能通过 `edit` 修改关系。

删除来源 Task 后，派生 Task 保留，`derived_from` 清空；来源 Task 自身的评论随其删除。

---

## 24. CLI

### Project

```bash
tasknest init
tasknest project
tasknest project list
```

---

### Task

创建：

```bash
tasknest add "支持导出任务"
tasknest add "支持导出任务" --description "第一版支持 Excel"
```

列表：

```bash
tasknest list
```

详情：

```bash
tasknest show 42
```

修改：

```bash
tasknest edit 42 --title "支持 Excel 导出"
tasknest edit 42 --description "导出字段跟随筛选条件"
tasknest edit 42 --description ""
```

`edit` 至少提供 `--title` / `--description` 中一个参数；两者可同时提供。未提供的字段保持不变，无修改参数时报参数错误，一期不启动交互式编辑器。

删除：

```bash
tasknest delete 42
```

`delete` 显式执行硬删除，不再交互确认；任务不存在时报错。关联评论随任务删除，派生任务保留并清空来源关系。

### 参数、输出与退出码

- 所有命令支持非交互调用；任务编号为当前 Project 内的正整数。
- `--help` 显示帮助，`--version` 显示版本；二者均不初始化或修改项目数据。
- 未知命令、未知参数、重复参数、缺少必填值、无效枚举及空标题 / 空评论均报参数错误。
- `--title` / `--description` / `--author` 等字符串通过参数传入，支持经 shell 引号包裹的空格与换行；一期不增加交互输入或编辑器协议。
- 成功信息与查询结果写入 stdout，错误中文文案写入 stderr，不输出 stack trace；一期不支持 `--json`。
- `show` 返回当前 Task 的字段、可用的来源编号与标题，以及按创建时间排列的评论；不递归展开来源 Task。
- `project` 显示当前 Project；`project list` 包含 Personal，按创建时间升序、ID 升序稳定排序。

| 退出码 | 含义 |
| --- | --- |
| 0 | 成功，包括帮助、空列表、幂等操作 |
| 1 | 文件、数据库、锁等待超时等运行错误，或未分类的内部错误 |
| 2 | 命令与参数无效，包括 core 检出的输入值错误 |
| 3 | 指定的 Task 或 Project 不存在 |
| 4 | 状态转换、标记内容或已有项目绑定等业务规则不允许 |

---

## 25. Status CLI

开始：

```bash
tasknest start 42
```

阻塞：

```bash
tasknest block 42
```

完成：

```bash
tasknest done 42
```

取消：

```bash
tasknest cancel 42
```

重新打开：

```bash
tasknest reopen 42
```

通用：

```bash
tasknest status 42 in_progress
```

`start` / `block` / `done` / `cancel` / `reopen` 分别对应 `in_progress` / `blocked` / `done` / `canceled` / `todo`，与通用 `status` 命令共用 §14 的转换规则。

---

## 26. Context CLI

增加 Comment：

```bash
tasknest comment 42 "导出字段跟随当前筛选条件"
tasknest comment 42 "当前 API 缺少导出接口" --type analysis --author-type agent --author codex
```

- `--type`：`comment` / `analysis` / `progress` / `result`，默认 `comment`。
- `--author-type`：`user` / `agent`，默认 `user`。
- `--author`：可选作者名称；未提供时为空，显式提供时去除首尾空白后不能为空。
- 作者字段只用于记录来源，不代表账号或权限。

拆分：

```bash
tasknest split 42 "支持 PDF 导出"
tasknest split 42 "支持 PDF 导出" --description "单独实现 PDF 格式"
```

---

## 27. tasknest list

默认：

```bash
tasknest list
```

显示当前 Project 的：

- todo
- in_progress
- blocked

例如：

```text
#42 [todo]         支持导出任务
#43 [in_progress]  优化列表加载性能
#44 [blocked]      支持键盘快捷键
```

历史：

```bash
tasknest list --all
```

过滤：

```bash
tasknest list --status blocked
tasknest list --status done
```

`--status` 接受一个固定状态值，与 `--all` 互斥；无论使用哪种过滤方式，结果都按 Task 编号升序排列。

---

## 28. MCP（Future，不在一期）

启动（未来）：

```bash
tasknest mcp
```

计划使用：

`stdio MCP Server`

建议 Tools：

- list_projects
- create_task
- get_task
- list_tasks
- update_task
- add_comment

不提供大量：

```text
start_task
done_task
block_task
create_subtask
...
```

这些行为通过通用 Tool 完成。

---

## 29. MCP Project Resolution（Future）

默认根据 MCP Process CWD：

```text
cwd
 ↓
寻找 .tasknest/project.toml
 ↓
Project
```

因此：

```ts
create_task({
  title: "支持导出任务"
})
```

通常不需要 Project 参数。

跨 Project 时才显式指定。

---

## 30. MCP get_task（Future）

例如：

```json
{
  "number": 51,
  "title": "支持 PDF 导出",
  "description": "...",
  "status": "todo",
  "project": {
    "name": "todo-app"
  },
  "derived_from": {
    "number": 42,
    "title": "支持导出任务"
  },
  "comments": []
}
```

不要自动返回：

```text
#42 全部内容
#42 的来源
#42 的全部 Comment
...
```

AI 如果需要：

```ts
get_task(42)
```

自己继续探索。

---

## 31. Skill

官方 Skill 指导 Agent：

1. 默认使用当前目录 Project。
2. 不需要每次传 Project。
3. 用户提出未来工作时可以创建 Task。
4. Task 创建时不要求信息完整。
5. 新需求和约束通过 Activity 补充。
6. 开始处理时设置 in_progress。
7. 无法继续时设置 blocked，并说明原因。
8. 完成时设置 done。
9. 不再实现时使用 canceled，不能使用 done。
10. 重要分析 / Progress / Result 可以写入 Activity。
11. Scope 过大时创建新 Task + derived_from。
12. 派生 Task 不阻塞来源 Task。
13. 当前信息不足时可以读取 derived_from Task。
14. 不无条件遍历整个来源链。
15. Task Activity 记录本次工作。
16. 使用显式参数非交互编辑 Task；不调用交互式编辑器。
17. Agent 写活动时显式传入 `--author-type agent` 与对应 `--type`，可用 `--author` 标识名称。
18. 结束状态的 Task 需要继续执行时，先 `reopen`，再 `start`。

---

## 32. SQLite Schema

一期核心三张表。

### projects

- id
- name
- next_task_number
- created_at
- updated_at

`next_task_number` 是项目内下一个可分配任务编号，初始为 1，仅由 Task 创建流程推进；它是内部存储字段，不提供用户编辑入口。

---

### tasks

- id
- project_id
- number
- title
- description
- status
- derived_from_task_id
- created_at
- updated_at
- completed_at

约束：

`UNIQUE(project_id, number)`

索引：

```text
INDEX(project_id, status)
INDEX(derived_from_task_id)
```

---

### comments

- id
- task_id
- type
- author_type
- author
- content
- created_at
- updated_at

索引：

```text
INDEX(task_id, created_at)
```

---

## 33. 内部架构

```text
               CLI
                │
                ▼
          ┌───────────┐
          │ Task Core │
          └─────┬─────┘
                ▼
          Repository
                │
                ▼
             SQLite
```

（Future：MCP 等新入口接入时只能调用 Task Core，不得直连 Repository）

Core：

```text
createProject()
resolveProject()
createTask()
getTask()
listTasks()
updateTask()
updateTaskStatus()
deleteTask()
addComment()
splitTask()
```

CLI 调用这套 Core；未来 MCP 接入时复用同一套 Core。

---

## 34. 技术方案

一期：

```text
Bun
+
TypeScript
+
SQLite
```

MCP 延后到 Future（详见 §37）。

暂时不引入：

- React
- Web Framework
- Remote API
- Vector DB
- Embedding

最终编译：

```text
tasknest
```

Standalone executable。

---

## 35. 一期典型工作流程

初始化：

```bash
tasknest init
```

创建：

```bash
tasknest add "支持导出任务"
```

补充：

```bash
tasknest comment 1 "第一版只支持导出 Excel"
```

开始：

```bash
tasknest start 1
```

AI 分析：

当前 API 已经支持导出字段。

记录 Activity。

开发过程中发现导出 Scope 太大：

```bash
tasknest split 1 "支持 PDF 导出"
```

产生：

`#2 derived_from #1`

完成：

```bash
tasknest done 1
```

Task #1 最终留下：

需求 + 开发过程 + 分析 + 结果

---

## 36. 一期验收标准

一期必须完成：

**Project Discovery**

可以从任意子目录自动找到 Project。

**Personal**

无 Project 时自动进入 Personal。

**Task Capture**

Task 可以只有 Title。

**Task Number**

编号在 Project 内递增且成功创建后不复用；删除最大编号以及并发创建均满足此规则。

**Status**

完整支持：

- todo
- in_progress
- blocked
- done
- canceled

状态转换、幂等行为与 `completed_at` 按 §14 验收。

**Context**

Task 可以持续追加 Activity / Comment。

**Evolution**

Task 可以通过：

`derived_from`

产生新的独立 Task。

**AI**

AI 可以通过 CLI（配合 Skill）：

- create
- read
- list
- update
- comment

管理 Task。

编辑和活动写入支持 §24 / §26 的非交互参数；参数错误、业务错误与运行错误使用约定退出码。

**Context Exploration**

AI 可以沿：

`derived_from`

按需查询上游 Task。

**Distribution**

最终为单个二进制程序。

---

## 37. 最终产品演进路线

### V1 — Local Task（一期）

- Project
- Task
- Status
- Activity
- derived_from
- CLI
- Skill
- SQLite

核心解决：

AI 和人共同管理“现在要做什么以及做到哪里”，并通过 Activity 保留任务的分析、进度与结果。

---

### Future — Remote / Web / Collaboration

根据实际需求再考虑：

- Remote Server
- MCP Server / MCP Tools
- Web Kanban
- Team
- Sync
- Permissions
- Custom Workflow

不在一期提前实现。

---

## 38. 产品最终核心思想

产品围绕两个问题：

```text
Task
↓
现在要做什么？
Activity
↓
这次工作发生了什么？
```

Task 之间通过 derived_from 记录工作如何演化：

```text
Task
 │
 │ derived_from
 ▼
Task
```

产品模型：

```text
Project
   │
   └── Tasks
          │
          ├── Status
          ├── Context / Activity
          └── derived_from → Task
```

一期完成 Task 的创建、执行、上下文记录与拆分闭环。

---

## 39. 一期 Scope Freeze

一期最终只实现：

```text
Project Discovery
        ↓
      Task
        ↓
      TODO
        ↓
   IN PROGRESS
        ↓
    Activity
        ↓
 ┌──────┴──────┐
 │             │
BLOCKED      Split
 │             │
 │        derived_from
 │             │
 └──────┬──────┘
        ↓
 DONE / CANCELED
```

一期停止增加新的领域概念。

一期完成 Task 工作闭环。
