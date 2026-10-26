import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const conn = await prisma.contentfulConnection.findUnique({
    where: { organizationId: orgId },
    select: {
      id: true, spaceId: true, environmentId: true,
      sourceLocale: true, targetLocales: true, deliveryMode: true,
      connectedAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({ connected: !!conn, connection: conn ?? null });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  await prisma.contentfulConnection.deleteMany({ where: { organizationId: orgId } });
  return NextResponse.json({ ok: true });
}
