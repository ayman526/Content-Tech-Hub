import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const job = await prisma.contentfulJob.findUnique({
    where: { id },
    include: { locales: true },
  });

  if (!job || job.organizationId !== orgId)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json(job);
}
