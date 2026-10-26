import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const impersonatedBy = (session.user as any).impersonatedBy;
  if (impersonatedBy) {
    return NextResponse.json({ error: "Cannot impersonate while already impersonating" }, { status: 400 });
  }

  const { userId } = await req.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const record = await prisma.impersonationToken.create({
    data: {
      adminId: session.user.id!,
      targetUserId: userId,
      expiresAt,
    },
  });

  return NextResponse.json({ token: record.token, targetUser });
}
