import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const template = await prisma.notificationTemplate.findUnique({
    where: { id },
    include: { _count: { select: { deliveries: true } } },
  });

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const template = await prisma.notificationTemplate.update({
    where: { id },
    data: {
      subject: body.subject,
      htmlBody: body.htmlBody,
      textBody: body.textBody,
      inAppTitle: body.inAppTitle,
      inAppBody: body.inAppBody,
      inAppLink: body.inAppLink,
      ctaLabel: body.ctaLabel,
      ctaUrl: body.ctaUrl,
      variables: body.variables,
      priority: body.priority,
      isActive: body.isActive,
      isCritical: body.isCritical,
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.notificationTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
