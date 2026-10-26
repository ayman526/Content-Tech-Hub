/**
 * LLM Routing Engine
 * Evaluates routing rules in priority order and returns an explainability object.
 */

import { prisma } from "@/lib/prisma";

export interface RoutingRequest {
  sourceLang: string;
  targetLang: string;
  domain?: string;
  region?: string;
  documentType?: string;
  estimatedTokens?: number;
  priorityMode?: "quality" | "speed" | "cost";
  clientTier?: string;
  humanReview?: boolean;
  terminologyStrictness?: "strict" | "flexible" | "none";
  dataResidency?: string;
}

export interface ModelOption {
  id: string;
  displayName: string;
  apiModelId: string;
  internalKey: string;
  providerId: string;
  providerName: string;
  qualityTier: string;
  costTier: string;
  latencyTier: string;
  status: string;
  contextWindow: number | null;
}

export interface RoutingDecision {
  matchedRule: string | null;
  matchedRuleId: string | null;
  matchReason: string;
  primaryModel: ModelOption | null;
  fallbackChain: ModelOption[];
  blockedModels: Array<{ model: string; reason: string }>;
  confidence: number;
  policyNotes: string[];
  estimatedCostTier: string | null;
  estimatedLatencyTier: string | null;
  riskFlags: string[];
}

const LANG_GROUPS: Record<string, string[]> = {
  european: ["en", "fr", "de", "es", "it", "pt", "nl", "pl", "sv", "da", "fi", "no", "cs", "hu", "ro"],
  arabic: ["ar", "fa", "ur", "he"],
  cjk: ["zh", "ja", "ko"],
  indic: ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml"],
  rtl: ["ar", "fa", "ur", "he"],
};

function langGroup(lang: string): string[] {
  const groups: string[] = [];
  for (const [g, langs] of Object.entries(LANG_GROUPS)) {
    if (langs.includes(lang.toLowerCase())) groups.push(g);
  }
  return groups;
}

