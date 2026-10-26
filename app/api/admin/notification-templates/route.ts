import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const eventKey = url.searchParams.get("eventKey");
  const channel = url.searchParams.get("channel");
  const isActive = url.searchParams.get("isActive");

  const templates = await prisma.notificationTemplate.findMany({
    where: {
      ...(eventKey ? { eventKey } : {}),
      ...(channel ? { channel } : {}),
      ...(isActive !== null ? { isActive: isActive === "true" } : {}),
    },
    orderBy: [{ eventKey: "asc" }, { channel: "asc" }],
    include: {
      _count: { select: { deliveries: true } },
    },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    eventKey,
    channel,
    subject,
    htmlBody,
    textBody,
    inAppTitle,
    inAppBody,
    inAppLink,
    ctaLabel,
    ctaUrl,
    variables,
    priority,
    isActive,
    isCritical,
  } = body;

  if (!eventKey || !channel) {
    return NextResponse.json({ error: "eventKey and channel required" }, { status: 400 });
  }

  const template = await prisma.notificationTemplate.create({
    data: {
      eventKey,
      channel,
      subject,
      htmlBody,
      textBody,
      inAppTitle,
      inAppBody,
      inAppLink,
      ctaLabel,
      ctaUrl,
      variables: variables ?? [],
      priority: priority ?? "normal",
      isActive: isActive ?? true,
      isCritical: isCritical ?? false,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
