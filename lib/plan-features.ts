/**
 * Platform Feature Flags
 *
 * Defines the canonical list of platform features that can be toggled
 * per subscription plan by an admin. Each feature has a key, display
 * metadata, and a fallback default per plan slug (used when no DB row
 * exists yet — preserves existing behaviour during the migration).
 *
 * planSlug values correspond to lowercase Organisation.plan enum values:
 *   starter | professional | agency | enterprise
 */

import { prisma } from "@/lib/prisma";

export const PLAN_SLUGS = ["starter", "professional", "agency", "enterprise"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const PLAN_LABELS: Record<PlanSlug, string> = {
  starter: "Starter",
  professional: "Professional",
  agency: "Agency",
  enterprise: "Enterprise",
};

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
  defaults: Record<PlanSlug, boolean>;
}

export const PLATFORM_FEATURES: FeatureDef[] = [
  {
    key: "wordpress_integration",
    label: "WordPress Integration",
    description: "Connect and sync WordPress sites for translation",
    defaults: { starter: false, professional: false, agency: true, enterprise: true },
  },
  {
    key: "clients_tab",
    label: "Clients Management",
    description: "Access the Clients tab to manage client organisations",
    defaults: { starter: false, professional: false, agency: true, enterprise: true },
  },
  {
    key: "api_keys",
    label: "API Keys",
    description: "Generate and manage API keys for external integrations",
    defaults: { starter: false, professional: true, agency: true, enterprise: true },
  },
  {
    key: "webhooks",
    label: "Webhooks",
    description: "Receive real-time event notifications via webhooks",
    defaults: { starter: false, professional: false, agency: true, enterprise: true },
  },
  {
    key: "pdf_pipeline",
    label: "PDF Pipeline",
    description: "Upload and translate PDF documents",
    defaults: { starter: false, professional: false, agency: true, enterprise: true },
  },
  {
    key: "custom_delivery",
    label: "Custom Delivery",
    description: "Configure custom content delivery pipelines",
    defaults: { starter: false, professional: false, agency: true, enterprise: true },
  },
  {
    key: "translation_memory",
    label: "Translation Memory",
    description: "Leverage translation memory for consistent output",
    defaults: { starter: false, professional: true, agency: true, enterprise: true },
  },
  {
    key: "glossary",
    label: "Glossary",
    description: "Manage project-level and global translation glossaries",
    defaults: { starter: true, professional: true, agency: true, enterprise: true },
  },
  {
    key: "advanced_analytics",
    label: "Advanced Analytics",
    description: "Access detailed analytics dashboards and reports",
    defaults: { starter: false, professional: false, agency: true, enterprise: true },
  },
  {
    key: "ocr_requests",
    label: "OCR Requests",
    description: "Process scanned/non-editable documents with optical character recognition and human verification",
    defaults: { starter: false, professional: true, agency: true, enterprise: true },
  },
  {
    key: "priority_support",
    label: "Priority Support",
    description: "24/7 priority support with accelerated SLAs",
    defaults: { starter: false, professional: false, agency: false, enterprise: true },
  },
];

/**
 * Check whether an organisation's plan has access to a feature.
 *
 * Looks up the database first; falls back to the hardcoded default so
 * existing behaviour is preserved before an admin explicitly configures flags.
 */
export async function hasFeature(orgPlan: string, featureKey: string): Promise<boolean> {
  const planSlug = orgPlan.toLowerCase() as PlanSlug;
  try {
    const row = await prisma.planFeature.findUnique({
      where: { feature_planSlug: { feature: featureKey, planSlug } },
    });
    if (row !== null) return row.enabled;
  } catch {
    // DB unavailable — fall through to defaults
  }
  const feat = PLATFORM_FEATURES.find((f) => f.key === featureKey);
  return feat?.defaults[planSlug] ?? false;
}

/**
 * Load all feature flags for a given plan in a single DB query.
 * Returns a map of featureKey → boolean, merging DB values over defaults.
 * Safe to call from server components / layouts.
 */
export async function getOrgFeatureFlags(orgPlan: string): Promise<Record<string, boolean>> {
  const planSlug = orgPlan.toLowerCase() as PlanSlug;
  const flags: Record<string, boolean> = {};

  // Seed defaults first
  for (const feat of PLATFORM_FEATURES) {
    flags[feat.key] = feat.defaults[planSlug] ?? false;
  }

  try {
    const rows = await prisma.planFeature.findMany({ where: { planSlug } });
    for (const row of rows) {
      flags[row.feature] = row.enabled;
    }
  } catch {
    // DB unavailable — return defaults
  }

  return flags;
}
