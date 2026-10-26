import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: segmentId } = await params;
  const { translatedText, status, jobId } = await req.json();

  const segment = await prisma.translationSegment.update({
    where: { id: segmentId },
    data: {
      translatedText: translatedText ?? undefined,
      status: status ?? undefined,
      assignedLinguistId: session.user.id,
    },
  });

  // If a jobId is supplied, keep JobTranslation in sync so the delivery
  // route always reads the linguist's final edited text for this job
  if (jobId && translatedText !== undefined) {
    await prisma.jobTranslation.upsert({
      where: { jobId_segmentId: { jobId, segmentId } },
      update: { translatedText },
      create: { jobId, segmentId, translatedText },
    });
  }

  return NextResponse.json(segment);
}
