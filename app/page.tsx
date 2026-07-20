"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "extension" | "sdk";
type SectionKey = "roadmap" | "quickstart" | "architecture" | "extensions" | "tools" | "sessions" | "providers" | "playground" | "patterns" | "project";

const sections: Array<{ key: SectionKey; num: string; label: string; group: string; duration: string }> = [
  { key: "roadmap", num: "01", label: "学习路线", group: "怎么开始", duration: "5 MIN" },
  { key: "quickstart", num: "02", label: "安装与第一个扩展", group: "怎么开始", duration: "12 MIN" },
  { key: "architecture", num: "03", label: "Pi 系统架构", group: "核心概念", duration: "16 MIN" },
  { key: "extensions", num: "04", label: "Extension 生命周期", group: "核心概念", duration: "18 MIN" },
  { key: "tools", num: "05", label: "Tools 与安全边界", group: "二次开发", duration: "20 MIN" },
  { key: "sessions", num: "06", label: "Session 与事件流", group: "二次开发", duration: "18 MIN" },
  { key: "providers", num: "07", label: "模型与 Provider", group: "系统集成", duration: "14 MIN" },
  { key: "playground", num: "08", label: "Extension Playground", group: "动手练习", duration: "20 MIN" },
  { key: "patterns", num: "09", label: "业界架构模式", group: "系统设计", duration: "22 MIN" },
  { key: "project", num: "10", label: "公开学习项目", group: "系统设计", duration: "25 MIN" },
];

const snippets: Record<string, Record<Mode, string>> = {
  hello: {
    extension: `// .pi/extensions/hello.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Print a project-aware greeting",
    handler: async (_args, ctx) => {
      ctx.ui.notify(\`Hello from \${ctx.cwd}\`, "info");
    },
  });
}`,
    sdk: `import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});

await session.prompt("Summarize this repository");`,
  },
  lifecycle: {
    extension: `export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("acme", "policy loaded");
  });

  pi.on("before_agent_start", async (event) => ({
    systemPrompt: event.systemPrompt +
      "\\nFollow the repository security policy.",
  }));

  pi.on("session_shutdown", async () => {
    await closeConnections();
  });
}`,
    sdk: `const unsubscribe = session.subscribe((event) => {
  switch (event.type) {
    case "message_update":
      if (event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
      break;
    case "agent_end":
      console.log("\\nrun complete");
      break;
  }
});

await session.prompt("Inspect the current project");
unsubscribe();
session.dispose();`,
  },
  tool: {
    extension: `import { Type } from "typebox";

pi.registerTool({
  name: "lookup_ticket",
  label: "Lookup ticket",
  description: "Read a support ticket by ID",
  parameters: Type.Object({ id: Type.String() }),
  async execute(_callId, params, signal, onUpdate) {
    onUpdate?.({ content: [{ type: "text", text: "Loading…" }] });
    const ticket = await api.get(params.id, { signal });
    return {
      content: [{ type: "text", text: JSON.stringify(ticket) }],
      details: { ticketId: params.id },
    };
  },
});`,
    sdk: `import { Type } from "typebox";

const lookupTicket = {
  name: "lookup_ticket",
  label: "Lookup ticket",
  description: "Read a support ticket by ID",
  parameters: Type.Object({ id: Type.String() }),
  async execute(_callId, params, signal) {
    const ticket = await api.get(params.id, { signal });
    return {
      content: [{ type: "text", text: JSON.stringify(ticket) }],
      details: { ticketId: params.id },
    };
  },
};

const { session } = await createAgentSession({ tools: [lookupTicket] });`,
  },
  guard: {
    extension: `pi.on("tool_call", async (event, ctx) => {
  if (event.toolName !== "bash") return;

  const command = String(event.input.command ?? "");
  if (!looksDestructive(command)) return;

  if (!ctx.hasUI) {
    return { block: true, reason: "Approval requires interactive mode" };
  }

  const allowed = await ctx.ui.confirm("High-risk command", command);
  if (!allowed) return { block: true, reason: "Rejected by user" };
});`,
    sdk: `const policyTool = wrapTool(bashTool, {
  beforeExecute: async ({ input, mode }) => {
    if (!looksDestructive(input.command)) return;
    if (mode !== "interactive") {
      throw new Error("Approval requires an interactive client");
    }
    await approvalService.require({ action: "shell", input });
  },
});

const { session } = await createAgentSession({
  tools: [readTool, policyTool],
});`,
  },
  session: {
    extension: `pi.on("session_start", async (_event, ctx) => {
  const entries = ctx.sessionManager.getEntries();
  ctx.ui.setStatus("history", \`\${entries.length} entries\`);
});

pi.registerCommand("bookmark", {
  description: "Label the current session position",
  handler: async (label, ctx) => {
    ctx.sessionManager.setLabel(ctx.sessionManager.getLeafId(), label);
  },
});`,
    sdk: `const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});

console.log(session.sessionId, session.messages.length);
await session.prompt("Analyze the failing test");
await session.compact("Keep decisions and unresolved risks");

// Session replacement belongs to AgentSessionRuntime.
await session.navigateTree(targetEntryId, { summarize: true });`,
  },
  provider: {
    extension: `export default function (pi: ExtensionAPI) {
  pi.registerProvider("acme-gateway", {
    baseUrl: "https://llm.acme.internal/v1",
    api: "openai-completions",
    apiKey: process.env.ACME_LLM_TOKEN,
    models: [
      { id: "reasoning", name: "Acme Reasoning", contextWindow: 128000 },
    ],
  });
}`,
    sdk: `import { getModel } from "@earendil-works/pi-ai";

const model = getModel("openai", process.env.PI_MODEL_ID!);

const { session } = await createAgentSession({
  model,
  thinkingLevel: "medium",
  sessionManager: SessionManager.inMemory(),
});

await session.prompt("Review the proposed migration");`,
  },
  pattern: {
    extension: `// Policy gateway: observe → decide → allow/block
pi.on("tool_call", async (event, ctx) => {
  const decision = await policy.evaluate({
    tool: event.toolName,
    input: event.input,
    cwd: ctx.cwd,
  });

  audit.append({ event, decision });
  if (!decision.allow) {
    return { block: true, reason: decision.reason };
  }
});`,
    sdk: `// Headless worker: queue → AgentSession → event sink
for await (const job of queue.consume()) {
  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    tools: buildTenantTools(job.tenantId),
  });

  const unsubscribe = session.subscribe(eventSink(job.id));
  await session.prompt(job.prompt);
  unsubscribe();
  session.dispose();
}`,
  },
};

