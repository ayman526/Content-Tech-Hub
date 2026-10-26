import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  const { sourceLanguage, targetLanguages, deliveryMode } = await req.json();

  const conn = await prisma.wordpressConnection.update({
    where: { organizationId: orgId },
    data: {
      ...(sourceLanguage !== undefined && { sourceLanguage }),
      ...(targetLanguages !== undefined && { targetLanguages }),
      ...(deliveryMode !== undefined && { deliveryMode }),
    },
  });

  return NextResponse.json({ ok: true, connection: { sourceLanguage: conn.sourceLanguage, targetLanguages: conn.targetLanguages, deliveryMode: conn.deliveryMode } });
}
