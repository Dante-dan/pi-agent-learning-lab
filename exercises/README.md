# 渐进练习

1. **hello-extension**：注册 `/hello` 命令，并读取 `ctx.cwd`。
2. **custom-tool**：用 TypeBox 定义参数，支持取消和流式进度。
3. **policy-gateway**：在 `tool_call` 阶段阻止危险 shell；无 UI 模式默认拒绝。
4. **session-inspector**：读取 JSONL entry，显示 active path、分支和 compaction。
5. **headless-worker**：用 AgentSession 处理队列任务，并将事件发送到日志 sink。
6. **pi-package**：把 extension、skill、prompt 和 theme 组织成可安装包。

每题先写安全边界与失败策略，再写 happy path。