const packageRows = [
  ["pi-ai", "统一模型 API", "provider、模型发现、流式事件、token / cost"],
  ["pi-agent-core", "Agent runtime", "消息、工具循环、状态与事件"],
  ["pi-coding-agent", "完整产品与 SDK", "CLI、Session、Extension、资源加载"],
  ["pi-tui", "终端 UI", "自定义交互组件与差量渲染"],
  ["pi-web-ui", "Web components", "把 Agent 能力嵌入浏览器界面"],
];

const apiRows = [
  ["pi.on", "订阅生命周期和工具事件", "策略、审计、提示词注入"],
  ["registerTool", "注册模型可调用工具", "业务 API、搜索、审批、子 Agent"],
  ["registerCommand", "注册用户触发命令", "工作流入口、设置、诊断"],
  ["registerProvider", "接入自定义模型服务", "网关、OAuth、私有模型"],
  ["setActiveTools", "动态控制工具集合", "只读模式、阶段化能力"],
  ["ctx.ui", "TUI 通知与交互", "confirm、select、widget、status"],
  ["createAgentSession", "创建可编程会话", "嵌入应用、任务 worker、测试"],
  ["session.subscribe", "消费有序事件", "流式 UI、日志、可观测性"],
  ["SessionManager", "管理 JSONL 会话树", "恢复、分支、标签与压缩"],
  ["ResourceLoader", "加载扩展、技能和模板", "自定义发行版与沙箱"],
];

