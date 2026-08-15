import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requirePrincipal } from "@/lib/bffAuth";

// Lazy client: null when STRIPE_SECRET_KEY is unset (demo/keyless builds).
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

export async function POST() {
  const guard = await requirePrincipal();
  if (!guard.ok) return guard.response;
  const principal = guard.principal;

  if (!principal.tenant) {
    return NextResponse.json({ error: "no org" }, { status: 403 });
  }
  // Billing management (cancel, payment methods) is owner-only — same gate as
  // checkout, so non-owner members cannot touch the org's subscription.
  if (principal.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }
  if (!stripe) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }

  const res = await fetch(
    `${API_URL}/api/internal/billing/customer?org_id=${encodeURIComponent(principal.tenant)}`,
    {
      headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {},
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "no subscription yet" }, { status: 404 });
  }
  const { customer_id } = (await res.json()) as { customer_id: string };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: `${siteUrl}/org`,
    });
    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: "stripe unavailable" }, { status: 502 });
  }
}