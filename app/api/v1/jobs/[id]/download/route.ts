import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!hasPermission(apiKey, "jobs:read"))
    return NextResponse.json({ error: "Missing permission: jobs:read" }, { status: 403 });

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          organizationId: true,
          documents: {
            select: { translatedFileUrl: true, originalFilename: true, processingStatus: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!job || job.project.organizationId !== apiKey.organizationId)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.status !== "COMPLETED")
    return NextResponse.json({ error: "Job is not yet completed", status: job.status }, { status: 409 });

  const doc = job.project.documents[0];
  if (!doc?.translatedFileUrl)
    return NextResponse.json({ error: "No translated file available yet" }, { status: 404 });

  return NextResponse.json({
    data: {
      jobId: job.id,
      downloadUrl: doc.translatedFileUrl,
      filename: doc.originalFilename,
      availableUntil: null,
    },
  });
}
