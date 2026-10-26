import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-auth";
import { createHash } from "crypto";

const ALL_PERMISSIONS = [
  "projects:read",
  "projects:write",
  "jobs:read",
  "jobs:write",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: orgId },
    select: {
      id: true, name: true, keyPrefix: true, permissions: true,
      isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { name, permissions, expiresAt } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const validPermissions = (permissions as string[] ?? ALL_PERMISSIONS).filter((p) =>
    ALL_PERMISSIONS.includes(p)
  );

  const rawKey = generateApiKey();
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 16);

  const record = await prisma.apiKey.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      permissions: validPermissions,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Return the full key ONCE — it can never be recovered after this response
  return NextResponse.json({
    id: record.id,
    name: record.name,
    key: rawKey,
    keyPrefix,
    permissions: record.permissions,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  }, { status: 201 });
}
