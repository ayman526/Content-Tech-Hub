import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCMAEnvironment, extractFieldSegments, rebuildFieldValue } from "@/lib/contentful-client";
import { translateSegment, fetchBizContextForOrg, type LocContext } from "@/lib/ai-translate";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const job = await prisma.contentfulJob.findUnique({
    where: { id },
    include: { locales: true },
  });
  if (!job || job.organizationId !== orgId)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await getCMAEnvironment(orgId);
  const sourceSnapshot = job.sourceSnapshot as Record<string, { value: any; type: string }>;
  const selectedFields = job.selectedFields as string[];
  const sourceLocale = job.sourceLocale;

  // Inject organization business context (industry, URL, bio) into the AI prompt
  const bizContext = await fetchBizContextForOrg(prisma, orgId);
  const locCtx: LocContext | undefined = bizContext
    ? { tmEntries: [], glossaryTerms: [], styleGuides: [], bizContext }
    : undefined;

  const results: { localeId: string; status: "OK" | "ERROR"; error?: string }[] = [];

  for (const jobLocale of job.locales) {
    if (jobLocale.status === "DELIVERED") {
      results.push({ localeId: jobLocale.id, status: "OK" });
      continue;
    }

    try {
      await prisma.contentfulJobLocale.update({
        where: { id: jobLocale.id },
        data: { status: "TRANSLATING", error: null },
      });

      const translatedData: Record<string, any> = {};

      for (const fieldId of selectedFields) {
        const fieldInfo = sourceSnapshot[fieldId];
        if (!fieldInfo) continue;
        const { value, type } = fieldInfo;

        // Extract text segments from this field
        const segments = extractFieldSegments(fieldId, value, type);
        const translationMap = new Map<string, string>();

        for (const seg of segments) {
          const translated = await translateSegment(
            seg.text,
            sourceLocale,
            jobLocale.targetLocale,
            3,
            locCtx,
            undefined,
            undefined,
            {
              organizationId: orgId,
              jobId: job.id,
              billingMode: job.workflowType ?? "CREDITS",
              kind: "contentful_translate",
            }
          );
          translationMap.set(seg.key, translated);
        }

        translatedData[fieldId] = rebuildFieldValue(fieldId, value, type, translationMap);
      }

      await prisma.contentfulJobLocale.update({
        where: { id: jobLocale.id },
        data: {
          status: job.workflowType === "HUMAN_ONLY" ? "REVIEW" : "READY",
          translatedData,
        },
      });

      results.push({ localeId: jobLocale.id, status: "OK" });
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      await prisma.contentfulJobLocale.update({
        where: { id: jobLocale.id },
        data: { status: "FAILED", error: errMsg },
      });
      results.push({ localeId: jobLocale.id, status: "ERROR", error: errMsg });
    }
  }

  // Update overall job status
  const allLocales = await prisma.contentfulJobLocale.findMany({ where: { contentfulJobId: id } });
  const allReady = allLocales.every((l) => ["READY", "DELIVERED", "FAILED"].includes(l.status));
  if (allReady) {
    await prisma.contentfulJob.update({ where: { id }, data: { status: "READY" } });
  } else {
    await prisma.contentfulJob.update({ where: { id }, data: { status: "AI_DRAFT" } });
  }

  return NextResponse.json({ results });
}
