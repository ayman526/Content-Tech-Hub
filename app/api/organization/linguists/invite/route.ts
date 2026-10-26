import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; organizationId?: string; name?: string; email?: string };
  const orgId = user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { email, languagePairs } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const existing = await prisma.linguistInvitation.findFirst({
    where: { organizationId: orgId, email, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "Invitation already pending for this email" }, { status: 409 });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.linguistInvitation.create({
    data: {
      organizationId: orgId,
      invitedById: user.id,
      email,
      languagePairs: languagePairs ?? [],
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
  const inviteLink = `${baseUrl}/invite?token=${invitation.token}`;

  notifyAsync({
    eventKey: "user.invitation",
    recipients: [{ email }],
    vars: {
      inviter_name: user.name ?? user.email ?? "Your team",
      org_name: org?.name ?? "your organization",
      invite_link: inviteLink,
    },
    triggeredBy: user.id,
  });

  return NextResponse.json({ success: true, id: invitation.id });
}
