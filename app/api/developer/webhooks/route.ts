import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const ALL_EVENTS = [
  "job.created",
  "job.completed",
  "job.failed",
  "project.completed",
  "project.cancelled",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const subs = await prisma.webhookSubscription.findMany({
    where: { organizationId: orgId },
    select: {
      id: true, url: true, events: true, isActive: true,
      lastFiredAt: true, failureCount: true, createdAt: true,
      deliveries: { select: { success: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  // Never expose the signing secret in list
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { url, events } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let parsedUrl: URL;
  try { parsedUrl = new URL(url.trim()); } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol))
    return NextResponse.json({ error: "URL must be http or https" }, { status: 400 });

  const validEvents = (Array.isArray(events) && events.length > 0 ? events : ALL_EVENTS).filter(
    (e: string) => ALL_EVENTS.includes(e)
  );

  const secret = "whsec_" + randomBytes(24).toString("hex");

  const sub = await prisma.webhookSubscription.create({
    data: { organizationId: orgId, url: url.trim(), events: validEvents, secret },
  });

  // Return the secret ONCE — it is not stored in a retrievable form after creation
  return NextResponse.json({
    id: sub.id,
    url: sub.url,
    events: sub.events,
    secret,
    isActive: sub.isActive,
    createdAt: sub.createdAt,
  }, { status: 201 });
}
