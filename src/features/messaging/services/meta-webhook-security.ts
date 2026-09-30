import crypto from "node:crypto";

/**
 * Meta signs every webhook POST with `X-Hub-Signature-256: sha256=<hex>`,
 * HMAC-SHA256 over the raw request body using the Meta App's secret (one
 * secret for the whole app — not per workspace, since the webhook itself
 * is subscribed once at the app level).
 */
export function verifyMetaSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!args.signatureHeader) return { ok: false, reason: "missing_signature" };

  const [scheme, sig] = args.signatureHeader.split("=");
  if (scheme !== "sha256" || !sig) return { ok: false, reason: "malformed_signature" };

  const expected = crypto.createHmac("sha256", args.appSecret).update(args.rawBody).digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}

/**
 * Meta verifies webhook ownership with a one-time GET carrying
 * `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` — we echo the
 * challenge back only if the token matches the one we configured in the
 * Meta App dashboard (META_VERIFY_TOKEN).
 */
export function resolveMetaChallenge(args: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  verifyToken: string;
}): string | null {
  if (args.mode === "subscribe" && args.token === args.verifyToken && args.challenge) {
    return args.challenge;
  }
  return null;
}
