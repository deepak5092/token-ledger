import type { NextConfig } from "next";

// Verified against the actual app, not a generic template: no client-side
// Supabase calls exist (all data access happens server-side in Server
// Components/Actions, so connect-src needs nothing beyond 'self'), and the
// one inline script in src/app/layout.tsx (the theme-init script, needed to
// avoid a flash of the wrong theme) is allowed by exact hash rather than a
// blanket 'unsafe-inline' -- if that script's content ever changes, this
// hash must be recomputed (sha256, base64) or it'll be silently blocked in
// production with no build-time error.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'sha256-F42ta/ZpxcGdB9ijYzFBSsK28g8VdKq2WyTuUI9tlQo='",
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
