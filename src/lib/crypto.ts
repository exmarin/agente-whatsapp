import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import "server-only";

/**
 * Encrypts/decrypts workspace integration credentials (YCloud/OpenRouter/
 * HighLevel secrets, HighLevel OAuth tokens) before they touch Postgres.
 *
 * SEC-03: the key lives ONLY in the server environment (ENCRYPTION_KEY),
 * never in the database — pgcrypto with an in-DB key would make the
 * encryption theater (a leaked service_role key or a DB dump would
 * decrypt everything). Ciphertext columns (`integrations.credentials`,
 * `integrations.oauth_tokens`, `tool_configs.credentials`) store only
 * the envelope this module produces; Postgres never sees plaintext.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_ID = "v1";

export interface EncryptedEnvelope {
  enc: string; // base64 ciphertext
  iv: string; // base64 IV
  tag: string; // base64 auth tag
  key_id: string; // for future key rotation
}

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set — cannot encrypt/decrypt credentials.");
  }
  // scrypt derives a fixed 32-byte key from whatever-length secret is configured.
  return scryptSync(secret, "agente-whatsapp-credentials", 32);
}

export function encryptJson(value: unknown): EncryptedEnvelope {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    key_id: KEY_ID,
  };
}

export function decryptJson<T = unknown>(envelope: EncryptedEnvelope): T {
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.enc, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
