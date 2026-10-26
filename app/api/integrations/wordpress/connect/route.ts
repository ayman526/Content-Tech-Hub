import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { WordpressRestClient, PolylangAdapter, createAdapter, generateWebhookSecret } from "@/lib/wordpress-client";
import { authenticateApiKey } from "@/lib/api-auth";
import dns from "dns";

// ─── SSRF guard ───────────────────────────────────────────────────────────────
function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const LOOPBACK = /^127\./;
  const PRIVATE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
  const LINK_LOCAL = /^169\.254\./;
  const METADATA = /^100\.64\./;
  return LOOPBACK.test(ip) || PRIVATE.test(ip) || LINK_LOCAL.test(ip) || METADATA.test(ip) || ip === "0.0.0.0";
}

async function validateSiteUrl(raw: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim().replace(/\/$/, ""));
  } catch {
    return { ok: false, error: "siteUrl is not a valid URL." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "siteUrl must use http or https." };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "::1") {
    return { ok: false, error: "siteUrl must not point to a loopback address." };
  }
  if (isPrivateIp(host)) {
    return { ok: false, error: "siteUrl must not point to a private network address." };
  }
  try {
    const { address } = await dns.promises.lookup(host, { family: 4 });
    if (isPrivateIp(address)) {
      return { ok: false, error: "siteUrl resolves to a private network address." };
    }
  } catch {
    return { ok: false, error: "Could not resolve the hostname. Check the URL and try again." };
  }
  return { ok: true, url: parsed.origin };
}

export async function POST(req: NextRequest) {
  // ── Plugin API key auth path ──────────────────────────────────────────────
  // The companion WordPress plugin calls this endpoint to obtain the webhook secret
  // after the dashboard user has already set up the connection. It authenticates
  // using a ctk_live_* API key generated in Dashboard → Settings → API Keys.
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ctk_live_")) {
    return handlePluginConnect(req);
  }

  // ── Dashboard session auth path ───────────────────────────────────────────
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId  = (session.user as any).organizationId;
  const userId = (session.user as any).id;

  // Plan gating
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan." }, { status: 403 });
  }

  const { siteUrl, username, appPassword } = await req.json();
  if (!siteUrl?.trim() || !username?.trim() || !appPassword?.trim())
    return NextResponse.json({ error: "siteUrl, username, and appPassword are required" }, { status: 400 });

  const urlCheck = await validateSiteUrl(siteUrl);
  if (!urlCheck.ok) {
    const { error: urlError } = urlCheck as { ok: false; error: string };
    return NextResponse.json({ error: urlError }, { status: 400 });
  }
  const normalizedUrl = (urlCheck as { ok: true; url: string }).url;

  let pluginId = "WPML";
  let languages: any[] = [];
  let polylangRestApiMissing = false;
  try {
    const client = new WordpressRestClient(normalizedUrl, username.trim(), appPassword.trim());
    await client.get("/wp/v2/types");
    const adapter = await createAdapter(client);
    pluginId = adapter.pluginId;
    try { languages = await adapter.listLanguages(); } catch { /* optional */ }
    if (pluginId === "Polylang") {
      polylangRestApiMissing = !(await (adapter as PolylangAdapter).probeRestApiExtension());
    }
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("Forbidden"))
      return NextResponse.json({ error: "Authentication failed. Check your username and Application Password." }, { status: 400 });
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("fetch failed"))
      return NextResponse.json({ error: "Could not reach the WordPress site. Check the URL and ensure the REST API is enabled." }, { status: 400 });
    return NextResponse.json({ error: `WordPress error: ${msg}` }, { status: 400 });
  }

  const encryptedAppPassword = encrypt(appPassword.trim());
  const webhookSecret = generateWebhookSecret();

  const initialSiteProfile = pluginId === "Polylang"
    ? { polylangRestApiMissing, languages }
    : undefined;

  const conn = await prisma.wordpressConnection.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      siteUrl: normalizedUrl,
      username: username.trim(),
      encryptedAppPassword,
      multilingualPlugin: pluginId,
      webhookSecret,
      connectedByUserId: userId,
      ...(initialSiteProfile ? { siteProfile: initialSiteProfile } : {}),
    },
    update: {
      siteUrl: normalizedUrl,
      username: username.trim(),
      encryptedAppPassword,
      multilingualPlugin: pluginId,
      connectedByUserId: userId,
      connectedAt: new Date(),
      ...(initialSiteProfile ? { siteProfile: initialSiteProfile } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    connection: { siteUrl: conn.siteUrl, multilingualPlugin: conn.multilingualPlugin },
    detectedPlugin: pluginId,
    polylangBeta: pluginId === "Polylang",
    polylangRestApiMissing,
    languages,
    webhookSecret: conn.webhookSecret,
  });
}

/**
 * Plugin-facing connect path.
 * The WP plugin sends: POST /api/integrations/wordpress/connect
 *   Authorization: Bearer ctk_live_<key>
 *   Body: { siteUrl, pluginVersion }
 *
 * Returns { webhookSecret } so the plugin can store it for signing outbound webhooks.
 * The key is validated against the ApiKey table (Dashboard → Settings → API Keys).
 */
async function handlePluginConnect(req: NextRequest): Promise<NextResponse> {
  const keyRecord = await authenticateApiKey(req);
  if (!keyRecord) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const conn = await prisma.wordpressConnection.findUnique({
    where: { organizationId: keyRecord.organizationId },
    select: {
      webhookSecret: true,
      organization: { select: { plan: true } },
    },
  });

  if (!conn) return NextResponse.json({ error: "No WordPress connection found for this organisation" }, { status: 404 });
  if (!(await hasFeature(conn.organization.plan, "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const pluginVersion = typeof body.pluginVersion === "string" ? body.pluginVersion.trim() : null;

  if (pluginVersion) {
    await prisma.wordpressConnection.update({
      where: { organizationId: keyRecord.organizationId },
      data: { pluginVersion },
    });
  }

  return NextResponse.json({
    ok: true,
    webhookSecret: conn.webhookSecret,
  });
}
