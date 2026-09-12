import type { NextConfig } from "next";

// F0-T8 (SECURITY-AUDIT-agente-whatsapp.md SEC-11): baseline security
// headers, with connect-src scoped to the external services this app
// actually talks to. CSP uses 'unsafe-inline' for script/style because
// Next.js injects inline bootstrap scripts; a nonce-based CSP (via
// src/proxy.ts) is a stricter follow-up, not required for Core v1.
const CONNECT_SRC = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.ycloud.com",
  "https://openrouter.ai",
  "https://services.leadconnectorhq.com",
].join(" ");

// Turbopack/React dev tooling (HMR, stack-frame reconstruction) needs
// eval() — only in development. Production never gets 'unsafe-eval'.
const SCRIPT_SRC = process.env.NODE_ENV === "development"
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const CSP = [
  "default-src 'self'",
  SCRIPT_SRC,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src ${CONNECT_SRC}`,
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
