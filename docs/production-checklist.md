# 生产检查表

- 使用当前 `@earendil-works/pi-*` 包，不混装弃用包名。
- Node.js 版本至少为 22.19.0，并在 CI 执行 `npm run typecheck:examples`。
- 默认工具集合最小化；只读任务不要暴露 write、edit、bash。
- `tool_call` 前置策略在无 UI 模式下 fail closed。
- 明确记录：策略 hook 不是 OS sandbox；高风险执行进入容器或 micro-VM。
- TypeBox schema 只验证结构；路径、权限和租户仍需业务校验。
- AbortSignal 传递到数据库、HTTP 和子进程。
- 工具输出避免泄露密钥、内部 token 或超长原始数据。
- 副作用写入具有 idempotency key。
- Session JSONL 只保存可恢复状态；分析数据进入独立事件仓库。
- Compaction 摘要不能替代完整审计记录。
- `agent_end`、`agent_settled` 与业务验收是三个独立状态。
- RPC 客户端严格按 LF 分隔 JSONL。
- Provider adapter 明确模型能力、context window、auth 生命周期和错误映射。
- Extension 在 session_shutdown 释放连接与临时资源。