const patterns = [
  ["Thin extension", "事件监听 + 少量命令", "给现有 Pi 加规则和便捷操作"],
  ["Policy gateway", "tool_call 前置检查", "权限、审批、合规和审计"],
  ["Domain toolset", "一组共享连接的工具", "工单、CRM、数据平台"],
  ["Headless worker", "AgentSession + 队列", "自动化任务、CI、后台处理"],
  ["Custom shell", "RPC / SDK + 自定义 UI", "桌面端、Web、内部平台"],
  ["Multi-agent tool", "工具内创建子会话", "研究、并行评审、领域隔离"],
  ["Provider adapter", "统一内部网关", "私有模型、成本路由、OAuth"],
  ["Pi package", "扩展 + skills + prompts + themes", "团队级可分发能力包"],
  ["Session analytics", "订阅事件 + 离线 JSONL", "质量、成本、失败分析"],
];

function ModeSwitch({ mode, setMode, compact = false }: { mode: Mode; setMode: (mode: Mode) => void; compact?: boolean }) {
  return <div className={`mode-switch ${compact ? "compact" : ""}`} aria-label="全局开发模式">
    {(["extension", "sdk"] as Mode[]).map((item) => <button key={item} type="button" className={mode === item ? "active" : ""} aria-pressed={mode === item} onClick={() => setMode(item)}>{item === "extension" ? "Extension" : "SDK"}</button>)}
  </div>;
}

function CodeBlock({ name, mode, setMode, label }: { name: keyof typeof snippets; mode: Mode; setMode: (mode: Mode) => void; label: string }) {
  return <div className="code-block">
    <div className="code-head"><span>{label}</span><span className="file-name">{mode === "extension" ? ".pi/extensions/acme.ts" : "src/agent.ts"}</span></div>
    <pre><code>{snippets[name][mode]}</code></pre>
    <div className="code-foot"><span>GLOBAL SURFACE</span><ModeSwitch mode={mode} setMode={setMode} compact /></div>
  </div>;
}

function PiBlueprint({ active = 2 }: { active?: number }) {
  const nodes = ["USER", "SESSION", "AGENT", "TOOLS", "MODEL"];
  return <div className="blueprint" role="img" aria-label="用户输入经 Session 和 Agent，在 Tools 与 Model 之间循环">
    <div className="blueprint-head"><span>PI RUNTIME BLUEPRINT</span><span>EVENT LOOP · 01</span></div>
    <div className="graph-row">{nodes.map((node, index) => <div className="graph-piece" key={node}><div className={`graph-node ${active === index ? "active" : ""} ${index === 0 ? "round" : ""}`}>{node}</div>{index < nodes.length - 1 && <div className="graph-edge">→</div>}</div>)}</div>
    <div className="graph-notes"><span>prompt</span><span>events + state</span><span>tool calls</span></div>
  </div>;
}

function Header({ section }: { section: typeof sections[number] }) {
  const title: Record<SectionKey, string> = {
    roadmap: "从会用 Pi，到能改造 Pi",
    quickstart: "安装与第一个扩展",
    architecture: "先看清分层，再选择扩展点",
    extensions: "Extension 是 Pi 的事件与能力插件",
    tools: "Tools 是能力，也是安全边界",
    sessions: "Session 是可恢复的事件树",
    providers: "把模型差异隔离在 Provider 层",
    playground: "看一次 Extension 如何介入运行",
    patterns: "从个人扩展到生产系统",
    project: "把学习变成一个可安装的 Pi Package",
  };
  return <header className="lesson-head"><div><div className="lesson-index">LESSON {section.num}</div><h1>{title[section.key]}</h1><p className="subtitle">围绕当前维护的 @earendil-works/pi-* 生态，学习 Extension、AgentSession、Tools、Providers、JSONL Session 与可分发 Pi Package。</p></div><div className="duration">预计 {section.duration} · TS</div></header>;
}

