import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [providers, models, rules, recentChecks] = await Promise.all([
    prisma.aiProvider.findMany({
      select: { id: true, name: true, type: true, status: true, environment: true, _count: { select: { models: true } } },
    }),
    prisma.aiModel.groupBy({ by: ["status"], _count: true }),
    prisma.llmRoutingRule.findMany({
      where: { enabled: true },
      select: {
        id: true, name: true, priority: true,
        primaryModelId: true, primaryModel: { select: { id: true, status: true, displayName: true } },
        secondaryModelId: true, secondaryModel: { select: { id: true, status: true, displayName: true } },
        tertiaryModelId: true, tertiaryModel: { select: { id: true, status: true, displayName: true } },
      },
    }),
    prisma.llmHealthCheck.findMany({
      orderBy: { checkedAt: "desc" },
      take: 50,
      include: {
        provider: { select: { name: true, type: true } },
        model: { select: { displayName: true } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(models.map((m: { status: string; _count: number }) => [m.status, m._count]));
  const activeProviders = providers.filter((p: { status: string }) => p.status === "active").length;
  const inactiveProviders = providers.filter((p: { status: string }) => p.status !== "active").length;

  const warnings: string[] = [];
  const brokenRules: typeof rules = [];

  for (const rule of rules) {
    const badStatuses = ["disabled", "retired", "deprecated"];
    const issues: string[] = [];
    if (rule.primaryModelId && rule.primaryModel && badStatuses.includes(rule.primaryModel.status)) {
      issues.push(`Primary model "${rule.primaryModel.displayName}" is ${rule.primaryModel.status}`);
    }
    if (!rule.primaryModelId) issues.push("No primary model assigned");
    if (issues.length > 0) {
      brokenRules.push(rule);
      issues.forEach(i => warnings.push(`Rule "${rule.name}": ${i}`));
    }
  }

  const inactiveProviderNames = providers
    .filter((p: { status: string }) => p.status !== "active")
    .map((p: { name: string }) => p.name);
  if (inactiveProviderNames.length > 0) {
    warnings.push(`Inactive providers: ${inactiveProviderNames.join(", ")}`);
  }

  const recentByProvider: Record<string, typeof recentChecks[number][]> = {};
  for (const chk of recentChecks) {
    if (!recentByProvider[chk.providerId]) recentByProvider[chk.providerId] = [];
    recentByProvider[chk.providerId].push(chk);
  }

  const providerLatest = Object.entries(recentByProvider).map(([pid, checks]) => ({
    providerId: pid,
    providerName: checks[0].provider.name,
    providerType: checks[0].provider.type,
    latestStatus: checks[0].status,
    latestLatencyMs: checks[0].latencyMs,
    checkedAt: checks[0].checkedAt,
    recentFailures: checks.filter((c: { status: string }) => c.status === "failed").length,
  }));

  return NextResponse.json({
    summary: {
      activeProviders,
      inactiveProviders,
      totalModels: Object.values(statusMap).reduce((a: number, b: unknown) => a + (b as number), 0),
      productionModels: (statusMap["production"] ?? 0) + (statusMap["approved"] ?? 0),
      deprecatedModels: statusMap["deprecated"] ?? 0,
      retiredModels: statusMap["retired"] ?? 0,
      disabledModels: statusMap["disabled"] ?? 0,
      draftModels: statusMap["draft"] ?? 0,
      betaModels: statusMap["beta"] ?? 0,
      totalRules: rules.length,
      brokenRules: brokenRules.length,
    },
    modelsByStatus: statusMap,
    warnings,
    providerHealth: providerLatest,
    recentChecks: recentChecks.slice(0, 20),
  });
}
