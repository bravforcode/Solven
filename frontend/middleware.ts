import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Demo mode (keyless builds) bypasses Clerk entirely — the BFF uses a fixed
// local identity, so the middleware must not lock routes behind a sign-in
// that cannot work without Clerk keys. Build-time constant, same as bffAuth.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/billing/webhook(.*)",
]);

export default DEMO_MODE
  ? (req: NextRequest) => NextResponse.next()
  : clerkMiddleware((auth, req) => {
      if (!isPublicRoute(req)) auth().protect();
    });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};