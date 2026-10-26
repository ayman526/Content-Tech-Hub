import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const members = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      clientAccountAccess: {
        select: { clientAccountId: true },
        where: { organizationId: orgId },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
      clientAccountIds: m.clientAccountAccess.map((a) => a.clientAccountId),
    }))
  );
}
