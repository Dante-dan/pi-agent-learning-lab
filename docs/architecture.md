# Pi 二次开发：先看一次请求的全貌

先假设一个具体场景：`parser` 的测试失败了。你在 Pi 中输入：

> 修复 `examples/toy-parser/parser.ts`；只改必要代码，最后运行测试和类型检查。

## 从字符到验收

```text
键盘输入
  ↓ 本地 TUI Editor / autocomplete（普通按键不会逐字调用 LLM）
按下 Enter
  ↓ extension command / input hook / skill 与 prompt template 展开
AgentSession.prompt(UserMessage)
  ↓ before_agent_start + 当前 system prompt / active context
pi-agent-core
  ↓ Provider 流式返回 text / thinking / toolCall
Tools（read → edit → bash）
  ↓ ToolResult 回到 active context
下一次 Provider 调用 ←──────┐
  ↓ 无更多 toolCall         │ 形成 Agent Loop
agent_end                    │
  ↓ retry / compaction / follow-up?
agent_settled
  ↓ 独立的 acceptance runner
tests + typecheck → 业务完成或失败
```

普通字符首先只是编辑器状态。 stock Pi 不会为每次按键调用模型；真正进入 Agent 路径的是提交后的整行输入。资源发现通常发生在 `DefaultResourceLoader` 创建或 `/reload` 时，Prompt 阶段只展开已发现的 command、skill 和 template，并装配当次 system prompt。

## 四层核心构件

| 层 | 真实定义 | 在案例中的职责 | 边界 |
| --- | --- | --- | --- |
| `pi-ai` | Provider、Model、消息与流式事件的统一接口 | 把请求发给已选模型，归一 text/tool-call delta | 不决定业务何时完成 |
| `pi-agent-core` | `Agent`、消息状态、Provider ↔ Tool 循环 | 看到 tool call 就执行工具，再把结果送回模型 | 不负责 CLI 资源和会话文件 |
| `pi-coding-agent` | `AgentSession`、Extension、资源加载、工具、JSONL Session、CLI/RPC | 把输入、项目规则、模型、工具和持久化组装起来 | 不提供 OS 级沙箱 |
| `pi-tui` | 终端渲染、Editor 与交互组件 | 接收按键、展示流式消息和工具状态 | 不是 Agent runtime |

`pi-orchestrator` 目前是实验性包，API 不稳定，不应作为入门主干。当前 monorepo 也不再以 `pi-web-ui` 作为核心包；Web 产品应通过 SDK 或 RPC 构建自己的界面。

## Extension、SDK、RPC 怎么选

| 问题 | 首选 | 原因 |
| --- | --- | --- |
| 给现有 Pi 增加命令、工具、策略或 TUI | Extension | 复用 CLI、Session 和资源发现 |
| 把 Agent 嵌进 Node 服务、队列 worker 或测试 | SDK / `AgentSession` | 同进程、类型完整、直接订阅事件和状态 |
| Python/Go/IDE 要驱动独立 Pi 进程 | RPC | stdin/stdout JSONL，语言无关且有进程边界 |
| 团队共享 extension、skill、prompt、theme | Pi Package | 统一安装与资源清单 |
| 要改变底层 Agent 循环语义 | 最后才评估 fork | 长期跟进上游的维护成本最高 |

Extension、SDK 和 RPC 不是三套 Agent：它们是进入同一运行时的三种边界。`sdk/minimal-session.ts` 展示同进程入口，`sdk/rpc-client.ts` 展示子进程入口。

## 三种“完成”不能混为一谈

1. `agent_end`：一次 core run 发出了最后一个事件。
2. `agent_settled`：Session 不会因 retry、compaction retry 或 queued continuation 自动继续。
3. 业务验收：测试、类型检查、schema、审批和业务不变量通过。

前两项是运行时状态，不等于第三项。`sdk/acceptance-worker.ts` 故意把确定性验收放在 `await session.prompt(...)` 之后执行；它不通过解析模型自述来判断成功。

## 安全边界

Pi 默认继承启动进程的 filesystem、process、network 和 credential 权限。`tool_call` hook、工具 allowlist 与命令规则是重要的应用策略，但都在同一信任域中。高风险 Agent 还需要容器、micro-VM 或其他 OS 隔离。

下一步阅读 [Prompt 与 Agent Loop](prompt-lifecycle.md)，逐事件拆开上图。

