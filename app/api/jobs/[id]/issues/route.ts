import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const issues = await prisma.segmentIssue.findMany({
    where: { jobId, source: "human" },
    include: {
      reviewer: { select: { name: true, email: true } },
      segment: { select: { segmentIndex: true, sourceText: true, translatedText: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(issues);
}
