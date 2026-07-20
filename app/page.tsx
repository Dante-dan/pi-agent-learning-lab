"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "extension" | "sdk";
type SectionKey = "roadmap" | "requestflow" | "runtime" | "architecture" | "quickstart" | "extensions" | "tools" | "sessions" | "providers" | "playground" | "patterns" | "project";

const sections: Array<{ key: SectionKey; num: string; label: string; group: string; duration: string }> = [
  { key: "roadmap", num: "01", label: "先看系统全貌", group: "从全貌开始", duration: "8 MIN" },
  { key: "requestflow", num: "02", label: "一次 Prompt 的旅程", group: "从全貌开始", duration: "20 MIN" },
  { key: "runtime", num: "03", label: "Agent Loop 与完成判定", group: "从全貌开始", duration: "24 MIN" },
  { key: "architecture", num: "04", label: "逐层定义核心构件", group: "拆开每个零件", duration: "22 MIN" },
  { key: "quickstart", num: "05", label: "第一个完整扩展", group: "拆开每个零件", duration: "18 MIN" },
  { key: "extensions", num: "06", label: "Extension / SDK / RPC", group: "选择二开边界", duration: "22 MIN" },
  { key: "tools", num: "07", label: "Tools 与真正的安全边界", group: "选择二开边界", duration: "24 MIN" },
  { key: "sessions", num: "08", label: "Session、Context 与 Memory", group: "运行时与数据", duration: "22 MIN" },
  { key: "providers", num: "09", label: "Provider 与协议边界", group: "运行时与数据", duration: "18 MIN" },
  { key: "playground", num: "10", label: "Agent Loop Playground", group: "动手验证", duration: "20 MIN" },
  { key: "patterns", num: "11", label: "架构模式与取舍", group: "放进真实系统", duration: "25 MIN" },
  { key: "project", num: "12", label: "公开学习项目", group: "放进真实系统", duration: "25 MIN" },
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
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime,
});

await session.prompt("Summarize this repository");`,
  },
  input: {
    extension: `export default function (pi: ExtensionAPI) {
  // 只在用户提交整行后触发；普通按键仍由 TUI 本地处理。
  pi.on("input", async (event) => {
    if (event.text === "ping") return { action: "handled" };
    if (event.text.startsWith("?quick ")) {
      return {
        action: "transform",
        text: "Respond briefly: " + event.text.slice(7),
      };
    }
    return { action: "continue" };
  });

  pi.on("before_agent_start", async (event) => ({
    systemPrompt: event.systemPrompt + "\nRun the smallest relevant check.",
  }));
}`,
    sdk: `const { session } = await createAgentSession({
  cwd: process.cwd(),
  sessionManager: SessionManager.create(process.cwd()),
});

const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
  if (event.type === "tool_execution_end") {
    audit.write({ tool: event.toolName, isError: event.isError });
  }
});

// Enter / HTTP / queue consumer 最终都收敛为一次 prompt 调用。
await session.prompt("修复 parser 测试，并运行最小验证");
unsubscribe();`,
  },
  acceptance: {
    extension: `export default function (pi: ExtensionAPI) {
  pi.on("agent_settled", async (_event, ctx) => {
    // settled = Pi 不会自动继续；仍不等于业务验收通过。
    // 验收器独立运行固定命令，不猜测模型刚才运行了什么。
    const result = await acceptanceRunner.run({
      cwd: ctx.cwd,
      checks: ["test", "typecheck"],
    });

    audit.write({ type: "acceptance", result });
    if (ctx.hasUI) {
      ctx.ui.setStatus("acceptance", result.ok ? "passed" : "failed");
    }
  });
}`,
    sdk: `// prompt() resolve 只说明 Pi 已经 settled。
await session.prompt(job.prompt);

// 用应用拥有的确定性验收器重新执行固定检查。
const verification = await acceptanceRunner.run({
  cwd: job.workspace,
  checks: ["test", "typecheck"],
  timeoutMs: 120_000,
});

if (!verification.ok) {
  throw new Error("Agent loop ended, but acceptance criteria did not pass");
}`,
  },
  rpc: {
    extension: `pi.on("input", async (event, ctx) => {
  // 同一扩展可能运行在 interactive / rpc / extension 三种来源。
  if (event.source === "rpc" && requiresDialog(event.text)) {
    return { action: "handled" }; // RPC 没有可依赖的 TUI 对话框
  }
  if (!ctx.hasUI) return { action: "continue" };
});`,
    sdk: `const child = spawn("pi", ["--mode", "rpc", "--no-session"]);

child.stdin.write(JSON.stringify({
  id: "req-1",
  type: "prompt",
  message: "检查这个项目的类型错误",
}) + "\n");

// 严格按 LF 拆分 JSONL。response 只表示请求已接受；
// 真正的运行结果继续通过 agent / message / tool events 到达。
for await (const line of splitOnLfOnly(child.stdout)) {
  const event = JSON.parse(line);
  render(event);
}`,
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
    sdk: `import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const lookupTicket = defineTool({
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
});

const { session } = await createAgentSession({
  customTools: [lookupTicket],
  tools: ["read", "lookup_ticket"],
});`,
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
    sdk: `const sandboxBash = defineTool({
  name: "sandbox_bash",
  label: "Sandbox bash",
  description: "Run an allowlisted command inside the job sandbox",
  parameters: Type.Object({ command: Type.String() }),
  async execute(_id, { command }, signal) {
    // 强边界位于独立 container / micro-VM，不在 prompt 中。
    const result = await sandbox.exec(command, { signal, network: "none" });
    return { content: [{ type: "text", text: result.output }], details: result };
  },
});

