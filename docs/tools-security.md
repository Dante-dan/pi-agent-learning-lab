# Tools、策略与真正的安全边界

在 parser 案例中，模型可能请求 `read`、`edit` 和 `bash`。Tool 是 Agent 能调用的能力，不是安全沙箱。

## 三层不要混淆

| 层 | 解决什么 | 不能解决什么 |
| --- | --- | --- |
| Tool allowlist | 减少向模型公开的能力 | 不能收窄宿主进程已有 OS 权限 |
| Extension / wrapper policy | 参数校验、审批、额度、审计、阻止误操作 | 仍在同一进程信任域，可被实现缺陷绕过 |
| Container / micro-VM / OS sandbox | 限制 filesystem、process、network、credential | 仍需要业务级授权和审计 |

Pi 没有内置 filesystem/process/network/credential 权限系统，默认拥有启动它的进程权限。`extensions/policy-gateway.ts` 是应用 guardrail 示例，不应被宣传为强隔离。

## Tool 的输入输出

自定义工具用 TypeBox 描述输入；Pi 在本地把 provider tool call 反序列化为对象并校验，再调用 `execute()`。工具返回的是结构化对象：

```ts
return {
  content: [{ type: "text", text: "3 tests passed" }],
  details: { passed: 3, failed: 0 },
};
```

- `content` 进入模型可见的 ToolResultMessage，应短、明确且不含凭证。
- `details` 给 UI/SDK 消费，可保留结构化诊断，但仍可能被 Session 或日志持久化。
- `isError` 应表达工具执行失败；业务验收失败可以用独立结果类型表达。
- `AbortSignal` 要传到 HTTP、数据库和子进程。

## 生产规则

1. command 与 args 分开执行，配置允许列表，不拼接未经信任的 shell 文本。
2. 归一化真实路径，并在授权根目录下校验；字符串前缀判断不够。
3. 非交互模式不能假装用户已经审批，应 fail closed 或调用外部审批服务。
4. 副作用工具带 idempotency key；重试和恢复可能重复触发。
5. 输出做长度上限、敏感字段擦除和审计关联。
6. 高风险工作负载在隔离环境中注入最小、短期凭证。

