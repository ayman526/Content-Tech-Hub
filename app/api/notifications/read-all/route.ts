import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.inAppNotification.updateMany({
    where: { userId: session.user.id!, isRead: false },
    data: { isRead: true, read: true, readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
