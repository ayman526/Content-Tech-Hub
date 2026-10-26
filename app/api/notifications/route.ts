import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId: session.user.id! },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.inAppNotification.count({ where: { userId: session.user.id! } }),
  ]);

  return NextResponse.json({ notifications, total, page, limit });
}
