import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function helloExtension(pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Show a project-aware greeting",
    handler: async (_args, ctx) => {
      const message = `Hello from ${ctx.cwd}`;
      if (ctx.hasUI) ctx.ui.notify(message, "info");
      else console.info(message);
    },
  });
}
