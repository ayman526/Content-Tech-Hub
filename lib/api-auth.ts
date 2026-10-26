import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type ApiKeyRecord = {
  id: string;
  organizationId: string;
  name: string;
  permissions: string[];
};

/**
 * Authenticate an incoming request via Bearer token (API key).
 * Returns the ApiKey record (without hash) or null if invalid/revoked.
 */
export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyRecord | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("ctk_live_")) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, organizationId: true, name: true, permissions: true, isActive: true, expiresAt: true },
  });

  if (!record || !record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Fire-and-forget: update lastUsedAt
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    permissions: record.permissions as string[],
  };
}

/** Check that the API key has a required permission. */
export function hasPermission(key: ApiKeyRecord, permission: string): boolean {
  return key.permissions.includes(permission) || key.permissions.includes("*");
}

/** Generate a new API key string. Never stored — only the SHA-256 hash is. */
export function generateApiKey(): string {
  const { randomBytes } = require("crypto");
  return "ctk_live_" + randomBytes(24).toString("hex");
}
