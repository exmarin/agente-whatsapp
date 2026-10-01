import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Used when a workspace hasn't set `settings.daily_llm_budget_usd` yet. */
const DEFAULT_DAILY_BUDGET_USD = 5;

export interface BudgetStatus {
  exceeded: boolean;
  spentUsd: number;
  budgetUsd: number;
}

/**
 * SEC-06 (base): a per-workspace daily spend cap on LLM calls, so a bug or
 * a flood of inbound messages can't run up an unbounded bill unnoticed.
 * Checked before every `generateReply` call in the inbound pipeline.
 */
export async function checkDailyBudget(workspaceId: string): Promise<BudgetStatus> {
  const supabase = createAdminClient();

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();
  if (wsError) throw wsError;

  const settings = workspace.settings as { daily_llm_budget_usd?: number } | null;
  const budgetUsd = settings?.daily_llm_budget_usd ?? DEFAULT_DAILY_BUDGET_USD;

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("payload")
    .eq("workspace_id", workspaceId)
    .eq("type", "llm_usage")
    .gte("created_at", startOfDayUtc.toISOString());
  if (eventsError) throw eventsError;

  const spentUsd = (events ?? []).reduce((sum, event) => {
    const cost = (event.payload as { cost?: number } | null)?.cost;
    return sum + (typeof cost === "number" ? cost : 0);
  }, 0);

  return { exceeded: spentUsd >= budgetUsd, spentUsd, budgetUsd };
}
