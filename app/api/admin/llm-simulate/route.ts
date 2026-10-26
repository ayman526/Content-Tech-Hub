import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { simulateRouting } from "@/lib/routing-engine";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const SimSchema = z.object({
  sourceLang: z.string().min(1),
  targetLang: z.string().min(1),
  domain: z.string().optional(),
  region: z.string().optional(),
  documentType: z.string().optional(),
  estimatedTokens: z.number().int().positive().optional(),
  priorityMode: z.enum(["quality", "speed", "cost"]).optional(),
  clientTier: z.string().optional(),
  humanReview: z.boolean().optional(),
  terminologyStrictness: z.enum(["strict", "flexible", "none"]).optional(),
  dataResidency: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sourceLang, targetLang, ...rest } = parsed.data;
  const result = await simulateRouting({ sourceLang, targetLang, ...rest });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "simulation_run",
      entityType: "simulation",
      after: {
        sourceLang,
        targetLang,
        domain: rest.domain ?? null,
        matchedRule: result.matchedRule,
        selectedModel: result.primaryModel?.displayName ?? null,
        confidence: result.confidence,
      } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json(result);
}
