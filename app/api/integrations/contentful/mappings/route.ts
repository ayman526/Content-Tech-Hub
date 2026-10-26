import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const mappings = await prisma.contentfulMapping.findMany({
    where: { organizationId: orgId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(mappings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { contentTypeId, contentTypeName, translatableFields, workflowType, excludeSlugs } = await req.json();
  if (!contentTypeId) return NextResponse.json({ error: "contentTypeId required" }, { status: 400 });

  const mapping = await prisma.contentfulMapping.upsert({
    where: { organizationId_contentTypeId: { organizationId: orgId, contentTypeId } },
    create: {
      organizationId: orgId,
      contentTypeId,
      contentTypeName: contentTypeName ?? contentTypeId,
      translatableFields: translatableFields ?? [],
      workflowType: workflowType ?? "AI_HUMAN",
      excludeSlugs: excludeSlugs ?? true,
    },
    update: {
      contentTypeName: contentTypeName ?? contentTypeId,
      translatableFields: translatableFields ?? [],
      workflowType: workflowType ?? "AI_HUMAN",
      excludeSlugs: excludeSlugs ?? true,
    },
  });

  return NextResponse.json(mapping);
}
