import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linguistId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const existing = await prisma.favoriteLinguist.findUnique({
    where: { customerId_linguistId: { customerId: session.user.id, linguistId } },
  });

  if (existing) {
    await prisma.favoriteLinguist.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favoriteLinguist.create({
    data: {
      customerId: session.user.id,
      linguistId,
      organizationId: orgId,
    },
  });

  await prisma.linguistBlacklist.deleteMany({
    where: { customerId: session.user.id, linguistId },
  });

  return NextResponse.json({ favorited: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linguistId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await prisma.favoriteLinguist.findUnique({
    where: { customerId_linguistId: { customerId: session.user.id, linguistId } },
  });
  return NextResponse.json({ favorited: !!entry });
}
