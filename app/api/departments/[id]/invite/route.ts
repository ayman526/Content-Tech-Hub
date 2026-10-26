import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notifyAsync } from "@/lib/notifications";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["MEMBER", "MANAGER"]).default("MEMBER"),
  canAccessTM: z.boolean().default(false),
  canAccessGlossary: z.boolean().default(false),
  requiresApproval: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: departmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const dept = await prisma.department.findFirst({
    where: { id: departmentId, organizationId: orgId },
    include: { organization: { select: { name: true } } },
  });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, role, canAccessTM, canAccessGlossary, requiresApproval } = parsed.data;

  // If user already in org, add them directly as a member
  const existingUser = await prisma.user.findFirst({
    where: { email, organizationId: orgId },
  });

  if (existingUser) {
    const member = await prisma.departmentMember.upsert({
      where: { departmentId_userId: { departmentId, userId: existingUser.id } },
      create: { departmentId, userId: existingUser.id, role, canAccessTM, canAccessGlossary, requiresApproval },
      update: { role, canAccessTM, canAccessGlossary, requiresApproval },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    return NextResponse.json({ type: "added_directly", member }, { status: 201 });
  }

  // Cancel any previous pending invite for same email+dept
  await prisma.departmentInvitation.deleteMany({
    where: { departmentId, email, status: "PENDING" },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.departmentInvitation.create({
    data: {
      departmentId,
      organizationId: orgId,
      invitedById: session.user.id,
      email,
      role,
      canAccessTM,
      canAccessGlossary,
      requiresApproval,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`;
  const inviterName = (session.user as { name?: string; email?: string }).name ?? (session.user as { email?: string }).email ?? "A team manager";

  notifyAsync({
    eventKey: "user.invitation",
    recipients: [{ email }],
    vars: {
      inviter_name: inviterName,
      org_name: dept.organization.name,
      invite_link: inviteUrl,
    },
    triggeredBy: session.user.id,
  });

  return NextResponse.json({
    type: "invited",
    invitation: { id: invitation.id, email, token: invitation.token, expiresAt: invitation.expiresAt },
    inviteUrl,
  }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: departmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitations = await prisma.departmentInvitation.findMany({
    where: { departmentId, status: "PENDING" },
    select: { id: true, email: true, role: true, status: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: departmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invitationId } = await req.json();
  await prisma.departmentInvitation.deleteMany({
    where: { id: invitationId, departmentId },
  });
  return NextResponse.json({ success: true });
}
