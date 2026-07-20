import { RpcClient } from "@earendil-works/pi-coding-agent";

// RpcClient 启动 `pi --mode rpc`，并替你处理严格 LF 分隔的 JSONL 协议。
const client = new RpcClient({
  cwd: process.cwd(),
  args: ["--no-session"],
});

await client.start();
const unsubscribe = client.onEvent((event) => {
  if (
    event.type === "message_update" &&
    event.assistantMessageEvent.type === "text_delta"
  ) {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await client.prompt("只读分析当前仓库，并列出三个主要模块");
  await client.waitForIdle(120_000); // 等到 agent_settled，而不只是 agent_end。
} finally {
  unsubscribe();
  await client.stop();
}
