import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// BFF identity guard (AUD-C-03 / SEC-C-01 / ARCH-03).
// Production: principal comes from the Clerk session (auth()), not from
// client-supplied headers. Demo mode keeps the fixed local identity.
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
  const session = await auth();
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
      role: (claims?.org_role as string) ?? undefined,
      orgName: (claims?.org_name as string) ?? (claims?.org_slug as string) ?? undefined,
    },
  };
}