import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fireWebhooks } from "@/lib/webhook-delivery";

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!hasPermission(apiKey, "jobs:read"))
    return NextResponse.json({ error: "Missing permission: jobs:read" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");

  const where: any = {};
  if (status) where.status = status;
  if (projectId) where.projectId = projectId;

  // Scope to org via project relation
  where.project = { organizationId: apiKey.organizationId };

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      select: {
        id: true, projectId: true, status: true, linguistSource: true,
        sourceLanguage: true, targetLanguage: true, wordCount: true,
        createdAt: true,
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ data: jobs, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!hasPermission(apiKey, "jobs:write"))
    return NextResponse.json({ error: "Missing permission: jobs:write" }, { status: 403 });

  const body = await req.json();
  const { projectId, sourceLanguage, targetLanguage, wordCount, linguistSource } = body;

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!sourceLanguage) return NextResponse.json({ error: "sourceLanguage is required" }, { status: 400 });
  if (!targetLanguage) return NextResponse.json({ error: "targetLanguage is required" }, { status: 400 });
  if (!wordCount || wordCount < 1) return NextResponse.json({ error: "wordCount must be >= 1" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== apiKey.organizationId)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const validSources = ["SYSTEM_POOL", "PREFERRED", "INTERNAL"];
  const source = validSources.includes(linguistSource) ? linguistSource : "SYSTEM_POOL";

  const job = await prisma.job.create({
    data: {
      projectId,
      sourceLanguage,
      targetLanguage,
      wordCount: parseInt(wordCount, 10),
      linguistSource: source as any,
      status: "AVAILABLE",
    },
    select: {
      id: true, projectId: true, status: true, linguistSource: true,
      sourceLanguage: true, targetLanguage: true, wordCount: true, createdAt: true,
    },
  });

  // Fire webhook async — do not block response
  fireWebhooks(apiKey.organizationId, "job.created", {
    jobId: job.id,
    projectId: job.projectId,
    sourceLanguage: job.sourceLanguage,
    targetLanguage: job.targetLanguage,
    wordCount: job.wordCount,
    status: job.status,
  }).catch(() => {});

  return NextResponse.json({ data: job }, { status: 201 });
}
