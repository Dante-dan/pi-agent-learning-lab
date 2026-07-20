# Pi Agent 学习实验室

这不是一张 API 海报，而是一套从真实开发任务出发的 Pi 二次开发课程。

贯穿案例只有一个：你把“修复 `examples/toy-parser/parser.ts`，最后运行测试和类型检查”提交给 Pi。课程沿着这次输入，解释本地编辑、Prompt 预处理、模型与工具循环、Session 持久化，以及为什么 Agent 停止后仍要做独立验收。

> 本仓库锁定当前课程验证过的 `@earendil-works/pi-*` 0.80.10。不要把旧的 `@mariozechner/*` 示例混进同一个项目。

## 先运行，再拆概念

```bash
npm install
npm run dev
```

另开终端验证仓库里的可执行示例：

```bash
npm run test:toy
npm run typecheck:examples
```

如果本机已经配置 Pi 的模型凭证，可以继续运行：

```bash
node sdk/minimal-session.ts
node sdk/acceptance-worker.ts
node sdk/rpc-client.ts
```

## 建议阅读顺序

1. [系统全貌](docs/architecture.md)：先回答“一次修复请求如何穿过整个系统”。
2. [Prompt 与 Agent Loop](docs/prompt-lifecycle.md)：看清顺序、条件、循环和事件。
3. [SDK 与 RPC](docs/sdk-rpc.md)：决定同进程嵌入还是子进程协议。
4. [Tools 与安全](docs/tools-security.md)：区分应用策略、能力缩减和真正隔离。
5. [Session 与 Memory](docs/sessions-memory.md)：区分上下文、JSONL 会话和业务记忆。
6. [渐进练习](exercises/README.md)：用十个小实验验证理解。

## 仓库地图

| 路径 | 作用 |
| --- | --- |
| `extensions/` | 改造现有 Pi CLI：命令与工具调用前策略 |
| `sdk/` | 嵌入 `AgentSession`、独立验收、RPC 客户端 |
| `examples/toy-parser/` | 贯穿课程的可测试业务对象 |
| `package/` | 可安装 Pi Package 的最小真实结构 |
| `docs/` | 过程、概念边界和生产约束 |

## 官方资料

- [Pi repository](https://github.com/earendil-works/pi)
- [Agent core](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)
- [Coding Agent SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
- [Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)
- [RPC protocol](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)
- [Session format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md)

