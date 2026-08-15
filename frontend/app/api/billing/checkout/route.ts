import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requirePrincipal } from "@/lib/bffAuth";

// Lazy client: null when STRIPE_SECRET_KEY is unset (demo/keyless builds) —
// handlers return 503 instead of crashing at module load.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export async function POST() {
  const guard = await requirePrincipal();
  if (!guard.ok) return guard.response;
  const principal = guard.principal;

  if (!principal.tenant) {
    return NextResponse.json({ error: "no org" }, { status: 403 });
  }
  if (principal.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: principal.tenant,
      subscription_data: {
        metadata: { org_id: principal.tenant, plan: "pro", org_name: principal.orgName ?? "" },
      },
      success_url: `${siteUrl}/org?billing=success`,
      cancel_url: `${siteUrl}/org?billing=canceled`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch {
    return NextResponse.json({ error: "stripe unavailable" }, { status: 502 });
  }
}