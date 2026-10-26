import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/plan-features";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { PLUGIN_VERSION } from "@/lib/wordpress-plugin-version";

const PLUGIN_DIR = path.join(process.cwd(), "wordpress-plugin", "contentech");

/**
 * GET /api/integrations/wordpress/download
 *
 * Supports three authentication modes:
 *  1. Dashboard session (NextAuth) — standard browser download from the dashboard.
 *  2. Bearer token (Authorization: Bearer ctk_live_*) — plugin-initiated download.
 *  3. api_key query param — used by WordPress's built-in auto-update downloader,
 *     which cannot send custom headers.
 */
export async function GET(req: NextRequest) {
  let orgId: string | null = null;

  // ── 1. API key from query param (WordPress auto-update) ─────────────────────
  const queryKey = req.nextUrl.searchParams.get("api_key") ?? "";
  if (queryKey.startsWith("ctk_live_")) {
    const keyHash = createHash("sha256").update(queryKey).digest("hex");
    const record = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { organizationId: true, isActive: true, expiresAt: true },
    });
    if (record?.isActive && !(record.expiresAt && record.expiresAt < new Date())) {
      orgId = record.organizationId;
      prisma.apiKey.update({ where: { keyHash }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }
  }

  // ── 2. Bearer token in Authorization header ──────────────────────────────────
  if (!orgId) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader.startsWith("Bearer ctk_live_")) {
      const rawKey = authHeader.slice(7).trim();
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const record = await prisma.apiKey.findUnique({
        where: { keyHash },
        select: { organizationId: true, isActive: true, expiresAt: true },
      });
      if (record?.isActive && !(record.expiresAt && record.expiresAt < new Date())) {
        orgId = record.organizationId;
        prisma.apiKey.update({ where: { keyHash }, data: { lastUsedAt: new Date() } }).catch(() => {});
      }
    }
  }

  // ── 3. Dashboard session ─────────────────────────────────────────────────────
  if (!orgId) {
    const session = await auth();
    orgId = (session?.user as any)?.organizationId ?? null;
  }

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });
  if (!org || !(await hasFeature(org.plan, "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration is not available on your current plan" }, { status: 403 });
  }

  if (!fs.existsSync(PLUGIN_DIR)) {
    return NextResponse.json({ error: "Plugin files not found" }, { status: 500 });
  }

  try {
    const zip = new AdmZip();
    addDirectoryToZip(zip, PLUGIN_DIR, "contentech");

    const zipBuffer = zip.toBuffer();

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="contentech-${PLUGIN_VERSION}.zip"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[WP Download] Failed to build zip:", err);
    return NextResponse.json({ error: "Failed to package plugin" }, { status: 500 });
  }
}

function addDirectoryToZip(zip: AdmZip, dirPath: string, zipPrefix: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath  = zipPrefix + "/" + entry.name;
    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, zipPath);
    } else {
      zip.addLocalFile(fullPath, path.dirname(zipPath));
    }
  }
}
