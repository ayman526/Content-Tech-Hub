import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!hasPermission(apiKey, "projects:read"))
    return NextResponse.json({ error: "Missing permission: projects:read" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const status = searchParams.get("status");

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where: {
        organizationId: apiKey.organizationId,
        ...(status ? { status: status as any } : {}),
      },
      select: {
        id: true, name: true, status: true, workflowType: true,
        sourceLanguage: true, targetLanguages: true,
        totalWordCount: true, dueDate: true, createdAt: true, updatedAt: true,
        _count: { select: { documents: true, jobs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.project.count({
      where: { organizationId: apiKey.organizationId, ...(status ? { status: status as any } : {}) },
    }),
  ]);

  return NextResponse.json({ data: projects, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!hasPermission(apiKey, "projects:write"))
    return NextResponse.json({ error: "Missing permission: projects:write" }, { status: 403 });

  const body = await req.json();
  const { name, sourceLanguage, targetLanguages, workflowType, notes, dueDate } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!sourceLanguage?.trim()) return NextResponse.json({ error: "sourceLanguage is required" }, { status: 400 });
  if (!Array.isArray(targetLanguages) || targetLanguages.length === 0)
    return NextResponse.json({ error: "targetLanguages must be a non-empty array" }, { status: 400 });

  const validWorkflows = ["AI_HUMAN", "BYOK", "CREDITS", "HUMAN_ONLY"];
  const workflow = validWorkflows.includes(workflowType) ? workflowType : "AI_HUMAN";

  // Find org owner to use as clientId
  const orgOwner = await prisma.user.findFirst({
    where: { organizationId: apiKey.organizationId, role: "ADMIN" },
    select: { id: true },
  });
  const clientId = orgOwner?.id;
  if (!clientId)
    return NextResponse.json({ error: "No admin user found in organization" }, { status: 500 });

  const project = await prisma.project.create({
    data: {
      organizationId: apiKey.organizationId,
      clientId,
      name: name.trim(),
      sourceLanguage: sourceLanguage.trim(),
      targetLanguages,
      workflowType: workflow as any,
      notes: notes ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "PENDING",
    },
    select: {
      id: true, name: true, status: true, workflowType: true,
      sourceLanguage: true, targetLanguages: true,
      totalWordCount: true, dueDate: true, createdAt: true,
    },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
