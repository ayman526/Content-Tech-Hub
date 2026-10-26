import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCMAEnvironment, extractFieldSegments, countWords } from "@/lib/contentful-client";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const jobs = await prisma.contentfulJob.findMany({
    where: { organizationId: orgId },
    include: { locales: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { entryIds, targetLocales } = await req.json();
  if (!Array.isArray(entryIds) || entryIds.length === 0)
    return NextResponse.json({ error: "entryIds required" }, { status: 400 });
  if (!Array.isArray(targetLocales) || targetLocales.length === 0)
    return NextResponse.json({ error: "targetLocales required" }, { status: 400 });

  const { env, conn } = await getCMAEnvironment(orgId);

  // Fetch mappings for this org
  const mappings = await prisma.contentfulMapping.findMany({ where: { organizationId: orgId } });
  const mappingMap = new Map(mappings.map((m) => [m.contentTypeId, m]));

  const createdJobs = [];

  for (const entryId of entryIds) {
    const entry = await env.getEntry(entryId);
    const contentTypeId = entry.sys.contentType.sys.id;
    const mapping = mappingMap.get(contentTypeId);
    const translatableFields: string[] = (mapping?.translatableFields as string[]) ?? [];
    const workflowType = mapping?.workflowType ?? "AI_HUMAN";

    // Get entry title
    const fields = entry.fields ?? {};
    const sourceLocale = conn.sourceLocale;
    const rawTitle =
      fields.title?.[sourceLocale] ??
      fields.name?.[sourceLocale] ??
      fields.slug?.[sourceLocale] ??
      Object.values(fields)[0]?.[sourceLocale];
    const entryTitle = typeof rawTitle === "string" ? rawTitle : entryId;

    // Get content type to know field types
    const ct = await env.getContentType(contentTypeId);
    const fieldTypeMap = new Map(ct.fields.map((f: any) => [f.id, f.type]));

    // Extract source snapshot (only translatable fields)
    const sourceSnapshot: Record<string, any> = {};
    let wordCount = 0;
    for (const fieldId of translatableFields) {
      const rawVal = fields[fieldId]?.[sourceLocale];
      if (rawVal == null) continue;
      const fieldType = fieldTypeMap.get(fieldId) ?? "Symbol";
      sourceSnapshot[fieldId] = { value: rawVal, type: fieldType };
      wordCount += countWords(rawVal, fieldType);
    }

    const job = await prisma.contentfulJob.create({
      data: {
        organizationId: orgId,
        entryId,
        entryTitle,
        contentTypeId,
        spaceId: conn.spaceId,
        environmentId: conn.environmentId,
        sourceLocale,
        selectedFields: translatableFields,
        sourceSnapshot,
        wordCount,
        workflowType,
        status: "QUEUED",
        locales: {
          create: targetLocales.map((locale: string) => ({ targetLocale: locale, status: "QUEUED" })),
        },
      },
      include: { locales: true },
    });

    createdJobs.push(job);
  }

  return NextResponse.json({ created: createdJobs.length, jobs: createdJobs }, { status: 201 });
}
