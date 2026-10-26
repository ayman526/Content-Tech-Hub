import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitation = await prisma.departmentInvitation.findUnique({
    where: { token },
    include: {
      department: { select: { id: true, name: true } },
      organization: { select: { id: true } },
    },
  });

  if (!invitation) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation is no longer valid" }, { status: 400 });
  }
  if (new Date() > invitation.expiresAt) {
    await prisma.departmentInvitation.update({ where: { token }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: "This invitation was sent to a different email address" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    // Add user to org if not already a member
    if (user.organizationId !== invitation.organizationId) {
      await tx.user.update({
        where: { id: user.id },
        data: { organizationId: invitation.organizationId },
      });
    }

    // Add to department
    await tx.departmentMember.upsert({
      where: {
        departmentId_userId: {
          departmentId: invitation.departmentId,
          userId: user.id,
        },
      },
      create: {
        departmentId: invitation.departmentId,
        userId: user.id,
        role: invitation.role,
        canAccessTM: invitation.canAccessTM,
        canAccessGlossary: invitation.canAccessGlossary,
        requiresApproval: invitation.requiresApproval,
      },
      update: {
        role: invitation.role,
        canAccessTM: invitation.canAccessTM,
        canAccessGlossary: invitation.canAccessGlossary,
        requiresApproval: invitation.requiresApproval,
      },
    });

    // Mark invitation as accepted
    await tx.departmentInvitation.update({
      where: { token },
      data: { status: "ACCEPTED" },
    });
  });

  return NextResponse.json({ success: true, departmentName: invitation.department.name });
}
