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
  const configs = await prisma.siteConfig.findMany();
  const map: Record<string, unknown> = {};
  for (const c of configs) map[c.key] = c.value;
  return NextResponse.json(map);
}

const UpdateSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.siteConfig.findUnique({ where: { key: parsed.data.key } });
  const record = await prisma.siteConfig.upsert({
    where: { key: parsed.data.key },
    update: { value: parsed.data.value as any },
    create: { key: parsed.data.key, value: parsed.data.value as any },
  });

  await prisma.changeLog.create({
    data: {
      adminId: (session.user as any).id ?? "unknown",
      adminEmail: session.user?.email ?? undefined,
      entityType: "CONTENT",
      entityKey: parsed.data.key,
      before: before?.value as any ?? null,
      after: parsed.data.value as any,
    },
  }).catch(() => {});

  return NextResponse.json(record);
}
