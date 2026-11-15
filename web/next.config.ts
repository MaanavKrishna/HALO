import type { NextConfig } from "next";
import investigations from "./src/data/investigations.json";

// Static security headers for every route (no middleware, no nonce).
// script-src keeps 'unsafe-inline' because Next injects inline bootstrap scripts;
// XSS is prevented by never rendering HTML from data or SI output.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// With Cache Components an unknown /explore/<id> would stream a 404 page under a
// 200 status. Rewriting ids that are not in the data to a missing route returns a
// real 404 before rendering starts (no middleware involved).
const knownIds = investigations.map((i) => i.psiId).join("|");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [{ source: "/investigations", destination: "/explore", permanent: true }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: `/explore/:psiId((?!(?:${knownIds})$)[^/]+)`, destination: "/explore-missing" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
