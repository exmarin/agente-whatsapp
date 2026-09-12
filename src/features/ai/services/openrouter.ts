import "server-only";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Default Core v1 model per Blueprint §4.4.3. Per-workspace/per-task model
 * selection + fallback list lands in Fase 7 (custom prompting); this is the
 * Fase 1 "camino feliz" single-call version — no tool-calling loop yet.
 */
const MODEL = "anthropic/claude-sonnet-4.5";

export async function generateReply(args: {
  systemPrompt: string;
  userText: string;
  apiKey: string;
}): Promise<{ text: string; cost: number; modelUsed: string }> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Agente WhatsApp",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.userText },
      ],
      temperature: 0.4,
      max_tokens: 512,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`OpenRouter error: ${data.error?.message ?? res.statusText}`);
  }

  return {
    text: data.choices[0]?.message?.content ?? "",
    cost: data.usage?.cost ?? 0,
    modelUsed: data.model as string,
  };
}
