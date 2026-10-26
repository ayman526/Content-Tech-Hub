import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { userId } = await params;

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: orgId },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const body = await req.json();
  const clientAccountIds = (Array.isArray(body.clientAccountIds)
    ? [...new Set((body.clientAccountIds as unknown[]).filter((id): id is string => typeof id === "string"))]
    : []) as string[];

  if (clientAccountIds.length > 0) {
    const ownedAccounts = await prisma.clientAccount.findMany({
      where: { id: { in: clientAccountIds }, organizationId: orgId },
      select: { id: true },
    });
    if (ownedAccounts.length !== clientAccountIds.length) {
      return NextResponse.json({ error: "One or more client accounts not found" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.memberClientAccountAccess.deleteMany({
      where: { userId, organizationId: orgId },
    }),
    ...(clientAccountIds.length > 0
      ? [
          prisma.memberClientAccountAccess.createMany({
            data: clientAccountIds.map((clientAccountId) => ({
              userId,
              organizationId: orgId,
              clientAccountId,
            })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true, clientAccountIds });
}
