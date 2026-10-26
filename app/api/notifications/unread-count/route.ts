import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ count: 0 });

  const count = await prisma.inAppNotification.count({
    where: { userId: session.user.id!, isRead: false },
  });

  return NextResponse.json({ count });
}
