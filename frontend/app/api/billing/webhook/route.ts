import { NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy client: null when STRIPE_SECRET_KEY is unset (demo/keyless builds).
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

// Public route (middleware allows it) — Stripe signature verification is the
// only gate; the backend never accepts unverified events.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !sig || !secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (!event.type.startsWith("customer.subscription.")) {
    return NextResponse.json({ received: true });
  }
  const sub = event.data.object as Stripe.Subscription;
  const orgId = sub.metadata?.org_id;
  if (!orgId) {
    return NextResponse.json({ received: true, skipped: "no org_id" });
  }
  const res = await fetch(`${API_URL}/api/internal/billing/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      event_id: event.id,
      type: event.type,
      data: {
        org_id: orgId,
        stripe_sub_id: sub.id,
        status: sub.status,
        period_end: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
        plan: sub.metadata?.plan ?? null,
        customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      },
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "backend sync failed" }, { status: 502 });
  }
  return NextResponse.json({ received: true });
}