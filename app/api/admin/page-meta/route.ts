import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const records = await prisma.pageMeta.findMany();
  const map: Record<string, any> = {};
  for (const r of records) {
    if (!map[r.pageKey]) map[r.pageKey] = {};
    map[r.pageKey][r.locale] = r;
  }
  return NextResponse.json(map);
}

const UpdateSchema = z.object({
  pageKey: z.string().min(1),
  locale: z.string().min(2).max(5),
  title: z.string().max(120).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  ogTitle: z.string().max(120).nullable().optional(),
  ogDescription: z.string().max(500).nullable().optional(),
  ogImage: z.string().url().nullable().optional().or(z.literal("")),
  canonical: z.string().url().nullable().optional().or(z.literal("")),
  noIndex: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { pageKey, locale, ...data } = parsed.data;
  const record = await prisma.pageMeta.upsert({
    where: { pageKey_locale: { pageKey, locale } },
    update: data,
    create: { pageKey, locale, ...data },
  });
  return NextResponse.json(record);
}
