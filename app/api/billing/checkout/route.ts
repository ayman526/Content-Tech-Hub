import { NextResponse } from "next/server";

// Stripe is temporarily disabled.
export async function POST() {
  return NextResponse.json(
    { error: "Online checkout is coming soon. Please contact sales to upgrade your plan or purchase credits." },
    { status: 503 },
  );
}
