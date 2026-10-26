import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linguistId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason: string | undefined = body.reason;

  const existing = await prisma.linguistBlacklist.findUnique({
    where: { customerId_linguistId: { customerId: session.user.id, linguistId } },
  });

  if (existing) {
    await prisma.linguistBlacklist.delete({ where: { id: existing.id } });
    return NextResponse.json({ blacklisted: false });
  }

  await prisma.linguistBlacklist.create({
    data: {
      customerId: session.user.id,
      linguistId,
      organizationId: orgId,
      reason,
    },
  });

  await prisma.favoriteLinguist.deleteMany({
    where: { customerId: session.user.id, linguistId },
  });

  return NextResponse.json({ blacklisted: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linguistId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await prisma.linguistBlacklist.findUnique({
    where: { customerId_linguistId: { customerId: session.user.id, linguistId } },
  });
  return NextResponse.json({ blacklisted: !!entry });
}
