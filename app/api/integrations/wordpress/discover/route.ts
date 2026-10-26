import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWPClient, PolylangAdapter } from "@/lib/wordpress-client";
import { getWpAuthContext } from "@/lib/wordpress-plugin-auth";

export async function GET(req: NextRequest) {
  const ctx = await getWpAuthContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = ctx.orgId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  // Plugin-auth callers only need language info — skip the expensive post-count discovery
  // to keep the settings-page connectivity test fast.
  if (ctx.isPluginAuth) {
    return getLanguagesOnly(orgId);
  }

  try {
    const { adapter, conn } = await getWPClient(orgId);

    const [languages, postTypes] = await Promise.all([
      adapter.listLanguages(),
      adapter.listPostTypes(),
    ]);

    const SYSTEM_TYPES = new Set([
      "attachment", "revision", "nav_menu_item", "custom_css", "customize_changeset",
      "oembed_cache", "user_request", "wp_block", "wp_template", "wp_template_part",
      "wp_global_styles", "wp_navigation",
    ]);
    const filteredTypes = postTypes.filter((pt) => !SYSTEM_TYPES.has(pt.slug));

    const counts: Record<string, number> = {};
    const BATCH = 5;
    for (let i = 0; i < filteredTypes.length; i += BATCH) {
      const batch = filteredTypes.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (pt) => {
          try {
            const res = await adapter.listPosts(pt.slug, 1, 1, conn.sourceLanguage || undefined);
            counts[pt.slug] = res.total;
          } catch {
            counts[pt.slug] = 0;
          }
        })
      );
    }

    const typesWithCounts = filteredTypes.map((pt) => ({ ...pt, count: counts[pt.slug] ?? 0 }));

    let polylangRestApiMissing: boolean | undefined;
    if (adapter.pluginId === "Polylang") {
      polylangRestApiMissing = !(await (adapter as PolylangAdapter).probeRestApiExtension());
    }

    const siteProfile = {
      languages,
      postTypes: typesWithCounts,
      detectedPlugin: adapter.pluginId,
      discoveredAt: new Date().toISOString(),
      ...(polylangRestApiMissing !== undefined ? { polylangRestApiMissing } : {}),
    };

    await prisma.wordpressConnection.update({
      where: { organizationId: orgId },
      data: { siteProfile: JSON.parse(JSON.stringify(siteProfile)) },
    });

    return NextResponse.json(siteProfile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to discover site" }, { status: 500 });
  }
}

/**
 * Lightweight language response for plugin-auth callers.
 * Returns { sourceLanguage, targetLanguages } from the stored connection record
 * so the plugin can populate its target-language multi-select without a full
 * WP REST API round-trip (which would require WP admin credentials).
 */
async function getLanguagesOnly(orgId: string): Promise<NextResponse> {
  const conn = await prisma.wordpressConnection.findUnique({
    where: { organizationId: orgId },
    select: { sourceLanguage: true, targetLanguages: true, siteProfile: true },
  });
  if (!conn) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  // Build language list from siteProfile if available, otherwise fall back to codes only.
  const profileLangs: any[] = (conn.siteProfile as any)?.languages ?? [];
  const targetCodes: string[] = (conn.targetLanguages as string[]) ?? [];

  const targetLanguages = targetCodes.map((code) => {
    const lang = profileLangs.find((l: any) => l.code === code || l.locale === code);
    return { code, name: lang?.name ?? lang?.nativeName ?? code };
  });

  return NextResponse.json({
    sourceLanguage: conn.sourceLanguage,
    targetLanguages,
  });
}
