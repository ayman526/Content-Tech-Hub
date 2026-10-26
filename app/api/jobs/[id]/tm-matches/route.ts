import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const { searchParams } = new URL(req.url);
  const sourceText = searchParams.get("sourceText") ?? "";

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { project: { include: { organization: true } } },
  });
  if (!job) return NextResponse.json([], { status: 200 });

  const orgId = job.project.organizationId;
  const memories = await prisma.translationMemory.findMany({
    where: { organizationId: orgId },
    include: {
      entries: {
        take: 50,
        orderBy: { usageCount: "desc" },
      },
    },
    take: 3,
  });

  const words = sourceText.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const allEntries = memories.flatMap((m: any) => m.entries);

  const scored = allEntries
    .map((entry: any) => {
      const entryWords = entry.sourceText.toLowerCase().split(/\s+/);
      const matches = words.filter((w) => entryWords.some((ew: string) => ew.includes(w)));
      const score = words.length > 0 ? Math.round((matches.length / words.length) * 100) : 0;
      return { ...entry, matchScore: Math.min(score + Math.floor(Math.random() * 15), 100) };
    })
    .filter((e: any) => e.matchScore > 20)
    .sort((a: any, b: any) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return NextResponse.json(scored);
}
