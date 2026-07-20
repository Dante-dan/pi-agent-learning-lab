# SDK 与 RPC：同一个 Agent，两种接入边界

假设同一个“修复 parser”任务要从后端队列或 IDE 发起。先根据部署边界选入口。

| 维度 | SDK (`AgentSession`) | RPC mode |
| --- | --- | --- |
| 进程 | 与宿主 Node 应用同进程 | Pi 子进程 |
| 类型 | 完整 TypeScript 类型与直接 state | JSON command/response/event |
| 语言 | Node.js / TypeScript | 任意能处理 stdin/stdout 的语言 |
| 隔离 | 无额外进程隔离 | 有进程故障边界，但仍继承 OS 用户权限 |
| 典型用途 | worker、测试、Node 服务、自定义工具 | IDE、Python/Go 服务、自定义前端桥接 |

## SDK

`createAgentSession()` 是单个 Session 的入口。`ModelRuntime.create()` 统一处理模型目录与认证；`SessionManager.inMemory()` 适合一次性 worker，`SessionManager.create(cwd)` 才会持久化 JSONL。

```ts
const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  cwd,
  modelRuntime,
  sessionManager: SessionManager.inMemory(cwd),
  tools: ["read", "grep", "find", "ls"],
});

await session.prompt("只读分析 parser 失败原因");
```

只暴露任务需要的工具。`tools` 是名称 allowlist；独立自定义工具用 `defineTool()` 定义后，通过 `customTools: [tool]` 传入。

## RPC

RPC 使用严格 LF (`\n`) 分隔的 JSONL：客户端写 command，Pi 返回一次相关 response，并继续异步发送 events。

```json
{"id":"job-42","type":"prompt","message":"修复 parser 测试"}
{"id":"job-42","type":"response","command":"prompt","success":true}
{"type":"agent_start"}
```

`success: true` 只表示 Prompt 已接受、排队或立即处理，不表示任务成功。运行中的后续失败通过事件/消息流报告。不要用会把 Unicode U+2028/U+2029 当换行符的通用 line reader；协议记录只按 LF 切分。

Node 客户端优先使用官方 `RpcClient`（见 `sdk/rpc-client.ts`），它已经实现 framing、关联 id 和 `waitForIdle()`。其他语言应实现同样的 JSONL 状态机。

## 会话替换

新建、恢复、fork 或导入会替换 active Session 时，应使用 `AgentSessionRuntime`。订阅绑定到具体 `AgentSession`；替换后要重新订阅并重新绑定 Extensions。不要缓存一个永久不变的 `runtime.session` 引用。

