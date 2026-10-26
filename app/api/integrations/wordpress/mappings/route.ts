import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  const mappings = await prisma.wordpressMapping.findMany({
    where: { organizationId: orgId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(mappings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  // Enforce plan gating
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan." }, { status: 403 });
  }

  const {
    postType, postTypeName,
    includeTitle, includeContent, includeExcerpt, includeAcf,
    includeYoast, includeSlug, includeMenus, targetStatus, workflowType,
  } = await req.json();

  if (!postType) return NextResponse.json({ error: "postType required" }, { status: 400 });

  const mapping = await prisma.wordpressMapping.upsert({
    where: { organizationId_postType: { organizationId: orgId, postType } },
    create: {
      organizationId: orgId,
      postType,
      postTypeName: postTypeName ?? postType,
      includeTitle: includeTitle ?? true,
      includeContent: includeContent ?? true,
      includeExcerpt: includeExcerpt ?? false,
      includeAcf: includeAcf ?? false,
      includeYoast: includeYoast ?? false,
      includeSlug: includeSlug ?? false,
      includeMenus: includeMenus ?? false,
      targetStatus: targetStatus ?? "DRAFT",
      workflowType: workflowType ?? "AI_HUMAN",
    },
    update: {
      postTypeName: postTypeName ?? postType,
      includeTitle: includeTitle ?? true,
      includeContent: includeContent ?? true,
      includeExcerpt: includeExcerpt ?? false,
      includeAcf: includeAcf ?? false,
      includeYoast: includeYoast ?? false,
      includeSlug: includeSlug ?? false,
      ...(includeMenus !== undefined && { includeMenus }),
      ...(targetStatus !== undefined && { targetStatus }),
      workflowType: workflowType ?? "AI_HUMAN",
    },
  });

  return NextResponse.json(mapping);
}