function evaluateCondition(conditions: Record<string, unknown>, req: RoutingRequest): { matches: boolean; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const src = req.sourceLang?.toLowerCase() ?? "";
  const tgt = req.targetLang?.toLowerCase() ?? "";
  const domain = req.domain?.toLowerCase() ?? "";

  const { domains, langPairs, sourceLanguages, targetLanguages, regions, languageGroups,
    tokenMin, tokenMax, clientTiers, priorityModes, documentTypes } = conditions as Record<string, unknown>;

  if (domains && Array.isArray(domains) && domains.length > 0) {
    if (domains.includes(domain)) {
      score += 10;
      reasons.push(`Domain matches [${domain}]`);
    } else {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (langPairs && Array.isArray(langPairs) && langPairs.length > 0) {
    const pair = `${src}-${tgt}`;
    if (langPairs.includes(pair)) {
      score += 8;
      reasons.push(`Exact language pair match [${pair}]`);
    } else {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (sourceLanguages && Array.isArray(sourceLanguages) && sourceLanguages.length > 0) {
    if (sourceLanguages.includes(src)) {
      score += 5;
      reasons.push(`Source language [${src}]`);
    } else {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (targetLanguages && Array.isArray(targetLanguages) && targetLanguages.length > 0) {
    if (targetLanguages.includes(tgt)) {
      score += 5;
      reasons.push(`Target language [${tgt}]`);
    } else {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (languageGroups && Array.isArray(languageGroups) && languageGroups.length > 0) {
    const srcGroups = langGroup(src);
    const tgtGroups = langGroup(tgt);
    const allGroups = [...new Set([...srcGroups, ...tgtGroups])];
    const matched = (languageGroups as string[]).some((g: string) => allGroups.includes(g));
    if (matched) {
      score += 4;
      reasons.push(`Language group match`);
    } else {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (tokenMin !== undefined && req.estimatedTokens !== undefined) {
    if (req.estimatedTokens < (tokenMin as number)) return { matches: false, score: 0, reasons: [] };
    score += 3;
    reasons.push(`Token threshold met (>${tokenMin})`);
  }

  if (tokenMax !== undefined && req.estimatedTokens !== undefined) {
    if (req.estimatedTokens > (tokenMax as number)) return { matches: false, score: 0, reasons: [] };
  }

  if (clientTiers && Array.isArray(clientTiers) && clientTiers.length > 0) {
    if (req.clientTier && clientTiers.includes(req.clientTier)) {
      score += 3;
      reasons.push(`Client tier [${req.clientTier}]`);
    } else if (req.clientTier) {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (priorityModes && Array.isArray(priorityModes) && priorityModes.length > 0) {
    if (req.priorityMode && priorityModes.includes(req.priorityMode)) {
      score += 3;
      reasons.push(`Priority mode [${req.priorityMode}]`);
    } else if (req.priorityMode) {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (documentTypes && Array.isArray(documentTypes) && documentTypes.length > 0) {
    if (req.documentType && documentTypes.includes(req.documentType)) {
      score += 4;
      reasons.push(`Document type [${req.documentType}]`);
    } else if (req.documentType) {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  if (regions && Array.isArray(regions) && req.region && regions.length > 0) {
    if (regions.includes(req.region)) {
      score += 2;
      reasons.push(`Region [${req.region}]`);
    } else {
      return { matches: false, score: 0, reasons: [] };
    }
  }

  return { matches: true, score, reasons };
}

function modelToOption(model: {
  id: string; displayName: string; apiModelId: string; internalKey: string;
  providerId: string; qualityTier: string; costTier: string; latencyTier: string;
  status: string; contextWindow: number | null;
  provider: { name: string };
}): ModelOption {
  return {
    id: model.id,
    displayName: model.displayName,
    apiModelId: model.apiModelId,
    internalKey: model.internalKey,
    providerId: model.providerId,
    providerName: model.provider.name,
    qualityTier: model.qualityTier,
    costTier: model.costTier,
    latencyTier: model.latencyTier,
    status: model.status,
    contextWindow: model.contextWindow,
  };
}

function isModelUsable(model: { status: string; contextWindow: number | null }, req: RoutingRequest): { ok: boolean; reason?: string } {
  if (["disabled", "retired"].includes(model.status)) return { ok: false, reason: `Model status: ${model.status}` };
  if (model.status === "deprecated") return { ok: false, reason: "Model is deprecated" };
  if (req.estimatedTokens && model.contextWindow && req.estimatedTokens > model.contextWindow) {
    return { ok: false, reason: `Context window (${model.contextWindow}) too small for ~${req.estimatedTokens} tokens` };
  }
  return { ok: true };
}

export async function simulateRouting(req: RoutingRequest): Promise<RoutingDecision> {
  const [rules, allModels] = await Promise.all([
    prisma.llmRoutingRule.findMany({
      where: { enabled: true },
      orderBy: { priority: "asc" },
      include: {
        primaryModel: { include: { provider: { select: { name: true, status: true } } } },
        secondaryModel: { include: { provider: { select: { name: true, status: true } } } },
        tertiaryModel: { include: { provider: { select: { name: true, status: true } } } },
      },
    }),
    prisma.aiModel.findMany({
      where: { status: { notIn: ["disabled", "retired"] } },
      include: { provider: { select: { name: true, status: true } } },
      orderBy: [{ qualityTier: "desc" }, { costTier: "asc" }],
    }),
  ]);

  const blocked: Array<{ model: string; reason: string }> = [];
  const policyNotes: string[] = [];
  const riskFlags: string[] = [];

  let matchedRule: { id: string; name: string; description?: string | null; conditions: unknown; primaryModel: unknown; secondaryModel: unknown; tertiaryModel: unknown; policy: unknown } | null = null;
  let matchReasons: string[] = [];

  for (const rule of rules) {
    const conditions = (rule.conditions as Record<string, unknown>) ?? {};
    const { matches, reasons } = evaluateCondition(conditions, req);
    if (matches) {
      matchedRule = rule as typeof matchedRule;
      matchReasons = reasons;
      break;
    }
  }

  let primaryModel: ModelOption | null = null;
  const fallbackChain: ModelOption[] = [];

  const resolveModel = (raw: unknown): ModelOption | null => {
    if (!raw) return null;
    const m = raw as { id: string; displayName: string; apiModelId: string; internalKey: string; providerId: string; qualityTier: string; costTier: string; latencyTier: string; status: string; contextWindow: number | null; provider: { name: string; status: string } };
    if (m.provider.status !== "active") {
      blocked.push({ model: m.displayName, reason: "Provider is inactive" });
      return null;
    }
    const usable = isModelUsable(m, req);
    if (!usable.ok) {
      blocked.push({ model: m.displayName, reason: usable.reason ?? "Unusable" });
      return null;
    }
    return modelToOption(m);
  };

  if (matchedRule) {
    primaryModel = resolveModel(matchedRule.primaryModel);
    const sec = resolveModel(matchedRule.secondaryModel);
    const ter = resolveModel(matchedRule.tertiaryModel);
    if (sec) fallbackChain.push(sec);
    if (ter) fallbackChain.push(ter);

    const policy = (matchedRule.policy as Record<string, unknown>) ?? {};
    if (policy.terminologyMode) policyNotes.push(`Terminology mode: ${policy.terminologyMode}`);
    if (policy.styleGuideMode) policyNotes.push(`Style guide mode: ${policy.styleGuideMode}`);
    if (policy.retryBehavior) policyNotes.push(`Retry: ${policy.retryBehavior}`);
  }

  if (!primaryModel && matchedRule) {
    riskFlags.push("Primary model from matched rule is unavailable — will attempt fallback");
    if (fallbackChain.length > 0) {
      primaryModel = fallbackChain.shift()!;
      riskFlags.push(`Using fallback model: ${primaryModel.displayName}`);
    }
  }

  if (!primaryModel) {
    policyNotes.push("No matched rule or rule models unavailable — applying global default policy");
    const candidates = allModels.filter((m: { status: string; contextWindow: number | null; provider: { status: string } }) => {
      if (m.provider.status !== "active") return false;
      return isModelUsable(m, req).ok;
    });
    if (req.priorityMode === "quality") {
      candidates.sort((a: { qualityTier: string }, b: { qualityTier: string }) => {
        const order = { flagship: 3, advanced: 2, standard: 1 };
        return (order[b.qualityTier as keyof typeof order] ?? 0) - (order[a.qualityTier as keyof typeof order] ?? 0);
      });
    } else if (req.priorityMode === "cost") {
      candidates.sort((a: { costTier: string }, b: { costTier: string }) => {
        const order = { low: 3, medium: 2, premium: 1 };
        return (order[a.costTier as keyof typeof order] ?? 0) - (order[b.costTier as keyof typeof order] ?? 0);
      });
    } else if (req.priorityMode === "speed") {
      candidates.sort((a: { latencyTier: string }, b: { latencyTier: string }) => {
        const order = { fast: 3, balanced: 2, "high-quality": 1 };
        return (order[a.latencyTier as keyof typeof order] ?? 0) - (order[b.latencyTier as keyof typeof order] ?? 0);
      });
    }
    if (candidates.length > 0) {
      primaryModel = modelToOption(candidates[0] as Parameters<typeof modelToOption>[0]);
      candidates.slice(1, 3).forEach((m: Parameters<typeof modelToOption>[0]) => fallbackChain.push(modelToOption(m)));
    }
  }

  if (!matchedRule) riskFlags.push("No routing rule matched — using global default selection");

  const confidence = matchedRule
    ? Math.min(95, 60 + matchReasons.length * 8)
    : 30;

  return {
    matchedRule: matchedRule?.name ?? null,
    matchedRuleId: matchedRule?.id ?? null,
    matchReason: matchedRule
      ? `Rule "${matchedRule.name}" matched: ${matchReasons.join("; ")}`
      : "No rule matched — global default policy applied",
    primaryModel,
    fallbackChain,
    blockedModels: blocked,
    confidence,
    policyNotes,
    estimatedCostTier: primaryModel?.costTier ?? null,
    estimatedLatencyTier: primaryModel?.latencyTier ?? null,
    riskFlags,
  };
}
