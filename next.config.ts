import type { NextConfig } from "next";

// Verified against the actual app, not a generic template: no client-side
// Supabase calls exist (all data access happens server-side in Server
// Components/Actions, so connect-src needs nothing beyond 'self').
//
// script-src allows 'unsafe-inline' deliberately, matching Next.js's own
// documented no-nonce CSP pattern (see "Without Nonces" at
// nextjs.org/docs/app/guides/content-security-policy): App Router injects
// its own inline scripts per request to stream RSC payload data to the
// client (the __next_f.push(...) calls), with content that differs on
// every request, so a static hash allowlist can never match them -- an
// earlier version of this file tried exactly that and it broke hydration
// in production (blocked scripts -> React error #412). The alternative,
// nonce-based CSP, requires forcing every page into dynamic rendering
// (disables static generation/CDN caching site-wide), which is a real
// performance cost not worth paying for this app's actual risk profile:
// React auto-escapes all rendered content by default, and the only
// dangerouslySetInnerHTML in the codebase is the static theme-init script
// below, not user-controlled input -- so the practical XSS surface this
// would additionally close is already small.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'", // Recharts and a few components set inline style attrs
  "img-src 'self'",
  "font-src 'self'", // next/font self-hosts Geist at build time, no external font CDN
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // pdfkit (PDF report generation) reads its standard-font .afm files off
  // disk via fs at request time -- Node-specific filesystem access that
  // webpack's static asset tracing can miss, so it's opted out of bundling
  // and left to Node's native require instead (this is exactly the case
  // serverExternalPackages exists for, per Next's own docs).
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
