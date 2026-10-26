import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addSchema = z.object({
  userId: z.string(),
  role: z.enum(["MEMBER", "MANAGER"]).default("MEMBER"),
  canAccessTM: z.boolean().default(false),
  canAccessGlossary: z.boolean().default(false),
  requiresApproval: z.boolean().default(true),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.departmentMember.findMany({
    where: { departmentId: id },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
  return NextResponse.json(members);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: departmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  const orgId = (session.user as any).organizationId;
  if (dept.organizationId !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const targetUser = await prisma.user.findFirst({
    where: { id: parsed.data.userId, organizationId: orgId },
  });
  if (!targetUser) return NextResponse.json({ error: "User not found in organization" }, { status: 404 });

  const member = await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId, userId: parsed.data.userId } },
    create: {
      departmentId,
      userId: parsed.data.userId,
      role: parsed.data.role,
      canAccessTM: parsed.data.canAccessTM,
      canAccessGlossary: parsed.data.canAccessGlossary,
      requiresApproval: parsed.data.requiresApproval,
    },
    update: {
      role: parsed.data.role,
      canAccessTM: parsed.data.canAccessTM,
      canAccessGlossary: parsed.data.canAccessGlossary,
      requiresApproval: parsed.data.requiresApproval,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}
