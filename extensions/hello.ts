import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Show a project-aware greeting",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`Hello from ${ctx.cwd}`, "info");
    },
  });
}