function Roadmap() {
  return <><section className="intro-grid"><div className="prose"><h2>Pi 的一句话心智模型</h2><p><code>pi-ai</code> 统一模型，<code>pi-agent-core</code> 运行工具循环，<code>pi-coding-agent</code> 提供 Session、CLI 和 Extension。二次开发的关键不是 fork 整个项目，而是选对扩展表面。</p><p>给现有 CLI 增加工具、命令、策略和 UI，用 Extension；嵌入自己的产品或后台任务，用 SDK；需要团队分发时，再封装成 Pi Package。</p><div className="formula"><div><strong>EXTENSION</strong><span>改造现有 Pi</span></div><div><strong>SDK</strong><span>嵌入你的产品</span></div><div><strong>PACKAGE</strong><span>分发完整能力</span></div></div></div><PiBlueprint /></section>
    <section className="route-map"><div className="section-kicker">120 MIN · LEARNING ROUTE</div><h2>从扩展点到生产边界</h2><div className="route-steps">{sections.slice(1).map((item, index) => <div className="route-step" key={item.key}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.duration}</small></div>)}</div></section>
    <div className="callout"><strong>先不要 fork Pi</strong><span>Extension、SDK、Provider 和 Package 已覆盖大多数二次开发。只有需要改变核心事件语义、调度或 Session 格式时，才评估维护长期 fork 的成本。</span></div></>;
}

