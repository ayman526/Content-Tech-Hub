import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { getCMAClient } from "@/lib/contentful-client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const userId = (session.user as any).id;

  const { token, spaceId, environmentId = "master" } = await req.json();
  if (!token?.trim() || !spaceId?.trim())
    return NextResponse.json({ error: "token and spaceId are required" }, { status: 400 });

  // Validate token + space by fetching it
  try {
    const client = getCMAClient(token.trim());
    const space = await client.getSpace(spaceId.trim());
    await space.getEnvironment(environmentId);
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes("404") || msg.includes("Not Found"))
      return NextResponse.json({ error: "Space or environment not found. Check your Space ID." }, { status: 400 });
    if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized"))
      return NextResponse.json({ error: "Invalid access token. Ensure it has content management access." }, { status: 400 });
    return NextResponse.json({ error: `Contentful error: ${msg}` }, { status: 400 });
  }

  const encryptedToken = encrypt(token.trim());

  const conn = await prisma.contentfulConnection.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      spaceId: spaceId.trim(),
      environmentId,
      encryptedToken,
      connectedByUserId: userId,
    },
    update: {
      spaceId: spaceId.trim(),
      environmentId,
      encryptedToken,
      connectedByUserId: userId,
      connectedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, connection: { spaceId: conn.spaceId, environmentId: conn.environmentId } });
}
