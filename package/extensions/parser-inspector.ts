import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function parserInspector(pi: ExtensionAPI) {
  pi.registerTool({
    name: "parser_contract",
    label: "Parser contract",
    description: "Return the acceptance contract for the toy parser lesson",
    parameters: Type.Object({}),
    async execute() {
      return {
        content: [
          {
            type: "text",
            text: "Keep key=value parsing, preserve '=' inside values, reject malformed input.",
          },
        ],
        details: { checks: ["test:toy", "typecheck:examples"] },
      };
    },
  });
}
