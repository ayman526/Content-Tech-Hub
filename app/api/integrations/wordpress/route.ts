import { hasFeature } from "@/lib/plan-features";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ connected: false, connection: null, planRequired: true }, { status: 200 });
  }

  const conn = await prisma.wordpressConnection.findUnique({ where: { organizationId: orgId } });
  return NextResponse.json({
    connected: !!conn,
    connection: conn
      ? {
          id: conn.id,
          siteUrl: conn.siteUrl,
          username: conn.username,
          multilingualPlugin: conn.multilingualPlugin,
          sourceLanguage: conn.sourceLanguage,
          targetLanguages: conn.targetLanguages,
          deliveryMode: conn.deliveryMode,
          connectedAt: conn.connectedAt,
          siteProfile: conn.siteProfile,
          pluginVersion: conn.pluginVersion ?? null,
        }
      : null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  await prisma.wordpressConnection.deleteMany({ where: { organizationId: orgId } });
  return NextResponse.json({ ok: true });
}
