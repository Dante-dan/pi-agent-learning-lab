import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

const destructive = /(^|\s)(rm\s+-rf|git\s+reset\s+--hard|git\s+clean\s+-fd)(\s|$)/;

export default function policyGatewayExtension(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    const command = event.input.command;
    if (!destructive.test(command)) return;

    if (!ctx.hasUI) {
      return { block: true, reason: "High-risk commands require interactive approval" };
    }

    const allowed = await ctx.ui.confirm("High-risk command", command);
    if (!allowed) return { block: true, reason: "Rejected by user" };
  });
}
