/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// Next.js (App Router) ships the RSC hydration payload as INLINE scripts
// (self.__next_f.push(...)) in both dev and production. A script-src without
// 'unsafe-inline' blocks those inline scripts and hydration silently never
// runs: the SSR HTML renders, but no effects/handlers attach — the app looks
// dead to every click. 'unsafe-inline' is therefore required for the app to
// function at all; dev additionally needs 'unsafe-eval' for webpack HMR.
// (Nonce-based CSP is the proper hardening — see SECURITY.md.)
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev"
  : "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev; ` +
      "img-src 'self' data: https://img.clerk.com; font-src 'self' data: https://*.clerk.accounts.dev; " +
      "connect-src 'self' https://*.clerk.accounts.dev wss://*.clerk.accounts.dev; frame-src https://*.clerk.accounts.dev",
  },
];

const nextConfig = {
  // NOTE: output: "standalone" is for Docker/self-hosted, NOT Vercel.
  // Vercel handles its own build output; standalone causes CSS/JS asset issues.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Pages/SW/manifest must never be HTTP-cached: during a hackathon the
      // build changes constantly, and a stale HTML response paired with fresh
      // hashed JS breaks React hydration (runtime error, not a build error).
      // Hashed /_next/static assets are excluded (immutable, content-hashed).
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

module.exports = nextConfig;