function Quickstart({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="install-grid"><div><span>01</span><h3>安装 CLI</h3><code>npm i -g --ignore-scripts @earendil-works/pi-coding-agent</code></div><div><span>02</span><h3>选择扩展面</h3><p>{mode === "extension" ? "把 .ts 文件放进 .pi/extensions/，项目可共享。" : "在 Node 项目里导入 coding-agent SDK。"}</p></div><div><span>03</span><h3>最小权限运行</h3><code>{mode === "extension" ? "pi --tools read,grep,find,ls" : "SessionManager.inMemory()"}</code></div></div>
    <div className="migration"><strong>包名迁移提醒</strong><span>旧教程里的 <code>@mariozechner/*</code> 已弃用。新项目使用 <code>@earendil-works/pi-*</code>，迁移时不要混装两套包。</span></div>
    <CodeBlock name="hello" mode={mode} setMode={setMode} label={mode === "extension" ? "最小 Extension" : "最小 AgentSession"} />
    <div className="source-row"><a href="https://github.com/earendil-works/pi/tree/main/packages/coding-agent" target="_blank" rel="noreferrer">Coding Agent 官方文档 ↗</a><a href="https://github.com/earendil-works/pi" target="_blank" rel="noreferrer">Pi monorepo ↗</a></div></>;
}

function Architecture() {
  return <><PiBlueprint active={2} /><h2 className="section-title">五层结构，不同的变化速度</h2><div className="package-table">{packageRows.map((row, index) => <div key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>@earendil-works/{row[0]}</strong><em>{row[1]}</em><small>{row[2]}</small></div>)}</div>
    <div className="compare-grid"><div><span className="section-kicker">Agent Loop</span><h3>模型 → 工具 → 模型</h3><p>核心运行时保持小而通用，以有序事件暴露文本、思考、工具调用与结果。</p></div><div><span className="section-kicker">AgentSession</span><h3>生命周期与上下文</h3><p>管理消息、模型、压缩、会话树、资源加载和流式状态。</p></div><div><span className="section-kicker">ExtensionAPI</span><h3>非侵入式改造</h3><p>订阅事件，注册工具、命令、Provider 和 UI，而不修改核心代码。</p></div></div>
    <div className="callout"><strong>设计原则</strong><span>业务能力进入工具；安全与合规进入 tool_call 前置策略；界面进入 Extension UI 或 RPC 客户端；长期历史交给 SessionManager。</span></div></>;
}

function Extensions({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const events = [["session_start", "加载会话后初始化资源"],["before_agent_start", "每轮调用前调整 system prompt / context"],["tool_call", "工具执行前检查，可阻止"],["tool_execution_start", "开始执行通知"],["tool_execution_end", "记录结果与错误"],["session_before_compact", "自定义压缩或取消"],["session_shutdown", "释放连接与句柄"]];
  return <><div className="event-flow">{events.map((row, index) => <div key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row[0]}</strong><small>{row[1]}</small></div>)}</div>
    <CodeBlock name="lifecycle" mode={mode} setMode={setMode} label="生命周期与事件订阅" />
    <div className="rules"><h2>Extension 的 5 条边界</h2><ol><li><strong>Factory 只做注册。</strong><span>重连接和重资源放 session_start，清理放 session_shutdown。</span></li><li><strong>事件处理保持快速。</strong><span>观察性日志不要阻塞 Agent；真正的 barrier 放 tool_call preflight。</span></li><li><strong>无 UI 模式要降级。</strong><span>Print、JSON 与部分 RPC 环境必须检查 ctx.hasUI。</span></li><li><strong>工具描述写给模型。</strong><span>名称、描述、schema 和 prompt guideline 必须具体。</span></li><li><strong>项目配置可提交。</strong><span>.pi/extensions、skills、prompts 与 settings 可以团队共享。</span></li></ol></div></>;
}

function Tools({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="tool-principles"><div><strong>Schema</strong><span>TypeBox 在执行前验证参数</span></div><div><strong>Signal</strong><span>支持取消和超时传播</span></div><div><strong>Updates</strong><span>长任务流式反馈进度</span></div><div><strong>Result</strong><span>content 给模型，details 给 UI</span></div></div>
    <CodeBlock name="tool" mode={mode} setMode={setMode} label="注册一个生产型工具" />
    <CodeBlock name="guard" mode={mode} setMode={setMode} label="高风险工具前置审批" />
    <div className="security-grid"><div><span>01</span><h3>默认拒绝</h3><p>非交互模式无法审批时，危险动作必须 fail closed。</p></div><div><span>02</span><h3>验证路径</h3><p>不要只检查字符串；解析真实路径并限制在授权根目录。</p></div><div><span>03</span><h3>隔离凭证</h3><p>工具在服务端读取密钥，不把 token 放进 prompt、结果或 Session。</p></div><div><span>04</span><h3>幂等写入</h3><p>重试、并发工具与恢复都可能让副作用重复发生。</p></div></div></>;
}

function Sessions({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="session-tree" role="img" aria-label="JSONL Session 通过 id 和 parentId 形成树"><div className="tree-node">header</div><span>→</span><div className="tree-node">user</div><span>→</span><div className="tree-node">assistant</div><span>↗</span><div className="tree-branches"><div className="tree-node active">current leaf</div><div className="tree-node">alternate branch</div></div></div>
    <div className="compare-grid"><div><span className="section-kicker">Storage</span><h3>JSONL 事件记录</h3><p>每行一个带 type 的对象；消息、模型变化、压缩和 Extension 数据都可进入历史。</p></div><div><span className="section-kicker">Branching</span><h3>id / parentId 会话树</h3><p>一次 Session 文件中保留多个分支，/tree 可以回到任意历史点继续。</p></div><div><span className="section-kicker">Compaction</span><h3>摘要不是删除历史</h3><p>上下文压缩是有损的，但完整事件仍保存在 JSONL，可重新构建其他分支。</p></div></div>
    <CodeBlock name="session" mode={mode} setMode={setMode} label="读取、压缩与导航 Session" />
    <div className="callout"><strong>RPC 数据边界</strong><span>Pi RPC 使用严格的 LF 分隔 JSONL。客户端按 <code>\n</code> 切分记录；不要让通用 line reader 把 JSON 字符串中的 Unicode 分隔符误判成新记录。</span></div></>;
}

function Providers({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="provider-map"><div><strong>API keys</strong><span>OpenAI · Anthropic · Gemini · Groq · gateways</span></div><div><strong>OAuth subscriptions</strong><span>OpenAI Codex · Claude · GitHub Copilot</span></div><div><strong>Custom providers</strong><span>OpenAI-compatible · proxy · private models</span></div></div>
    <CodeBlock name="provider" mode={mode} setMode={setMode} label="模型与自定义 Provider" />
    <div className="rules"><h2>Provider 层要隔离什么</h2><ol><li><strong>认证方式。</strong><span>API Key、OAuth 与内部短期凭证生命周期不同。</span></li><li><strong>模型能力。</strong><span>只注册支持 tool calling 的模型，并声明真实 context window。</span></li><li><strong>流式差异。</strong><span>文本、思考与 tool-call delta 可能交错到达。</span></li><li><strong>成本与路由。</strong><span>把选择策略放在 ModelRegistry / gateway，不散落业务工具。</span></li></ol></div></>;
}

function Playground({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const [codes, setCodes] = useState<Record<Mode, string>>({ ...snippets.guard });
  const [step, setStep] = useState(-1);
  const timers = useRef<number[]>([]);
  const trace = [["session_start","policy extension loaded"],["before_agent_start","system prompt amended"],["tool_call","bash request intercepted"],["ui.confirm","approval granted"],["tool_execution_end","result appended"],["agent_end","run complete"]];
  const reset = () => { timers.current.forEach(window.clearTimeout); timers.current = []; setStep(-1); setCodes({ ...snippets.guard }); };
  const run = () => { timers.current.forEach(window.clearTimeout); setStep(0); trace.slice(1).forEach((_, i) => timers.current.push(window.setTimeout(() => setStep(i + 1), (i + 1) * 480))); };
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  return <><div className="playground-note"><strong>安全模拟</strong><span>可编辑代码与事件轨迹都在浏览器本地运行；不会调用 shell、模型或真实凭证。</span></div><PiBlueprint active={step < 0 ? -1 : Math.min(4, Math.floor(step / 1.4))} />
    <div className="playground-shell"><div className="editor-pane"><div className="editor-toolbar"><span>{mode === "extension" ? "policy.ts" : "worker.ts"}</span><ModeSwitch mode={mode} setMode={setMode} compact /></div><textarea value={codes[mode]} onChange={(e) => setCodes({ ...codes, [mode]: e.target.value })} aria-label={`${mode} 示例代码`} spellCheck={false} /><div className="editor-actions"><button type="button" onClick={reset}>Reset</button><button type="button" className="run" onClick={run}>Run events</button></div></div>
      <div className="trace-pane"><div className="trace-title"><span>EVENT TRACE</span><span>{step < 0 ? "IDLE" : step === trace.length - 1 ? "DONE" : "RUNNING"}</span></div><div className="trace-list">{trace.map((row, index) => <div key={row[0]} className={`${index < step ? "done" : ""} ${index === step ? "active" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row[0]}</strong><small>{row[1]}</small></div>)}</div><div className="event-detail"><span>DECISION</span><pre>{step < 2 ? "waiting for tool call…" : step === 2 ? "requires approval" : step < 5 ? "allow: true" : "session committed"}</pre></div></div></div></>;
}

function Patterns({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="pattern-grid">{patterns.map((row, index) => <article key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><h3>{row[0]}</h3><p>{row[1]}</p><strong>{row[2]}</strong></article>)}</div><CodeBlock name="pattern" mode={mode} setMode={setMode} label={mode === "extension" ? "Policy gateway 模式" : "Headless worker 模式"} /><div className="callout"><strong>架构选择总则</strong><span>先 Extension，后 SDK；先组合，后 fork；交互能力与业务工具分离；所有高风险工具经过策略网关；Session 事件用于恢复，可观测数据进入独立分析系统。</span></div></>;
}

function Project() {
  const labs = [["01","hello-extension","命令、事件与项目加载"],["02","custom-tool","schema、取消与流式更新"],["03","policy-gateway","审批、审计与最小权限"],["04","session-inspector","JSONL、分支与压缩"],["05","headless-worker","AgentSession、事件 sink 与队列"],["06","pi-package","扩展、skill、prompt、theme 打包"]];
  return <><div className="repo-hero"><div><span className="section-kicker">PUBLIC LEARNING REPOSITORY</span><h2>pi-agent-learning-lab</h2><p>网站源码、Extension、SDK、练习、答案与生产检查表放在同一个公开仓库；所有示例都使用当前维护的 @earendil-works 包。</p></div><a href="https://github.com/Dante-dan/pi-agent-learning-lab" target="_blank" rel="noreferrer">打开 GitHub ↗</a></div>
    <div className="repo-tree"><pre>{`pi-agent-learning-lab/
├── extensions/      # 可直接加载的 Pi Extensions
├── sdk/             # AgentSession 嵌入示例
├── docs/            # 架构、事件、Session、Provider
├── exercises/       # 渐进练习
├── solutions/       # 评审标准
└── package/         # 可分发 Pi Package 模板`}</pre></div>
    <div className="lab-list">{labs.map((row) => <div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small></div>)}</div></>;
}

function ApiAtlas() {
  return <div className="table-wrap"><table><thead><tr><th>API</th><th>负责什么</th><th>典型场景</th></tr></thead><tbody>{apiRows.map(row => <tr key={row[0]}><td><code>{row[0]}</code></td><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div>;
}

function Content({ active, mode, setMode }: { active: SectionKey; mode: Mode; setMode: (mode: Mode) => void }) {
  switch (active) {
    case "roadmap": return <Roadmap />;
    case "quickstart": return <Quickstart mode={mode} setMode={setMode} />;
    case "architecture": return <Architecture />;
    case "extensions": return <Extensions mode={mode} setMode={setMode} />;
    case "tools": return <Tools mode={mode} setMode={setMode} />;
    case "sessions": return <Sessions mode={mode} setMode={setMode} />;
    case "providers": return <Providers mode={mode} setMode={setMode} />;
    case "playground": return <Playground mode={mode} setMode={setMode} />;
    case "patterns": return <Patterns mode={mode} setMode={setMode} />;
    case "project": return <><Project /><h2 className="section-title">常用 API 速查</h2><ApiAtlas /></>;
  }
}

export default function Home() {
  const [mode, setModeState] = useState<Mode>("extension");
  const [active, setActive] = useState<SectionKey>("roadmap");
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("pi-learning-mode");
    if (stored === "extension" || stored === "sdk") setModeState(stored);
    const hash = location.hash.slice(1) as SectionKey;
    if (sections.some(section => section.key === hash)) setActive(hash);
  }, []);
  const setMode = (next: Mode) => { setModeState(next); localStorage.setItem("pi-learning-mode", next); };
  const choose = (next: SectionKey) => { setActive(next); setNavOpen(false); history.replaceState(null, "", `#${next}`); scrollTo({ top: 0, behavior: "smooth" }); };
  const section = useMemo(() => sections.find(item => item.key === active)!, [active]);
  const groups = useMemo(() => Array.from(new Set(sections.map(item => item.group))), []);
  const currentIndex = sections.findIndex(item => item.key === active);
  return <div className="site-shell"><header className="topbar"><button className="mobile-menu" type="button" onClick={() => setNavOpen(!navOpen)} aria-label="课程导航" aria-expanded={navOpen}>☰</button><button className="brand" type="button" onClick={() => choose("roadmap")}><span className="brand-mark" /><span>Pi Agent 学习实验室</span></button><div className="crumbs">COURSE / <strong>{section.label}</strong></div><ModeSwitch mode={mode} setMode={setMode} /></header>
    <div className="shell"><aside className={`sidebar ${navOpen ? "open" : ""}`}><div className="side-label section-kicker">SECONDARY DEVELOPMENT · V1</div>{groups.map(group => <div className="module" key={group}><div className="module-title">{group}</div>{sections.filter(item => item.group === group).map(item => <button type="button" className={`nav-item ${active === item.key ? "active" : ""}`} key={item.key} onClick={() => choose(item.key)}><span>{item.num}</span><strong>{item.label}</strong><i className={sections.findIndex(s => s.key === item.key) < currentIndex ? "done" : ""} /></button>)}</div>)}</aside>
      <main className="main"><Header section={section} /><div className="lesson-body"><Content active={active} mode={mode} setMode={setMode} /></div><footer><span>依据 Pi 官方仓库整理 · 2026-07</span><a href="https://github.com/earendil-works/pi" target="_blank" rel="noreferrer">官方源码 ↗</a></footer></main>
      <aside className="context"><div className="context-head"><span className="section-kicker">COURSE PROGRESS</span><strong>{Math.round(((currentIndex + 1) / sections.length) * 100)}%</strong></div><div className="progress"><span style={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }} /></div><h4>本节聚焦</h4><ul><li>{section.label}</li><li>{mode === "extension" ? "改造现有 Pi CLI" : "嵌入 AgentSession"}</li><li>生产边界与反模式</li></ul><h4>学习原则</h4><blockquote>先选扩展面，再写代码；先缩小工具权限，再让模型调用。</blockquote><button type="button" onClick={() => currentIndex < sections.length - 1 && choose(sections[currentIndex + 1].key)} disabled={currentIndex === sections.length - 1}>下一节 →</button></aside>
    </div></div>;
}
