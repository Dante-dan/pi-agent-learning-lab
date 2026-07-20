import { spawn } from "node:child_process";

import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

type AcceptanceCheck = {
  name: string;
  command: string;
  args: string[];
};

type CheckResult = AcceptanceCheck & {
  ok: boolean;
  exitCode: number | null;
  output: string;
};

function runCheck(check: AcceptanceCheck, cwd: string): Promise<CheckResult> {
  return new Promise((resolve, reject) => {
    // command 与 args 分开传递，不经过 shell；业务代码还应使用命令 allowlist。
    const child = spawn(check.command, check.args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (exitCode) => {
      resolve({ ...check, ok: exitCode === 0, exitCode, output });
    });
  });
}

export const acceptanceRunner = {
  async run(cwd: string, checks: AcceptanceCheck[]) {
    const results: CheckResult[] = [];
    for (const check of checks) results.push(await runCheck(check, cwd));
    return { ok: results.every((result) => result.ok), results };
  },
};

const cwd = process.cwd();
const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  cwd,
  modelRuntime,
  sessionManager: SessionManager.inMemory(cwd),
  tools: ["read", "edit", "bash"],
});

try {
  await session.prompt(
    "检查 examples/toy-parser/parser.ts。修复或改进实现，但不要修改既有验收标准。",
  );

  // agent_settled 只说明 Pi 不会自动继续；业务完成必须独立验收。
  const verification = await acceptanceRunner.run(cwd, [
    {
      name: "toy parser tests",
      command: process.execPath,
      args: ["--test", "examples/toy-parser/parser.test.ts"],
    },
    {
      name: "example typecheck",
      command: "npm",
      args: ["run", "typecheck:examples"],
    },
  ]);

  for (const result of verification.results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}`);
    if (!result.ok) console.error(result.output);
  }
  if (!verification.ok) process.exitCode = 1;
} finally {
  session.dispose();
}
