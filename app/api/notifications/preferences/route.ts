import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [preferences, templates] = await Promise.all([
    prisma.userNotificationPreference.findMany({
      where: { userId: session.user.id! },
    }),
    prisma.notificationTemplate.findMany({
      select: { eventKey: true, channel: true, priority: true, isCritical: true },
      distinct: ["eventKey"],
      where: { isActive: true },
    }),
  ]);

  const prefMap: Record<string, { emailEnabled: boolean; inAppEnabled: boolean }> = {};
  for (const p of preferences) {
    prefMap[p.eventKey] = { emailEnabled: p.emailEnabled, inAppEnabled: p.inAppEnabled };
  }

  const events = templates.map((t) => ({
    eventKey: t.eventKey,
    priority: t.priority,
    isCritical: t.isCritical,
    emailEnabled: prefMap[t.eventKey]?.emailEnabled ?? true,
    inAppEnabled: prefMap[t.eventKey]?.inAppEnabled ?? true,
  }));

  return NextResponse.json({ events });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { eventKey, emailEnabled, inAppEnabled } = body;

  if (!eventKey) return NextResponse.json({ error: "eventKey required" }, { status: 400 });

  const pref = await prisma.userNotificationPreference.upsert({
    where: { userId_eventKey: { userId: session.user.id!, eventKey } },
    update: { emailEnabled, inAppEnabled },
    create: { userId: session.user.id!, eventKey, emailEnabled, inAppEnabled },
  });

  return NextResponse.json(pref);
}
