# Pi 二次开发架构

## 包分层

- `pi-ai`：统一多 Provider 模型 API、模型发现、流式事件与 token/cost。
- `pi-agent-core`：消息、工具循环、Agent state 与低层事件。
- `pi-coding-agent`：CLI、AgentSession、Extension、SessionManager 与资源加载。
- `pi-tui`：终端 UI 与自定义组件。
- `pi-web-ui`：面向浏览器的 AI 界面组件。

## 扩展面怎么选

| 目标 | 首选 |
| --- | --- |
| 给现有 Pi 增加工具、命令、策略或 TUI | Extension |
| 把 Agent 嵌入自己的 Node 应用或 worker | SDK / AgentSession |
| 提供非 Node 客户端或自定义前端 | RPC mode |
| 团队分发 extensions、skills、prompts、themes | Pi Package |
| 修改核心工具循环或 Session 语义 | 最后才考虑 fork |

## 系统边界

```text
Custom UI / CLI / Queue
        ↓
AgentSession / ExtensionAPI
        ↓ ordered events
Agent runtime ↔ Tools
        ↓
pi-ai / Provider / Model
        ↓
Session JSONL + external telemetry
```

业务动作放在工具，安全策略放在工具执行前，凭证由服务端读取，会话历史与分析数据分开保存。

