/**
 * Shared authentication helper for WordPress integration API routes.
 *
 * Routes can be accessed either:
 * 1. Via the Contentech dashboard (NextAuth session auth — regular browser clients)
 * 2. Via the companion WordPress plugin (plugin API key: `ctk_live_*` bearer token)
 *
 * Returns `{ orgId }` on success, or `null` when unauthenticated.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateApiKey } from "@/lib/api-auth";

export interface WpAuthContext {
  orgId: string;
  /** true when authenticated via plugin API key rather than dashboard session */
  isPluginAuth: boolean;
}

export async function getWpAuthContext(req: NextRequest): Promise<WpAuthContext | null> {
  // ── 1. Plugin API key auth (Bearer ctk_live_*) ─────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ctk_live_")) {
    const keyRecord = await authenticateApiKey(req);
    if (!keyRecord) return null;
    return { orgId: keyRecord.organizationId, isPluginAuth: true };
  }

  // ── 2. Dashboard session auth ───────────────────────────────────────────────
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;
  if (!orgId) return null;
  return { orgId, isPluginAuth: false };
}

