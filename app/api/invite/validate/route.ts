import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invitation = await prisma.linguistInvitation.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invitation) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation already used or cancelled" }, { status: 410 });
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.linguistInvitation.update({ where: { token }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    languagePairs: invitation.languagePairs,
    organization: invitation.organization,
    invitedBy: invitation.invitedBy,
    expiresAt: invitation.expiresAt.toISOString(),
  });
}
