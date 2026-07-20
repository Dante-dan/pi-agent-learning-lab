import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the scenario-led Pi curriculum", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Pi Agent 学习实验室<\/title>/i);
  assert.match(html, /假设你刚接手一个项目，parser 测试失败了/);
  assert.match(html, /一次 Prompt 的旅程/);
  assert.match(html, /Agent Loop 与完成判定/);
  assert.match(html, /Tools 与真正的安全边界/);
  assert.match(html, /任务成功不是/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("examples and learning artifacts track the verified Pi API", async () => {
  const [rootPackageSource, minimalSession, architecture, lifecycle, security, memory] =
    await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../sdk/minimal-session.ts", import.meta.url), "utf8"),
      readFile(new URL("../docs/architecture.md", import.meta.url), "utf8"),
      readFile(new URL("../docs/prompt-lifecycle.md", import.meta.url), "utf8"),
      readFile(new URL("../docs/tools-security.md", import.meta.url), "utf8"),
      readFile(new URL("../docs/sessions-memory.md", import.meta.url), "utf8"),
    ]);

  const rootPackage = JSON.parse(rootPackageSource);
  assert.equal(rootPackage.engines.node, ">=22.19.0");
  for (const dependency of [
    "@earendil-works/pi-ai",
    "@earendil-works/pi-agent-core",
    "@earendil-works/pi-coding-agent",
  ]) {
    assert.equal(rootPackage.devDependencies[dependency], "0.80.10");
  }
  assert.equal(rootPackage.devDependencies.typebox, "1.1.38");

  assert.match(minimalSession, /ModelRuntime\.create\(\)/);
  assert.match(minimalSession, /SessionManager\.inMemory\(\)/);
  assert.doesNotMatch(minimalSession, /AuthStorage|ModelRegistry\.create/);

  assert.match(architecture, /普通按键不会逐字调用 LLM/);
  assert.match(architecture, /agent_end[\s\S]*agent_settled[\s\S]*业务验收/);
  assert.match(lifecycle, /顺序、条件、循环、并行/);
  assert.match(security, /不是安全沙箱/);
  assert.match(memory, /JSONL Session 不是聊天数组/);

  await Promise.all(
    [
      "../sdk/acceptance-worker.ts",
      "../sdk/rpc-client.ts",
      "../examples/toy-parser/parser.test.ts",
      "../package/extensions/parser-inspector.ts",
      "../package/skills/verify-code/SKILL.md",
      "../package/prompts/fix-parser.md",
    ].map((path) => access(new URL(path, import.meta.url))),
  );
});
