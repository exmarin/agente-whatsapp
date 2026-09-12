import type { Tool } from "./tool";
import { pingTool } from "../adapters/ping";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = Tool<any>;

const REGISTRY: AnyTool[] = [pingTool];

export function getTool(name: string): AnyTool | undefined {
  return REGISTRY.find((tool) => tool.name === name);
}

export async function getEnabledTools(workspaceId: string): Promise<AnyTool[]> {
  const checks = await Promise.all(
    REGISTRY.map(async (tool) => ((await tool.enabledFor(workspaceId)) ? tool : null)),
  );
  return checks.filter((tool): tool is AnyTool => tool !== null);
}
