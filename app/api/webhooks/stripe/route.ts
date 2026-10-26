import { NextResponse } from "next/server";

// Stripe webhooks are temporarily disabled.
export async function POST() {
  return NextResponse.json({ received: true });
}
