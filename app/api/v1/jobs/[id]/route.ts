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
      project: { select: { name: true, organizationId: true } },
      linguist: { select: { name: true, email: true } },
    },
  });

  if (!job || job.project.organizationId !== apiKey.organizationId)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: job.id,
      projectId: job.projectId,
      projectName: job.project.name,
      status: job.status,
      linguistSource: job.linguistSource,
      sourceLanguage: job.sourceLanguage,
      targetLanguage: job.targetLanguage,
      wordCount: job.wordCount,
      linguist: job.linguist ? { name: job.linguist.name, email: job.linguist.email } : null,
      createdAt: job.createdAt,
    },
  });
}
