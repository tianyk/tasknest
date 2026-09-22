# TaskNest 一期产品需求文档（AI-first Task CLI）

版本：V1.2

---

## 1. 产品概述

TaskNest（任务与项目记忆的栖息地，A home for tasks and memory）是一款面向开发者和 AI Coding Agent 的本地项目任务管理工具。

它不是传统意义上的 Todo List，而是一个：

Local-first、CLI-first、AI-first 的轻量项目任务与上下文管理系统。

系统不仅记录：

- “接下来需要做什么？”

还需要记录：

- “任务现在进行到哪里？”
- “为什么要这么做？”
- “开发过程中又发现了什么？”
- “这个任务是从哪里拆出来的？”
- “这次开发产生了哪些值得未来继续使用的知识？”

系统主要面向：

- 人类开发者；
- Claude Code / Codex / OpenCode 等 AI Coding Agent；
- MCP Client；
- AI Skill。

一期提供：

- CLI
- Local SQLite
- Skill
- Memory

一期不提供：

- Web UI
- Remote Server
- 多人协作
- 账号 / Token
- 云同步

Memory 属于一期核心模型，一期的数据设计与 AI 使用原则需要明确 Task Context 与长期 Memory 的边界。

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
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
        Task                      Memory
          │                         │
    ┌─────┼─────┐              长期项目知识
    │     │     │
 Status Context derived_from
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

**Memory**

代表：

从过去工作中产生，并且未来处理其他 Task 时仍值得知道的知识。

这是整个产品长期最重要的三个概念：

- Task = 要做什么
- Activity = 这次工作发生了什么
- Memory = 以后仍然应该知道什么

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

Remember
   ↓
沉淀长期项目 Memory
```

其中 Remember 只收录跨 Task 仍有价值的信息，不把 Task Activity 直接当作 Memory。

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

### 4.4 长期知识不属于 Task

如果一条信息：

即使当前 Task 已经结束，未来处理其他 Task 时仍可能影响 AI 的判断，

那么它应该成为：

**Memory**

而不是永久埋在某个 Task Comment 中。

---

### 4.5 AI 按需探索 Context

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
- Memory
- Memory Search
- source_task
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
- 语义搜索 / Embedding

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

---

## 20. Activity 与 Memory 的边界

这是长期设计中的重要原则。

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

Memory 回答：

未来处理其他 Task 时，有什么仍然值得知道？

例如：

```text
列表筛选状态统一由 useListQueryParams() 管理。
```

或者：

```text
项目所有 API 请求必须经过 requestClient。
```

或者：

```text
任务取消必须使用 canceled，
禁止用 done 代替。
```

这些属于：

Project Memory

---

## 21. Activity / Memory 判断规则

判断一条信息应该去哪：

如果未来处理另一个 Task 时，这条信息仍可能影响 AI 的决策，则应该成为 Memory。

否则：

Task Activity

典型分类：

| 信息 | 归属 |
| --- | --- |
| #42 修改了 4 个文件 | Activity |
| #42 已完成 | Activity |
| 临时 TypeScript Error | Activity |
| 当前 Task 暂不支持移动端 | Activity |
| 当前 Task 等待后端 API | Activity |
| 所有 API 必须使用 requestClient | Memory |
| 新页面统一使用 React Query | Memory |
| 某模块存在不能删除的兼容逻辑 | Memory |
| 为什么项目选择 SQLite | Memory |
| 某领域长期业务规则 | Memory |

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
tasknest edit 42
```

删除：

```bash
tasknest delete 42
```

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

---

## 26. Context CLI

增加 Comment：

```bash
tasknest comment 42 "导出字段跟随当前筛选条件"
```

拆分：

```bash
tasknest split 42 "支持 PDF 导出"
```

Memory 创建：

```bash
tasknest memory add "列表筛选状态统一由 useListQueryParams() 管理" --type convention --source 42
```

Memory 搜索：

```bash
tasknest memory search "列表筛选"
```

Memory 列表 / 详情：

```bash
tasknest memory list
tasknest memory show 17
```

Memory 修改 / 删除：

```bash
tasknest memory update 17 --content "..." --type constraint
tasknest memory delete 17
```

说明：

- `--type` 必填，固定七类：architecture / decision / convention / constraint / domain / preference / lesson
- `--source` 可选，指向产生该 Memory 的 Task

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
- search_memories
- add_memory
- update_memory
- delete_memory

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
16. 不把所有开发总结都视为长期知识。
17. 只有跨 Task 仍有价值的信息才进入 Memory。
18. 开始工作前信息不足时，可以搜索 Memory。
19. 写入 Memory 前先搜索是否已有同类；过时或错误的知识应修改或删除。
20. 写入 Memory 时尽量带上 source_task，保持可追溯。

---

## 32. SQLite Schema

一期核心四张表。

### projects

- id
- name
- created_at
- updated_at

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

### memories

- id
- project_id
- type
- content
- source_task_id
- created_by
- created_at
- updated_at

约束：

type 固定七类：architecture / decision / convention / constraint / domain / preference / lesson

索引：

```text
INDEX(project_id, type)
INDEX(source_task_id)
```

说明：

- `id` 使用 SQLite INTEGER 主键自增（AUTOINCREMENT，避免删除后复用）；Project / Task 主键仍为 UUIDv7
- `source_task_id` 可空；来源 Task 删除时置空，Memory 保留
- 一期搜索使用 LIKE 多关键词匹配，不引入 FTS5 / Embedding

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
createMemory()
getMemory()
listMemories()
searchMemories()
updateMemory()
deleteMemory()
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

