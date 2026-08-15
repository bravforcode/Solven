import { NextResponse } from "next/server";

// BFF identity guard (AUD-C-03 / SEC-C-01 / ARCH-03).
// Production: principal comes from the Clerk session (auth()), not from
// client-supplied headers. Demo mode keeps the fixed local identity.
//
// CRITICAL: Clerk is lazy-imported to avoid crashing serverless functions
// (Vercel) that lack CLERK_SECRET_KEY in demo/keyless builds.  The top-level
// import of `@clerk/nextjs/server` throws at module-load time when the
// secret key env var is absent.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export interface Principal {
  teacherId: string;
  tenant?: string;
  role?: string;
  orgName?: string;
}

/** True when the local demo identity is in use (build-time constant). */
export function isDemoMode(): boolean {
  return DEMO_MODE;
}

export async function requirePrincipal(): Promise<
  | { ok: true; principal: Principal }
  | { ok: false; response: NextResponse }
> {
  if (DEMO_MODE) {
    return { ok: true, principal: { teacherId: "demo-teacher" } };
  }
  // Lazy import — only loaded in production (non-demo) builds where
  // CLERK_SECRET_KEY is guaranteed to be set.
  const { auth } = await import("@clerk/nextjs/server");
  let session;
  try {
    session = await auth();
  } catch {
    // Fail closed with a diagnosable signal when Clerk keys are missing or
    // misconfigured in a non-demo deployment (defense-in-depth; the
    // middleware would normally throw first).
    return {
      ok: false,
      response: NextResponse.json(
        { error: "auth misconfigured" },
        { status: 503 }
      ),
    };
  }
  if (!session.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  const claims = session.sessionClaims as Record<string, unknown> | null | undefined;
  return {
    ok: true,
    principal: {
      teacherId: session.userId,
      tenant: session.orgId ?? undefined,
      role: session.orgRole ?? undefined,
      // org_name is a custom claim (not a standard Clerk claim); fall back to
      // the typed org_slug when the template does not include it.
      orgName: (claims?.org_name as string) ?? session.orgSlug ?? undefined,
    },
  };
}