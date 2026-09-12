import crypto from "node:crypto";

const REPLAY_TOLERANCE_MS = 5 * 60 * 1000; // 5 min, per Blueprint §4.1.1

/**
 * YCloud signs webhooks with `YCloud-Signature: t={timestamp},s={signature}`,
 * HMAC-SHA256 over `timestamp + "." + rawBody`. The caller MUST pass the
 * untouched raw request body (read before any JSON parsing) — re-serializing
 * the parsed JSON will not reproduce the same signature.
 */
export function verifyYCloudSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): { ok: true } | { ok: false; reason: string; debug?: Record<string, unknown> } {
  if (!args.signatureHeader) return { ok: false, reason: "missing_signature" };

  const parts = Object.fromEntries(
    args.signatureHeader
      .split(",")
      .map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]),
  );
  const t = Number(parts.t);
  const sig = parts.s;
  if (!t || !sig) return { ok: false, reason: "malformed_signature" };

  if (Math.abs(Date.now() - t * 1000) > REPLAY_TOLERANCE_MS) {
    return { ok: false, reason: "timestamp_out_of_tolerance" };
  }

  const expected = crypto
    .createHmac("sha256", args.secret)
    .update(`${t}.${args.rawBody}`)
    .digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return {
      ok: false,
      reason: "signature_mismatch",
      // Diagnostic only (TEMP): HMAC outputs are safe to log, they don't
      // reveal the secret. Remove once the Fase 1 webhook is confirmed working.
      debug: {
        receivedSig: sig,
        expectedSig: expected,
        receivedLen: sig.length,
        expectedLen: expected.length,
        rawBodyLen: args.rawBody.length,
        secretLen: args.secret.length,
        secretPrefix: args.secret.slice(0, 6),
      },
    };
  }
  return { ok: true };
}
