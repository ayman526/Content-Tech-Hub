import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!hasPermission(apiKey, "projects:read"))
    return NextResponse.json({ error: "Missing permission: projects:read" }, { status: 403 });

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true, originalFilename: true, fileType: true,
          wordCount: true, processingStatus: true, translatedFileUrl: true, createdAt: true,
        },
      },
      jobs: {
        select: {
          id: true, status: true, sourceLanguage: true, targetLanguage: true,
          wordCount: true, linguistSource: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project || project.organizationId !== apiKey.organizationId)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({ data: project });
}
