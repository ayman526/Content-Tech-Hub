import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const SecretSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  orgProjectId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const provider = await prisma.aiProvider.findUnique({ where: { id } });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = SecretSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { apiKey, orgProjectId } = parsed.data;
  const updatedBy = (session.user as { email?: string }).email ?? undefined;

  const secret = await prisma.providerSecret.upsert({
    where: { providerId: id },
    create: {
      providerId: id,
      encryptedKey: encrypt(apiKey),
      keyMasked: "…" + apiKey.slice(-4),
      orgProjectId: orgProjectId ?? null,
      updatedBy: updatedBy ?? null,
      rotatedAt: new Date(),
    },
    update: {
      encryptedKey: encrypt(apiKey),
      keyMasked: "…" + apiKey.slice(-4),
      orgProjectId: orgProjectId ?? null,
      updatedBy: updatedBy ?? null,
      rotatedAt: new Date(),
    },
    select: { id: true, keyMasked: true, orgProjectId: true, rotatedAt: true, updatedBy: true },
  });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: updatedBy ?? null,
      action: "credential_rotated",
      entityType: "provider",
      entityId: id,
      entityName: provider.name,
      after: { keyMasked: secret.keyMasked, rotatedAt: secret.rotatedAt },
    },
  });

  return NextResponse.json(secret);
}
