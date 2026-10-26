import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ requests: [] });

  const requests = await prisma.organizationJoinRequest.findMany({
    where: { organizationId: orgId, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const { requestId, action } = await req.json();
  if (!requestId || !["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const joinReq = await prisma.organizationJoinRequest.findUnique({
    where: { id: requestId },
    include: { organization: true },
  });

  if (!joinReq || joinReq.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.organizationJoinRequest.update({
    where: { id: requestId },
    data: { status: action },
  });

  if (action === "APPROVED") {
    await prisma.user.update({
      where: { id: joinReq.userId },
      data: { organizationId: orgId },
    });
  }

  return NextResponse.json({ success: true });
}
