import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  const eventKey = url.searchParams.get("eventKey");
  const recipient = url.searchParams.get("recipient");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const minAttempts = url.searchParams.get("minAttempts");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (recipient) where.recipient = { contains: recipient, mode: "insensitive" };
  if (eventKey) where.template = { eventKey };

  const dateFilter: Record<string, Date> = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo);
  if (dateFrom || dateTo) where.createdAt = dateFilter;

  if (minAttempts) where.attempts = { gte: parseInt(minAttempts) };

  const [logs, total] = await Promise.all([
    prisma.notificationDelivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        template: { select: { eventKey: true, channel: true } },
      },
    }),
    prisma.notificationDelivery.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