MCP 延后到 Future（详见 §43）。

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

## 35. Project Memory

Memory 属于一期能力。

```text
Project
   │
   ├── Tasks
   │
   └── Memories
```

Memory 示例：

```text
#17
type:
architecture
content:
列表筛选状态统一由
useListQueryParams() 管理。
source_task:
#42 支持导出任务
created_by:
agent
```

建议模型：

```ts
interface Memory {
  id: number
  projectId: string
  type: MemoryType
  content: string
  sourceTaskId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

---

## 36. Memory 类型

一期固定七类：

- architecture
- decision
- convention
- constraint
- domain
- preference
- lesson

例如：

**architecture**

Server State 统一使用 React Query。

**decision**

项目使用 SQLite。

原因：

Local-first + 单二进制。

**convention**

API hooks 统一放在 `src/api/hooks`。

**constraint**

iPad WebView 必须兼容 iOS 16。

**domain**

状态流转必须通过 `updateTaskStatus`，禁止绕过 `core` 直接改库。

---

## 37. Memory 必须支持来源追溯

Memory 保留：

`source_task_id`

例如：

```text
Task #42
   │
   │ 产生长期知识
   ▼
Memory #17
```

以后 AI 看到 Memory：

```text
列表筛选状态统一由 useListQueryParams() 管理。
```

如果想了解原因：

```text
source:
#42 支持导出任务
```

可以：

```ts
get_task(42)
```

继续了解历史背景。

仍然遵循：

提供关系，而不是复制所有 Context。

---

## 38. Memory 不自动全部注入 AI

假设 Project 已有：

500 Memories

不能每次：

```ts
get_task(42)
```

都返回：

500 Memories

一期提供：

```bash
tasknest memory search
```

Agent 根据当前工作主动搜索。

例如：

```bash
tasknest memory search "列表筛选"
```

返回相关 Memory。

一期搜索实现：

- 使用 LIKE 多关键词匹配（限定当前 Project，按更新时间排序）
- 数据以中文为主、量级有限，不引入 FTS5

不需要引入：

- Embedding
- Vector Database
- RAG Infrastructure

真正需要语义搜索时再增加。

---

## 39. Memory 工具面

一期通过 CLI 提供：

```bash
tasknest memory add
tasknest memory search
tasknest memory update
tasknest memory delete
```

Future 的 MCP 复用同一组能力（search_memories / add_memory / update_memory / delete_memory）。

不要设计大量特殊 Memory Tool。

仍然坚持：

Simple Tools, Powerful Composition。

---

## 40. Task 与 Memory 的关系

```text
                   Project
                      │
          ┌───────────┴───────────┐
          │                       │
        Tasks                  Memories
          │                       │
     Activities               Long-term
          │                    Knowledge
          │                       ▲
          └────── produces ───────┘
```

可以理解成：

- Task = AI Working Memory / 工作现场
- Memory = AI Long-term Project Memory / 长期项目知识

Activity 记录工作现场；当信息跨 Task 仍有价值时，才沉淀为 Memory。

---

## 41. 一期典型工作流程

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

从工作过程中沉淀长期知识：

```bash
tasknest memory add "列表筛选状态统一由 useListQueryParams() 管理。" --type convention --source 1
```

这个 Memory 将继续服务：

```text
#20
#35
#71
...
```

其他 Task。

---

## 42. 一期验收标准

一期必须完成：

**Project Discovery**

可以从任意子目录自动找到 Project。

**Personal**

无 Project 时自动进入 Personal。

**Task Capture**

Task 可以只有 Title。

**Status**

完整支持：

- todo
- in_progress
- blocked
- done
- canceled

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

**Context Exploration**

AI 可以沿：

`derived_from`

按需查询上游 Task。

**Memory**

可以创建 / 编辑 / 删除 / 搜索 Memory。

**Memory Traceability**

Memory 可以追溯到 source_task，并可沿 source_task 继续查询。

**Memory Search**

AI 可以搜索 Memory，而不是一次性读取全部。

**Distribution**

最终为单个二进制程序。

---

## 43. 最终产品演进路线

### V1 — Local Task + Memory（一期）

- Project
- Task
- Status
- Activity
- derived_from
- Memory
- Memory Search
- source_task
- CLI
- Skill
- SQLite

核心解决：

AI 和人共同管理“现在要做什么以及做到哪里”，并把跨 Task 仍有价值的知识沉淀为长期项目记忆。

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
- Semantic Memory Search

不在一期提前实现。

---

## 44. 产品最终核心思想

整个产品最终可以概括成三个问题：

```text
Task
↓
现在要做什么？
Activity
↓
这次工作发生了什么？
Memory
↓
以后还应该记住什么？
```

以及两种重要关系：

```text
Task
 │
 │ derived_from
 ▼
Task
```

表示：

工作是如何演化出来的。

以及：

```text
Task
 │
 │ produces
 ▼
Memory
```

表示：

工作最终沉淀出了什么长期知识。

因此产品长期模型不是一个简单的 Todo List，而是：

```text
                     Project
                        │
          ┌─────────────┴─────────────┐
          │                           │
        Tasks                      Memories
          │                           │
          ├── Status              Knowledge
          │
          ├── Activity
          │
          └── derived_from → Task
```

一期同时实现 Tasks 与 Memories 两侧。

边界从第一天起就明确：Activity 记录工作现场，Memory 沉淀长期知识。

---

## 45. 一期 Scope Freeze

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
        ↓
     Memory
```

一期停止增加新的领域概念。

一期同时完成 Task 工作闭环与长期 Memory 沉淀。