const { session } = await createAgentSession({
  customTools: [sandboxBash],
  tools: ["read", "grep", "sandbox_bash"],
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
    const leaf = ctx.sessionManager.getLeafId();
    if (leaf) ctx.sessionManager.appendLabelChange(leaf, label);
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
      {
        id: "reasoning", name: "Acme Reasoning",
        reasoning: true, input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000, maxTokens: 16384,
      },
    ],
  });
}`,
    sdk: `import { getModel } from "@earendil-works/pi-ai";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";

const model = getModel("openai", process.env.PI_MODEL_ID!);
const modelRuntime = await ModelRuntime.create();

const { session } = await createAgentSession({
  model,
  modelRuntime,
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
  const customTools = buildTenantTools(job.tenantId);
  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    customTools,
    tools: customTools.map(tool => tool.name),
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
  ["pi-orchestrator", "实验性编排器", "正在演进的 orchestration CLI；API 尚不稳定"],
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

const agentEventTrace = [
  ["input", "整行文本进入 command / transform / expansion 流程"],
  ["before_agent_start", "本轮 system prompt 与 context 准备完成"],
  ["agent_start", "一次低层 Agent run 开始"],
  ["turn_start", "一次 LLM 调用与随后工具批次开始"],
  ["message_update", "Provider 流回文本、思考或 tool-call delta"],
  ["tool_execution_start", "工具参数已解析，进入 preflight"],
  ["tool_call", "Extension 可在执行前允许或 block"],
  ["tool_execution_update", "长工具报告 partial result"],
  ["tool_execution_end", "最终 result / error 已形成"],
  ["turn_end", "assistant 与 tool results 构成一轮"],
  ["agent_end", "当前低层 loop 结束，但 Pi 仍可能自动继续"],
  ["agent_settled", "没有 retry、compaction retry 或 follow-up 将自动继续"],
] as const;

const patterns = [
  ["Thin extension", "事件监听 + 少量命令", "改造现有 CLI，交付成本最低", "把全部业务服务塞进宿主进程"],
  ["Policy gateway", "tool_call 前置检查", "集中参数、审批、额度与审计", "把 in-process hook 当 sandbox"],
  ["Domain toolset", "一组共享领域工具", "让模型看到稳定、窄而清晰的能力", "一个万能 execute_sql 工具"],
  ["Headless worker", "AgentSession + queue", "把 Agent 纳入后台任务生命周期", "agent_end 就直接标记 job 成功"],
  ["Custom shell", "SDK / RPC + 自定义 UI", "分离输入输出界面与 Agent runtime", "RPC response.success 当最终结果"],
  ["Sandbox executor", "工具路由到容器/micro-VM", "用 OS 边界限制 filesystem/process/network", "只写命令黑名单"],
  ["Provider gateway", "统一内部模型网关", "认证、成本、审计、fallback 集中治理", "模型路由散落每个工具"],
  ["Pi package", "extension + skill + prompt + theme", "版本化分发团队能力", "未锁版本直接全局安装"],
  ["Session analytics", "事件 sink + 独立数据仓库", "运行恢复与分析查询各司其职", "直接把 JSONL 当团队报表库"],
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
  const nodes = ["INPUT", "SESSION", "MODEL", "TOOLS", "OUTPUT"];
  return <div className="blueprint" role="img" aria-label="输入经 Session 到模型，模型与工具循环后输出">
    <div className="blueprint-head"><span>PI RUNTIME BLUEPRINT</span><span>EVENT LOOP · 01</span></div>
    <div className="graph-row">{nodes.map((node, index) => <div className="graph-piece" key={node}><div className={`graph-node ${active === index ? "active" : ""} ${index === 0 ? "round" : ""}`}>{node}</div>{index < nodes.length - 1 && <div className="graph-edge">→</div>}</div>)}</div>
    <div className="graph-notes"><span>prompt + resources</span><span>MODEL ↔ TOOLS loop</span><span>events + session</span></div>
  </div>;
}

function Header({ section }: { section: typeof sections[number] }) {
  const title: Record<SectionKey, string> = {
    roadmap: "先看全貌：Pi 是怎样工作的",
    requestflow: "从第一个按键，到一次 Prompt 被接受",
    runtime: "Agent Loop：工具、分支、循环与完成判定",
    architecture: "逐层定义 Pi 的核心构件",
    quickstart: "第一个完整扩展：观察并约束一次任务",
    extensions: "Extension、SDK、RPC：三种二开边界",
    tools: "Tools 是能力；Sandbox 才是强安全边界",
    sessions: "Session、Working Context 与长期 Memory",
    providers: "Provider、流事件与 JSONL 协议",
    playground: "逐事件运行一次 Coding Agent 任务",
    patterns: "从个人扩展到生产 Agent 平台",
    project: "把理解固化成可安装的 Pi Package",
  };
  return <header className="lesson-head"><div><div className="lesson-index">LESSON {section.num}</div><h1>{title[section.key]}</h1><p className="subtitle">围绕当前维护的 @earendil-works/pi-* 生态，学习 Extension、AgentSession、Tools、Providers、JSONL Session 与可分发 Pi Package。</p></div><div className="duration">预计 {section.duration} · TS</div></header>;
}

function Roadmap() {
  return <><div className="case-opening"><div><span className="section-kicker">贯穿案例 · FIX THE PARSER</span><h2>假设你刚接手一个项目，parser 测试失败了</h2><p>你打开 Pi，输入：“修复 <code>src/parser.ts</code> 的失败测试；只改必要代码，最后运行测试和类型检查。”然后按下回车。</p></div><div className="case-contract"><span>任务成功不是“模型说完成”</span><strong>验收条件</strong><ul><li>读取了失败测试与相关实现</li><li>修改范围只包含必要文件</li><li>目标测试通过</li><li>TypeScript 类型检查通过</li></ul></div></div>
    <section className="intro-grid story-intro"><div className="prose"><h2>接下来究竟发生了什么？</h2><p>Pi 先接收整行文本并加载项目规则；模型理解任务后，可能先读文件，再搜索符号、编辑代码、运行测试。每个工具结果都会回到模型，模型据此决定下一步。</p><p>我们会沿着这一个任务，观察它在哪里顺序执行、在哪里条件分支、为什么形成循环，以及 Pi 停止后为什么还要独立验收。</p><div className="formula"><div><strong>你输入</strong><span>一个具体开发目标</span></div><div><strong>Pi 执行</strong><span>模型 ↔ 工具循环</span></div><div><strong>系统验收</strong><span>tests + typecheck</span></div></div></div><PiBlueprint /></section>
    <div className="system-layers"><div><strong>01 · Client</strong><span>TUI 输入、IDE、Web、队列消费者</span></div><div><strong>02 · Product runtime</strong><span>AgentSession、资源加载、Extension、SessionManager</span></div><div><strong>03 · Agent runtime</strong><span>messages、model、tools、事件与循环</span></div><div><strong>04 · Infrastructure</strong><span>Provider API、filesystem、shell、MCP、sandbox</span></div></div>
    <section className="route-map"><div className="section-kicker">TEXTBOOK ROUTE · 全貌 → 过程 → 定义 → 二开</div><h2>用一个“修复失败测试”的任务贯穿全站</h2><div className="route-steps">{sections.slice(1).map((item, index) => <div className="route-step" key={item.key}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.duration}</small></div>)}</div></section>
    <div className="callout"><strong>二开的默认顺序</strong><span>先 Extension，后 SDK，再 RPC；先组合，后 fork。只有确实需要改变核心 loop、事件语义或 Session 格式时，才承担长期维护 fork 的成本。</span></div></>;
}

function RequestFlow({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const steps = [
    ["01", "TUI buffer", "逐字符更新本地输入与补全候选", "尚未进入 Agent"],
    ["02", "Submit", "回车冻结整行；Extension command 先匹配", "raw text"],
    ["03", "input event", "continue / transform / handled", "可绕过 LLM"],
    ["04", "Expansion", "展开已发现的 skill / prompt template；组装本轮 system prompt", "resolved prompt"],
    ["05", "AgentSession", "追加 UserMessage、保存 Session、启动 Agent", "agent_start"],
    ["06", "pi-agent-core", "transformContext → convertToLlm → Provider", "LLM messages"],
    ["07", "Event stream", "文本增量、tool call、tool result、turn / agent events", "UI / logs"],
  ];
  return <>
    <div className="story-bridge"><span>CASE · STEP 01</span><strong>你正在输入“修复 parser 测试”</strong><p>先别急着谈 Agent。第一个问题是：你敲下的字符什么时候只是编辑器状态，什么时候才真正成为 Pi 要处理的任务？</p></div>
    <div className="fact-boundary"><strong>事实边界：字符输入 ≠ LLM 调用</strong><p>Pi 的公开扩展生命周期把 <code>input</code> 定义为“收到用户输入后”，并给出明确的提交处理顺序。普通按键、光标和候选过滤属于 TUI 层；提交整行后才进入命令检查、input hook、资源展开和 Agent processing。</p><p><code>DefaultResourceLoader</code> 通常在 Session 创建或显式 reload 时发现 extensions、skills、templates 与项目 context；每次 prompt 只展开已经发现的资源并组装本轮 system prompt，不会从磁盘重新扫描整个项目。</p></div>
    <div className="keystroke-grid"><article><span>KEY 1</span><h3>第一个字符</h3><p>本地 buffer 改变；若是 <code>/</code> 等前缀，TUI 可以从已加载命令/模板索引产生候选。</p><code>buffer = &quot;/&quot;</code></article><article><span>KEY 2…N</span><h3>继续输入</h3><p>候选按新 buffer 重新过滤。这个过程可以完全确定性地完成，不必让 LLM 猜后半句。</p><code>filter(resources, buffer)</code></article><article><span>ENTER</span><h3>提交整行</h3><p>文本变成一次 input；扩展可处理、改写或放行，然后 AgentSession 才创建 UserMessage。</p><code>session.prompt(text)</code></article></div>
    <div className="sequence-board"><div className="sequence-head"><span>PROMPT LIFECYCLE</span><span>一次输入逐层变成 Agent 事件</span></div>{steps.map(row => <div className="sequence-row" key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><b>{row[2]}</b><code>{row[3]}</code></div>)}</div>
    <CodeBlock name="input" mode={mode} setMode={setMode} label={mode === "extension" ? "input hook：处理 / 改写 / 放行" : "AgentSession：提交与订阅流事件"} />
    <div className="transport-grid"><div><strong>Interactive TUI</strong><span>同一进程；有 UI、键盘、widget 与确认框。</span></div><div><strong>SDK</strong><span>Node 同进程、强类型、直接访问 state；适合产品和 worker。</span></div><div><strong>RPC</strong><span>跨进程 JSONL；适合其他语言和进程隔离。</span></div></div>
  </>;
}

function Runtime({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <>
    <div className="story-bridge"><span>CASE · STEP 02</span><strong>模型决定先读取测试文件</strong><p>它返回一个 <code>read</code> tool call；Pi 执行后把文件内容作为 ToolResult 写回。模型看到新证据，接着搜索实现、编辑文件、运行测试——循环由此形成。</p></div>
    <div className="agent-loop"><div>USER MESSAGE</div><div>LLM TURN</div><div className="decision">tool calls?</div><div>TOOLS</div><div>FINAL TEXT</div><span>YES：参数校验 → preflight → 并行/顺序执行 → toolResult → 下一 turn ↺</span><b>NO：结束当前 loop；等待 settled</b></div>
    <h2 className="section-title">Loop 不是 while(true)，而是一串有序事件</h2>
    <div className="event-flow runtime-events">{agentEventTrace.map((row, index) => <div key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row[0]}</strong><small>{row[1]}</small></div>)}</div>
    <div className="compare-grid"><div><span className="section-kicker">顺序</span><h3>消息与单个 turn</h3><p>UserMessage → AssistantMessage → ToolResultMessage 有明确顺序。</p></div><div><span className="section-kicker">条件</span><h3>是否有 tool call</h3><p>没有就输出最终文本；有则校验、执行并进入下一 turn。</p></div><div><span className="section-kicker">并行 / 循环</span><h3>工具批次 + follow-up</h3><p>工具默认可并行执行；结果按源顺序持久化，然后模型再次观察。</p></div></div>
    <h2 className="section-title">“Agent 停了”与“任务完成了”不是同一个判断</h2>
    <CodeBlock name="acceptance" mode={mode} setMode={setMode} label="用测试结果建立业务验收层" />
    <div className="acceptance-grid"><div><strong>Loop completion</strong><span>模型没有更多工具调用；或工具批次全部请求 terminate；或运行被 abort/stop。</span></div><div><strong>Runtime settlement</strong><span>没有自动重试、自动压缩重试或 queued follow-up 将继续运行。</span></div><div><strong>Business acceptance</strong><span>测试、类型检查、输出 schema、审批和业务不变量真正通过。</span></div></div>
    <div className="warning"><strong>工程结论</strong><span><code>agent_end</code> 是控制流事件，不是验收证书。生产 worker 必须在 Agent loop 外再做确定性 validator，并给循环设置超时、预算、最大 turns 与取消信号。</span></div>
  </>;
}

function Quickstart({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="install-grid"><div><span>01</span><h3>安装 CLI</h3><code>npm i -g --ignore-scripts @earendil-works/pi-coding-agent</code></div><div><span>02</span><h3>选择扩展面</h3><p>{mode === "extension" ? "把 .ts 文件放进 .pi/extensions/，项目可共享。" : "在 Node 项目里导入 coding-agent SDK。"}</p></div><div><span>03</span><h3>最小权限运行</h3><code>{mode === "extension" ? "pi --tools read,grep,find,ls" : "SessionManager.inMemory()"}</code></div></div>
    <div className="migration"><strong>包名迁移提醒</strong><span>旧教程里的 <code>@mariozechner/*</code> 已弃用。新项目使用 <code>@earendil-works/pi-*</code>，迁移时不要混装两套包。</span></div>
    <CodeBlock name="hello" mode={mode} setMode={setMode} label={mode === "extension" ? "最小 Extension" : "最小 AgentSession"} />
    <div className="source-row"><a href="https://github.com/earendil-works/pi/tree/main/packages/coding-agent" target="_blank" rel="noreferrer">Coding Agent 官方文档 ↗</a><a href="https://github.com/earendil-works/pi" target="_blank" rel="noreferrer">Pi monorepo ↗</a></div></>;
}

function Architecture() {
  const concepts = [
    ["AgentState", "数据：messages、model、thinkingLevel、systemPrompt、tools 与流式/错误状态。", "边界：当前运行的 working state；不是持久 Session 文件。"],
    ["AgentMessage", "数据：user / assistant / toolResult 加应用自定义消息。", "边界：先 transformContext，再 convertToLlm；不是所有 UI 消息都发给模型。"],
    ["AgentSession", "业务：把 Agent、资源加载、模型选择、compaction、SessionManager 和事件流组装起来。", "边界：一次活动会话；session replacement 属于 AgentSessionRuntime。"],
    ["Tool", "数据：name、description、TypeBox schema、execute 与 result。", "边界：模型可调用的副作用能力；不同于用户主动执行的 Command。"],
    ["Extension", "业务：在宿主进程内订阅生命周期并注册 Tool、Command、Provider 与 UI。", "边界：插件，不是 OS sandbox，也不是独立服务。"],
    ["SessionManager", "数据：JSONL header + id/parentId entry tree。", "边界：历史、分支和恢复；不是模型当前可见的全部 context。"],
  ];
  return <><PiBlueprint active={2} /><h2 className="section-title">先看 package 分层，再看对象定义</h2><div className="package-table">{packageRows.map((row, index) => <div key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>@earendil-works/{row[0]}</strong><em>{row[1]}</em><small>{row[2]}</small></div>)}</div>
    <h2 className="section-title">核心概念的真实定义与边界</h2><div className="definition-grid">{concepts.map(row => <div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><small>{row[2]}</small></div>)}</div>
    <h2 className="section-title">最容易混淆的相邻概念</h2><div className="adjacent-table"><div><strong>Tool vs Command</strong><span>Tool 由模型选择并返回 toolResult；Command 由用户以 /command 触发，甚至可以完全绕过 LLM。</span></div><div><strong>Skill vs Tool</strong><span>Skill 提供可加载的指令/知识；Tool 提供可执行能力。一个告诉模型怎么做，一个真正产生副作用。</span></div><div><strong>Event vs State</strong><span>Event 是发生过什么的通知；State 是当前可读取事实。订阅 event 不代表它自动成为持久状态。</span></div><div><strong>Context vs Session</strong><span>Context 是本次 LLM 可见消息；Session 保存完整事件树。compaction 会缩小 context，但不会等价删除 JSONL 历史。</span></div><div><strong>Provider vs Model</strong><span>Provider 定义 API、认证与流协议；Model 是该 Provider 暴露的具体能力/成本/context 配置。</span></div><div><strong>Agent vs AgentSession</strong><span>Agent 驱动低层 loop；AgentSession 加上产品生命周期、资源、持久化和交互。</span></div></div>
    <div className="callout"><strong>定义带来的设计规则</strong><span>业务能力进入 Tool；用户快捷流程进入 Command；可复用方法进入 Skill；UI 只消费 Event；可恢复历史交给 SessionManager；真正隔离放在进程外 sandbox。</span></div></>;
}

function Extensions({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="surface-choice"><article><span>EXTENSION</span><h3>给现有 Pi 加能力</h3><p>与 CLI 同进程；拥有 ExtensionAPI、生命周期、TUI 和注册表。最快，但与宿主权限相同。</p><strong>.pi/extensions/*.ts</strong></article><article><span>SDK</span><h3>把 Pi 嵌进 Node 产品</h3><p>强类型、同进程、直接访问 AgentSession/State。适合 worker、桌面端和自定义服务。</p><strong>createAgentSession()</strong></article><article><span>RPC</span><h3>跨语言或进程隔离</h3><p>启动 pi 子进程，以严格 LF JSONL 发送 command、接收 response 和 event。</p><strong>pi --mode rpc</strong></article></div>
    <div className="decision-path"><span>只是增加命令/工具/策略/UI？ → Extension</span><span>Node 同进程、需要类型和直接 state？ → SDK</span><span>非 Node、需要独立进程或语言无关协议？ → RPC</span><span>核心 loop 语义都不够？ → 最后才评估 fork</span></div>
    <h2 className="section-title">Extension 生命周期：事件在哪个边界发生</h2><div className="event-flow runtime-events">{agentEventTrace.map((row, index) => <div key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row[0]}</strong><small>{row[1]}</small></div>)}</div>
    <CodeBlock name="lifecycle" mode={mode} setMode={setMode} label="生命周期与事件订阅" />
    <CodeBlock name="rpc" mode={mode} setMode={setMode} label={mode === "extension" ? "同一扩展在不同输入来源下的降级" : "RPC command / response / event 三类消息"} />
    <div className="rules"><h2>Extension 的 5 条边界</h2><ol><li><strong>Factory 只做注册。</strong><span>重连接和重资源放 session_start，清理放 session_shutdown。</span></li><li><strong>事件处理保持快速。</strong><span>观察性日志不要阻塞 Agent；真正的 barrier 放 tool_call preflight。</span></li><li><strong>无 UI 模式要降级。</strong><span>Print、JSON 与部分 RPC 环境必须检查 ctx.hasUI。</span></li><li><strong>工具描述写给模型。</strong><span>名称、描述、schema 和 prompt guideline 必须具体。</span></li><li><strong>项目配置可提交。</strong><span>.pi/extensions、skills、prompts 与 settings 可以团队共享。</span></li></ol></div></>;
}

function Tools({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="security-banner"><strong>Pi 官方安全边界</strong><span>Pi 本身不内置限制 filesystem、process、network 或 credential 的权限系统；默认拥有启动它的用户与进程权限。Extension 的 <code>tool_call</code> 检查是有价值的应用策略，但不能替代容器、micro-VM 或 OS sandbox。</span></div>
    <div className="tool-principles"><div><strong>Schema</strong><span>TypeBox 在执行前验证参数</span></div><div><strong>Signal</strong><span>支持取消和超时传播</span></div><div><strong>Updates</strong><span>长任务流式反馈进度</span></div><div><strong>Result</strong><span>content 给模型，details 给 UI</span></div></div>
    <CodeBlock name="tool" mode={mode} setMode={setMode} label="注册一个生产型工具" />
    <CodeBlock name="guard" mode={mode} setMode={setMode} label="应用策略层：高风险工具前置检查" />
    <div className="security-stack"><div><span>POLICY</span><strong>Extension / wrapper</strong><p>参数规则、审批、租户额度、审计。能防误操作，但仍在同一进程信任域。</p></div><div><span>CAPABILITY</span><strong>Tool allowlist</strong><p>只向模型暴露必要工具；减少攻击面，但不会收窄进程本身已有的 OS 权限。</p></div><div><span>ISOLATION</span><strong>Container / micro-VM</strong><p>文件、进程、网络和凭证强边界。高风险 coding agent 的真正安全层。</p></div></div>
    <div className="security-grid"><div><span>01</span><h3>非交互 fail closed</h3><p>RPC/print 无 UI 时不能假装已审批；拒绝或转外部审批服务。</p></div><div><span>02</span><h3>路径与命令归一化</h3><p>字符串黑名单不够；解析真实路径、shell 结构和授权根目录。</p></div><div><span>03</span><h3>凭证在隔离层注入</h3><p>不要把 token 放进 prompt、tool result 或 Session JSONL。</p></div><div><span>04</span><h3>副作用幂等</h3><p>重试、并行工具和 Session 恢复都可能重复写入。</p></div></div>
    <div className="source-row"><a href="https://github.com/earendil-works/pi#permissions--containerization" target="_blank" rel="noreferrer">官方 Permissions &amp; Containerization ↗</a></div></>;
}

function Sessions({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="session-tree" role="img" aria-label="JSONL Session 通过 id 和 parentId 形成树"><div className="tree-node">header</div><span>→</span><div className="tree-node">user</div><span>→</span><div className="tree-node">assistant</div><span>↗</span><div className="tree-branches"><div className="tree-node active">current leaf</div><div className="tree-node">alternate branch</div></div></div>
    <h2 className="section-title">先区分三种“记忆”</h2><div className="memory-grid"><div><strong>Working context</strong><span>下一次 LLM 调用实际看到的 Message[]。会经过 transformContext 与 convertToLlm，可被压缩/过滤。</span><small>生命周期：每个 model turn</small></div><div><strong>Agent state</strong><span>messages、model、tools、systemPrompt、streaming/error 等当前运行事实。</span><small>生命周期：活动 Agent / Session</small></div><div><strong>Session JSONL</strong><span>header 与 id/parentId entry tree，保存消息、模型变化、compaction、custom data。</span><small>生命周期：磁盘持久化</small></div><div><strong>Project resources</strong><span>AGENTS.md、skills、prompt templates、extensions 与 settings；启动/重载时发现。</span><small>生命周期：跨 Session 项目知识</small></div></div>
    <div className="compare-grid"><div><span className="section-kicker">Serialization</span><h3>JSONL 事件记录</h3><p>每行一个带 type 的 JSON object；它是 append-friendly 的持久格式，不是一个巨大 JSON array。</p></div><div><span className="section-kicker">Branching</span><h3>id / parentId 会话树</h3><p>同一文件保存多个分支；当前 leaf 决定构建哪条上下文路径。</p></div><div><span className="section-kicker">Compaction</span><h3>摘要改变 Context，不抹掉历史</h3><p>模型看到压缩摘要，但原始 entry 仍在 Session 树中，可从其他节点分支。</p></div></div>
    <CodeBlock name="session" mode={mode} setMode={setMode} label="读取、压缩与导航 Session" />
    <div className="callout"><strong>Session 不等于 Analytics DB</strong><span>JSONL 为恢复和分支服务。团队报表、检索、成本聚合与长期用户画像应订阅事件后进入独立存储，避免把 SessionManager 变成业务数据库。</span></div>
    <div className="source-row"><a href="https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md" target="_blank" rel="noreferrer">官方 Session file format ↗</a></div></>;
}

function Providers({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="provider-map"><div><strong>API keys</strong><span>OpenAI · Anthropic · Gemini · Groq · gateways</span></div><div><strong>OAuth subscriptions</strong><span>OpenAI Codex · Claude · GitHub Copilot</span></div><div><strong>Custom providers</strong><span>OpenAI-compatible · proxy · private models</span></div></div>
    <CodeBlock name="provider" mode={mode} setMode={setMode} label="模型与自定义 Provider" />
    <h2 className="section-title">同一任务会穿过三种不同的 JSON 边界</h2><div className="protocol-table"><div><strong>Provider wire</strong><span>不同厂商 HTTP/SSE payload</span><code>provider-specific JSON</code><small>由 pi-ai 归一化</small></div><div><strong>Agent events</strong><span>message/tool/turn/agent 有序事件</span><code>typed objects</code><small>供 UI、Extension、observer</small></div><div><strong>RPC framing</strong><span>command / response / event</span><code>LF-delimited JSONL</code><small>供跨进程客户端</small></div><div><strong>Session storage</strong><span>header + entry tree</span><code>versioned JSONL</code><small>供恢复、分支、compaction</small></div></div>
    <CodeBlock name="rpc" mode={mode} setMode={setMode} label="RPC：接受请求与完成任务是两件事" />
    <div className="rules"><h2>Provider 层要隔离什么</h2><ol><li><strong>认证方式。</strong><span>API Key、OAuth 与内部短期凭证生命周期不同。</span></li><li><strong>模型能力。</strong><span>Pi 的模型目录聚焦支持 tool calling 的模型，并声明真实 context window / max tokens。</span></li><li><strong>流式差异。</strong><span>文本、思考与 tool-call delta 可能交错到达；业务层消费归一事件。</span></li><li><strong>成本与路由。</strong><span>把选择策略放在 ModelRuntime / gateway，不散落到业务工具。</span></li></ol></div>
    <div className="callout"><strong>严格 JSONL framing</strong><span>RPC 只把 LF (<code>\n</code>) 当 record delimiter；response.success 仅表示 prompt 已接受/排队/处理，后续失败和完成仍通过 event stream 报告。</span></div></>;
}

function Playground({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  type Scenario = "success" | "blocked" | "retry";
  const [codes, setCodes] = useState<Record<Mode, string>>({ ...snippets.guard });
  const [step, setStep] = useState(-1);
  const [scenario, setScenario] = useState<Scenario>("success");
  const timers = useRef<number[]>([]);
  const trace = useMemo(() => {
    if (scenario === "blocked") {
      return agentEventTrace.map(row => {
        if (row[0] === "tool_call") return [row[0], "policy hook 拒绝危险 bash；工具主体没有运行"] as const;
        if (row[0] === "tool_execution_end") return [row[0], "blocked 结果以 isError 形式回到模型"] as const;
        if (row[0] === "agent_settled") return [row[0], "运行时静止，但业务验收失败"] as const;
        return row;
      });
    }
    if (scenario === "retry") {
      return [
        ...agentEventTrace.slice(0, 10).map(row => row[0] === "tool_execution_end" ? [row[0], "第一次测试失败；错误成为 ToolResult"] as const : row),
        ["turn_start", "模型观察失败结果，开始修复后的第二轮"] as const,
        ["message_update", "模型提出第二次 test tool call"] as const,
        ["tool_execution_start", "第二次测试进入执行"] as const,
        ["tool_call", "policy 允许测试命令"] as const,
        ["tool_execution_end", "第二次测试通过"] as const,
        ["turn_end", "成功结果写回消息历史"] as const,
        ["agent_end", "当前低层 loop 结束"] as const,
        ["agent_settled", "没有自动 continuation；等待独立验收"] as const,
      ];
    }
    return agentEventTrace;
  }, [scenario]);
  const reset = () => { timers.current.forEach(window.clearTimeout); timers.current = []; setStep(-1); setCodes({ ...snippets.guard }); };
  const chooseScenario = (next: Scenario) => { timers.current.forEach(window.clearTimeout); timers.current = []; setStep(-1); setScenario(next); };
  const run = () => { timers.current.forEach(window.clearTimeout); timers.current = []; setStep(0); trace.slice(1).forEach((_, i) => timers.current.push(window.setTimeout(() => setStep(i + 1), (i + 1) * 360))); };
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const currentEvent = step >= 0 ? trace[step]?.[0] : undefined;
  const activeNode = !currentEvent ? -1 : currentEvent === "input" ? 0 : currentEvent === "before_agent_start" || currentEvent === "agent_start" ? 1 : currentEvent === "turn_start" || currentEvent === "message_update" || currentEvent === "turn_end" ? 2 : currentEvent.startsWith("tool_") ? 3 : 4;
  const running = step >= 0 && step < trace.length - 1;
  const detail = step < 0
    ? "选择场景，然后播放事件"
    : scenario === "blocked"
      ? currentEvent === "tool_call" ? "block: destructive command" : currentEvent === "agent_settled" ? "settled ≠ accepted" : "policy preflight"
      : scenario === "retry"
        ? step < 10 ? "tests failed → observe result" : currentEvent === "agent_settled" ? "run deterministic acceptance" : "retry after tool error"
        : currentEvent === "tool_call" ? "allow: true" : currentEvent === "agent_settled" ? "run tests + typecheck again" : "normal tool loop";
  return <><div className="playground-note"><strong>事件模拟器，不是在线编译器</strong><span>编辑区用于对照代码；修改代码不会改变右侧轨迹，也不会执行 shell、模型或凭证。右侧轨迹只由下面选择的场景驱动。</span></div>
    <div className="scenario-switch" role="group" aria-label="选择 Agent Loop 场景">
      <button type="button" className={scenario === "success" ? "active" : ""} onClick={() => chooseScenario("success")}><strong>工具成功</strong><span>一次工具调用后 settled</span></button>
      <button type="button" className={scenario === "blocked" ? "active" : ""} onClick={() => chooseScenario("blocked")}><strong>策略拦截</strong><span>tool_call hook 拒绝执行</span></button>
      <button type="button" className={scenario === "retry" ? "active" : ""} onClick={() => chooseScenario("retry")}><strong>测试失败后重试</strong><span>ToolResult 驱动下一 turn</span></button>
    </div>
    <PiBlueprint active={activeNode} />
    <div className="playground-shell"><div className="editor-pane"><div className="editor-toolbar"><span>{mode === "extension" ? "policy.ts" : "worker.ts"}</span><ModeSwitch mode={mode} setMode={setMode} compact /></div><textarea value={codes[mode]} onChange={(e) => setCodes({ ...codes, [mode]: e.target.value })} aria-label={`${mode} 示例代码`} spellCheck={false} /><div className="editor-actions"><button type="button" onClick={reset}>Reset</button><button type="button" className="run" onClick={run} disabled={running}>{running ? "Running…" : "Run events"}</button></div></div>
      <div className="trace-pane"><div className="trace-title"><span>EVENT TRACE</span><span>{step < 0 ? "IDLE" : step === trace.length - 1 ? "DONE" : "RUNNING"}</span></div><div className="trace-list">{trace.map((row, index) => <div key={`${row[0]}-${index}`} className={`${index < step ? "done" : ""} ${index === step ? "active" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row[0]}</strong><small>{row[1]}</small></div>)}</div><div className="event-detail"><span>DECISION</span><pre>{detail}</pre></div></div></div></>;
}

function Patterns({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <><div className="pattern-grid">{patterns.map((row, index) => <article key={row[0]}><span>{String(index + 1).padStart(2, "0")}</span><h3>{row[0]}</h3><p>{row[1]}</p><strong>为什么：{row[2]}</strong><small>反模式：{row[3]}</small></article>)}</div><CodeBlock name="pattern" mode={mode} setMode={setMode} label={mode === "extension" ? "Policy gateway 模式" : "Headless worker 模式"} /><div className="system-layers"><div><strong>Client</strong><span>TUI / IDE / Web / queue，管理输入与渲染</span></div><div><strong>Application</strong><span>job、tenant、acceptance、timeout、budget</span></div><div><strong>Pi runtime</strong><span>AgentSession、Extension、Agent Loop、Session</span></div><div><strong>Isolation + Infra</strong><span>model gateway、sandbox、tools、storage、observability</span></div></div><div className="callout"><strong>架构选择总则</strong><span>先 Extension，后 SDK/RPC；先组合，后 fork；Agent settlement 与业务 acceptance 分离；策略 hook 与 OS isolation 分离；Session 恢复与分析仓库分离。</span></div></>;
}

function Project() {
  const labs = [["01","prompt-lifecycle","按键、input hook、资源展开与事件"],["02","coding-loop","model、tool、result、next turn"],["03","acceptance-gate","settled、测试验证、超时与预算"],["04","custom-tool","schema、取消、流式更新与截断"],["05","sandbox-executor","策略层与容器强边界"],["06","session-inspector","JSONL、分支、context 与 compaction"],["07","rpc-client","command、response、event 与 LF framing"],["08","headless-worker","AgentSession、queue 与 event sink"],["09","provider-gateway","ModelRuntime、认证、成本与路由"],["10","pi-package","extension、skill、prompt、theme 打包"]];
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
    case "requestflow": return <RequestFlow mode={mode} setMode={setMode} />;
    case "runtime": return <Runtime mode={mode} setMode={setMode} />;
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
    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem("pi-learning-mode");
      if (stored === "extension" || stored === "sdk") setModeState(stored);
      const hash = location.hash.slice(1) as SectionKey;
      if (sections.some(section => section.key === hash)) setActive(hash);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const setMode = (next: Mode) => { setModeState(next); localStorage.setItem("pi-learning-mode", next); };
  const choose = (next: SectionKey) => { setActive(next); setNavOpen(false); history.replaceState(null, "", `#${next}`); scrollTo({ top: 0, behavior: "smooth" }); };
  const section = useMemo(() => sections.find(item => item.key === active)!, [active]);
  const groups = useMemo(() => Array.from(new Set(sections.map(item => item.group))), []);
  const currentIndex = sections.findIndex(item => item.key === active);
  return <div className="site-shell"><header className="topbar"><button className="mobile-menu" type="button" onClick={() => setNavOpen(!navOpen)} aria-label="课程导航" aria-expanded={navOpen}>☰</button><button className="brand" type="button" onClick={() => choose("roadmap")}><span className="brand-mark" /><span>Pi Agent 学习实验室</span></button><div className="crumbs">COURSE / <strong>{section.label}</strong></div><ModeSwitch mode={mode} setMode={setMode} /></header>
    <div className="shell"><aside className={`sidebar ${navOpen ? "open" : ""}`}><div className="side-label section-kicker">SECONDARY DEVELOPMENT · V1</div>{groups.map(group => <div className="module" key={group}><div className="module-title">{group}</div>{sections.filter(item => item.group === group).map(item => <button type="button" className={`nav-item ${active === item.key ? "active" : ""}`} key={item.key} onClick={() => choose(item.key)}><span>{item.num}</span><strong>{item.label}</strong><i className={sections.findIndex(s => s.key === item.key) < currentIndex ? "done" : ""} /></button>)}</div>)}</aside>
      <main className="main"><Header section={section} /><div className="lesson-body"><Content active={active} mode={mode} setMode={setMode} /></div><footer><span>依据 Pi v0.80 官方仓库与文档整理 · 2026-07</span><a href="https://github.com/earendil-works/pi" target="_blank" rel="noreferrer">官方源码 ↗</a></footer></main>
      <aside className="context"><div className="context-head"><span className="section-kicker">COURSE PROGRESS</span><strong>{Math.round(((currentIndex + 1) / sections.length) * 100)}%</strong></div><div className="progress"><span style={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }} /></div><h4>本节聚焦</h4><ul><li>{section.label}</li><li>{mode === "extension" ? "改造现有 Pi CLI" : "嵌入 AgentSession"}</li><li>生产边界与反模式</li></ul><h4>学习原则</h4><blockquote>先选扩展面，再写代码；先缩小工具权限，再让模型调用。</blockquote><button type="button" onClick={() => currentIndex < sections.length - 1 && choose(sections[currentIndex + 1].key)} disabled={currentIndex === sections.length - 1}>下一节 →</button></aside>
    </div></div>;
}
