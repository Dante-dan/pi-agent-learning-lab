# 一次 Prompt 如何形成 Agent Loop

继续使用 parser 场景。用户按下 Enter 后，先问“数据经过了什么”，再看 API 名字。

## 入口：本地输入不是 LLM 推理

1. TUI Editor 在本地接收按键并更新缓冲区；补全也可以是本地逻辑。
2. Enter 提交整行文本。
3. Pi 先尝试 extension command，再触发 `input` hook。
4. skill 和 prompt template 使用已发现的资源展开。
5. `AgentSession` 构造 `UserMessage`，触发 `before_agent_start`，随后进入 core Agent。

资源发现属于 Session 创建/资源 reload 生命周期，不要在每个 Prompt 中重新扫描整个项目。

SDK 最小入口见 `sdk/minimal-session.ts`：

```ts
await session.prompt("修复 parser 测试");
```

这一行隐藏的是调度，不是业务验收。Prompt 被接受后，它会等待本次运行（包括自动重试）结束；模型仍可能给出错误结论。

## 一个带工具调用的典型事件序列

```text
input                         Extension 输入预处理
before_agent_start            最后一次注入 context / system prompt
agent_start
turn_start                    第一次 Provider 请求
message_start / message_update / message_end
tool_execution_start          core 宣布工具进入 preflight
tool_call                     Extension 可修改参数或 block
tool_execution_update*        长任务可报告 partial result
tool_result                   Extension 可转换结果
tool_execution_end
toolResult message events     结果进入 Agent 消息序列
turn_end
turn_start                    第二次 Provider 请求，模型观察工具结果
...
agent_end
agent_settled                 没有 Session 级自动 continuation
```

不同事件来自不同层：`tool_execution_*` 是执行轨迹，`tool_call` / `tool_result` 是 Extension 拦截点，最终 `ToolResultMessage` 才是模型下一轮真正看到的消息。

## 顺序、条件、循环、并行

- 顺序：UserMessage → AssistantMessage → ToolResultMessage 的因果顺序不能颠倒。
- 条件：AssistantMessage 有 tool call 才执行工具；没有则 core loop 可以结束。
- 循环：工具结果追加到 context 后，模型再次决定“继续调用工具还是输出最终文本”。
- 并行：同一 AssistantMessage 中的多个工具默认可并行。preflight 按源码顺序发生，update 可能交错，end 按完成顺序发生；持久化的 ToolResult 仍按 assistant 源顺序写回。

不要用 JavaScript 的 `while(true)` 在 Extension 外再套一层无界循环。Agent core 已经负责 model/tool loop；业务侧只应设置预算、超时和确定性停止条件。

## 分支由谁判断

| 判断 | 应放的位置 | 例子 |
| --- | --- | --- |
| 确定性策略 | 普通代码 / `tool_call` hook | 禁止写 `.env`、超过额度拒绝 |
| 语义决策 | LLM 生成 tool call 或最终文本 | 先读测试还是先搜索符号 |
| 工具结果分支 | 工具返回 `isError` 与结构化 details | 测试失败后继续编辑 |
| 业务完成 | 独立 validator | tests 与 typecheck 全部通过 |

LLM 适合做开放语义判断，不适合替代权限检查或验收脚本。

