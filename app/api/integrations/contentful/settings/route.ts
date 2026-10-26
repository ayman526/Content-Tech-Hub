import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { sourceLocale, targetLocales, deliveryMode } = await req.json();

  const conn = await prisma.contentfulConnection.findUnique({ where: { organizationId: orgId } });
  if (!conn) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  const updated = await prisma.contentfulConnection.update({
    where: { organizationId: orgId },
    data: {
      ...(sourceLocale && { sourceLocale }),
      ...(targetLocales && { targetLocales }),
      ...(deliveryMode && { deliveryMode }),
    },
  });

  return NextResponse.json({ ok: true, connection: updated });
}
