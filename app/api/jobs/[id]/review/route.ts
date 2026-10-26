import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { rating, comment } = parsed.data;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { project: true },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.project.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!job.linguistId) {
    return NextResponse.json({ error: "No linguist assigned to this job" }, { status: 400 });
  }

  const existing = await prisma.linguistReview.findUnique({ where: { jobId } });
  if (existing) return NextResponse.json({ error: "Already reviewed" }, { status: 409 });

  const review = await prisma.linguistReview.create({
    data: {
      jobId,
      reviewerId: session.user.id,
      linguistId: job.linguistId,
      rating,
      comment,
    },
  });

  const allReviews = await prisma.linguistReview.findMany({
    where: { linguistId: job.linguistId },
    select: { rating: true },
  });
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;

  await prisma.linguistProfile.updateMany({
    where: { userId: job.linguistId },
    data: {
      rating: Math.round(avg * 100) / 100,
      reviewCount: allReviews.length,
    },
  });

  return NextResponse.json(review, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.linguistReview.findUnique({ where: { jobId } });
  return NextResponse.json(review ?? null);
}
