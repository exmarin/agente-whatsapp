import { describe, expect, it } from "vitest";
import { getEnabledTools, getTool } from "./registry";

describe("tool registry", () => {
  it("validates the Tool contract end-to-end via the ping stub", async () => {
    const tool = getTool("ping");
    expect(tool).toBeDefined();

    const args = tool!.schema.parse({ msg: "hi" });
    const result = await tool!.run(args, {
      workspaceId: "test-workspace",
      contactPhone: "+50760000000",
      conversationId: "test-conversation",
      credentials: {},
    });

    expect(result).toEqual({ ok: true, data: { output: "hi" } });
  });

  it("lists tools enabled for a workspace", async () => {
    const enabled = await getEnabledTools("test-workspace");
    expect(enabled.map((tool) => tool.name)).toContain("ping");
  });
});
