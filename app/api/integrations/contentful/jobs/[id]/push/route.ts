import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCMAEnvironment } from "@/lib/contentful-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const { localeIds } = await req.json().catch(() => ({ localeIds: null }));

  const job = await prisma.contentfulJob.findUnique({
    where: { id },
    include: { locales: true },
  });
  if (!job || job.organizationId !== orgId)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { env, conn } = await getCMAEnvironment(orgId);
  const deliveryMode = conn.deliveryMode;

  const localesToPush = localeIds
    ? job.locales.filter((l) => localeIds.includes(l.id) && l.translatedData)
    : job.locales.filter((l) => l.status === "READY" && l.translatedData);

  if (localesToPush.length === 0)
    return NextResponse.json({ error: "No ready locales to push" }, { status: 400 });

  // Fetch the live Contentful entry
  let entry: any;
  try {
    entry = await env.getEntry(job.entryId);
  } catch (err: any) {
    return NextResponse.json({ error: `Entry not found in Contentful: ${err.message}` }, { status: 404 });
  }

  const results: { locale: string; status: "PUSHED" | "ERROR"; error?: string }[] = [];

  for (const jobLocale of localesToPush) {
    try {
      const translated = jobLocale.translatedData as Record<string, any>;
      const selectedFields = job.selectedFields as string[];

      // Write each translated field into the correct locale slot
      for (const fieldId of selectedFields) {
        if (translated[fieldId] == null) continue;
        if (!entry.fields[fieldId]) entry.fields[fieldId] = {};
        entry.fields[fieldId][jobLocale.targetLocale] = translated[fieldId];
      }

      const updated = await entry.update();

      if (deliveryMode === "PUBLISH") {
        await updated.publish();
      }

      await prisma.contentfulJobLocale.update({
        where: { id: jobLocale.id },
        data: { status: "DELIVERED", deliveredAt: new Date(), error: null },
      });

      results.push({ locale: jobLocale.targetLocale, status: "PUSHED" });
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      await prisma.contentfulJobLocale.update({
        where: { id: jobLocale.id },
        data: { status: "FAILED", error: errMsg },
      });
      results.push({ locale: jobLocale.targetLocale, status: "ERROR", error: errMsg });
    }
  }

  // Update overall job status if all locales delivered
  const allLocales = await prisma.contentfulJobLocale.findMany({ where: { contentfulJobId: id } });
  const allDelivered = allLocales.every((l) => ["DELIVERED", "FAILED"].includes(l.status));
  if (allDelivered) {
    await prisma.contentfulJob.update({ where: { id }, data: { status: "DELIVERED" } });
  }

  return NextResponse.json({ results });
}
