import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateIssueSchema = z.object({
  jobId: z.string(),
  category: z.enum(["ACCURACY", "TERMINOLOGY", "GRAMMAR", "STYLE_TONE", "LOCALE", "FORMATTING_TAGS", "CONSISTENCY", "COMPLIANCE"]),
  subType: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]),
  note: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: segmentId } = await params;

  const issues = await prisma.segmentIssue.findMany({
    where: { segmentId },
    include: { reviewer: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(issues);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: segmentId } = await params;
  const body = await req.json();
  const parsed = CreateIssueSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const segment = await prisma.translationSegment.findUnique({ where: { id: segmentId } });
  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 });

  const issue = await prisma.segmentIssue.create({
    data: {
      segmentId,
      jobId: parsed.data.jobId,
      reviewerId: session.user.id,
      category: parsed.data.category,
      subType: parsed.data.subType,
      severity: parsed.data.severity,
      note: parsed.data.note,
    },
    include: { reviewer: { select: { name: true, email: true } } },
  });

  return NextResponse.json(issue, { status: 201 });
}
