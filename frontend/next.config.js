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
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; ` +
      "img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
  },
];

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
