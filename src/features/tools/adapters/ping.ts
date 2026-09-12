import { z } from "zod";
import type { Tool } from "../core/tool";

const PingArgs = z.object({
  msg: z.string(),
});

/** F0-T4: end-to-end stub proving the Tool contract works before real adapters land. */
export const pingTool: Tool<z.infer<typeof PingArgs>> = {
  name: "ping",
  description: "Echoes back the given message. Used only to validate the tool contract.",
  sensitivity: "read",
  schema: PingArgs,
  async enabledFor() {
    return true;
  },
  async run(args) {
    return { ok: true, data: { output: args.msg } };
  },
};
