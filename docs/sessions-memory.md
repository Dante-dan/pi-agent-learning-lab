# Session、Context 与 Memory

“记住 parser 任务”至少可能指四件不同的事，不能都叫 memory。

| 层 | 数据 | 生命周期 | 是否自动给 LLM |
| --- | --- | --- | --- |
| Editor buffer | 尚未提交的字符 | 当前 TUI 编辑 | 否 |
| Active context | 当前分支上的消息与 system prompt | 当前 AgentSession / context window | 是 |
| Session JSONL | header、message、custom、compaction、label 等树形 entries | 文件持久化 | 只有 active path 经转换后进入 context |
| Business memory | 用户偏好、任务状态、知识库、审计事件 | 业务定义 | 必须显式检索和注入 |

## JSONL Session 不是聊天数组

Session 每行一个 JSON 对象。除 header 外，entry 用 `id` / `parentId` 形成树；active leaf 决定当前路径。fork/branch 不必复制整份历史。

```json
{"type":"session","version":3,"id":"..."}
{"type":"message","id":"a1","parentId":null,"message":{"role":"user","content":"修复 parser"}}
{"type":"message","id":"b2","parentId":"a1","message":{"role":"assistant","content":[{"type":"toolCall","name":"read"}]}}
```

真实字段以当前 `SessionManager` 类型为准，上例只展示树关系。不要把 provider 原始 wire payload、RPC command 和 Session entry 当成同一种 JSON schema。

## Compaction 是有损上下文工程

当 active context 接近模型窗口上限，Pi 可以生成 compaction summary，再从摘要后的路径继续。摘要帮助模型继续工作，但不能替代：

- 完整审计日志；
- 确定性任务状态；
- 业务数据库；
- 可重放的工具输入输出。

需要恢复的扩展状态可用 `pi.appendEntry()` 写 custom entry，并在 `session_start` 重建；纯 UI 数据不要无意注入 LLM。长期用户记忆应放在外部存储，经权限过滤后按需检索。

## 序列化边界

- Provider：各家 HTTP/stream wire format，经 `pi-ai` 归一为消息事件。
- Tool：TypeScript object 经 provider JSON schema 往返，再成为 ToolResultMessage。
- RPC：stdin/stdout 严格 LF JSONL。
- Session：磁盘上的版本化 JSONL tree。
- Telemetry：独立事件仓库，不要反向依赖 Session 文件作为分析数据库。

