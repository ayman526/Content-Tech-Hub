import { NextResponse } from "next/server";

// Stripe is temporarily disabled.
export async function POST() {
  return NextResponse.json(
    { error: "Billing portal is coming soon." },
    { status: 503 },
  );
}
