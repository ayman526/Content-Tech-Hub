import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, logActivity } from "@/lib/studio";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();
  const ws = await getOrCreateWorkspace(session.user.id!);

  if (action === "subscribe") {
    const updated = await prisma.studioWorkspace.update({
      where: { id: ws.id },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionStartedAt: new Date(),
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await logActivity(ws.id, "subscription.activated", { plan: "studio_monthly" });
    return NextResponse.json({ ...updated, subscribed: true });
  }

  if (action === "cancel") {
    const updated = await prisma.studioWorkspace.update({
      where: { id: ws.id },
      data: { subscriptionStatus: "CANCELED" },
    });
    await logActivity(ws.id, "subscription.canceled");
    return NextResponse.json({ ...updated, subscribed: false });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
