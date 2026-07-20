# 渐进练习：用一个任务学完整运行时

所有练习都围绕同一个目标：让 Pi 修改 `examples/toy-parser/parser.ts`，并由系统独立判断是否完成。每题先写“输入、可用工具、失败路径、验收条件”，再写代码。

## 01 · Prompt lifecycle

记录普通按键、Enter、`input`、`before_agent_start` 和 `agent_start` 的边界。证明普通按键不会逐字调用模型。

**验收：** 日志能区分本地 editor event 与 Agent event，且不记录完整敏感 Prompt。

## 02 · Coding loop

只开放 `read`、`edit`、`bash`，捕获 turn、tool execution 与 message events，画出一次“读测试 → 改实现 → 跑测试”的 loop。

**验收：** 轨迹能解释为什么产生下一 turn，并正确处理同一批工具并行。

## 03 · Acceptance gate

参考 `sdk/acceptance-worker.ts`，在 `session.prompt()` 返回后运行独立 tests 与 typecheck。

**验收：** 模型声称成功但测试失败时，job 仍返回失败；每个任务重建验收状态。

## 04 · Custom tool

用 `defineTool()` + TypeBox 做一个只读 `inspect_parser` 工具，支持 `AbortSignal`、输出截断和结构化 `details`。

**验收：** schema 错误不进入业务函数；取消后不留下子进程。

## 05 · Policy 与 sandbox

先在 `tool_call` 阶段阻止越界路径，再把真正执行路由到容器。

**验收：** 非 UI 模式 fail closed；容器外文件、网络和凭证不可见。

## 06 · Session inspector

读取 JSONL entries，显示 active leaf、当前 path、旁支、label 和 compaction entry。

**验收：** 不把 append order 当成 active conversation；能处理 `getLeafId()` 为 `null`。

## 07 · RPC client

实现 prompt command、correlated response、event stream 和 `agent_settled` 等待。

**验收：** 只按 LF 分隔 JSONL；Prompt accepted 与 task succeeded 显示为两种状态。

## 08 · Headless worker

用 `AgentSession` 消费队列任务，为每个 job 设置 cwd、工具 allowlist、deadline 和 event sink。

**验收：** abort 能传到工具；retry 使用幂等 job key；任务结束后 `dispose()`。

## 09 · Provider gateway

在 `ModelRuntime` 外建立模型路由与成本策略，不把 Provider 差异泄露到业务工具。

**验收：** 认证失败、429、context overflow 与 provider timeout 有明确映射。

## 10 · Pi Package

把 extension、skill 和 prompt 组成可安装包，参考 `package/`。

**验收：** manifest 中每个路径真实存在；只信任审查过的包；核心 Pi 包按官方约定放 `peerDependencies: "*"`。

