import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

// ModelRuntime 统一处理 models.json、auth.json、环境变量和运行时凭证。
const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime,
  tools: ["read", "grep", "find", "ls"],
});

const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  // prompt() 在请求被接受后，会等待本次 Agent 运行（包括自动重试）结束。
  await session.prompt("阅读当前仓库，并用五句话说明它的结构");
} finally {
  unsubscribe();
  session.dispose();
}
