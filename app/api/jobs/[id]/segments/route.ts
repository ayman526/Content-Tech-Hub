import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      jobTranslations: true,
      project: {
        include: {
          documents: {
            include: { segments: { orderBy: { segmentIndex: "asc" } } },
          },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });

  const documentCount = job.project.documents.length;
  const segments = job.project.documents.flatMap((d: any) => d.segments);

  if (segments.length === 0) {
    return NextResponse.json({
      segments: [],
      status: "pending",
      message:
        documentCount === 0
          ? "No document has been attached to this project yet."
          : "Document is still being processed. Segments will appear once extraction is complete.",
    });
  }

  const translationMap = new Map<string, string>(
    (job as any).jobTranslations.map((jt: any) => [jt.segmentId, jt.translatedText])
  );

  const merged = segments.map((s: any) => ({
    ...s,
    translatedText: translationMap.get(s.id) ?? s.translatedText ?? null,
  }));

  return NextResponse.json({ segments: merged, status: "ready", message: null });
}
