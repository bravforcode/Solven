import { NextRequest, NextResponse } from "next/server";

// Demo mode (keyless builds) bypasses Clerk entirely.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export default function middleware(_req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.next();
  }

  // Production: Clerk auth enforced via separate middleware
  // This is handled by @clerk/nextjs built-in middleware
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
