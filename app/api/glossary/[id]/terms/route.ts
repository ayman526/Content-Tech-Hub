import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/glossary/[id]/terms
 * Add a single term manually to a glossary.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const glossary = await prisma.glossary.findUnique({ where: { id } });
  if (!glossary || glossary.organizationId !== orgId)
    return NextResponse.json({ error: "Glossary not found" }, { status: 404 });

  const { term, translation, definition, notes, doNotTranslate, keepUppercase } = await req.json();

  if (!term?.trim())
    return NextResponse.json({ error: "Term is required" }, { status: 400 });

  if (!doNotTranslate && !translation?.trim())
    return NextResponse.json({ error: "Translation is required unless Do Not Translate is enabled" }, { status: 400 });

  const created = await prisma.glossaryTerm.create({
    data: {
      glossaryId: id,
      term: term.trim(),
      translations: translation?.trim() ? { default: translation.trim() } : {},
      definition: definition?.trim() || null,
      notes: notes?.trim() || null,
      doNotTranslate: Boolean(doNotTranslate),
      keepUppercase: Boolean(keepUppercase),
    },
  });

  await prisma.glossary.update({
    where: { id },
    data: { termCount: { increment: 1 } },
  });

  return NextResponse.json(created, { status: 201 });
}

/**
 * DELETE /api/glossary/[id]/terms?termId=xxx
 * Remove a single term from a glossary.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const glossary = await prisma.glossary.findUnique({ where: { id } });
  if (!glossary || glossary.organizationId !== orgId)
    return NextResponse.json({ error: "Glossary not found" }, { status: 404 });

  const termId = req.nextUrl.searchParams.get("termId");
  if (!termId) return NextResponse.json({ error: "termId required" }, { status: 400 });

  await prisma.glossaryTerm.delete({ where: { id: termId } });
  await prisma.glossary.update({
    where: { id },
    data: { termCount: { decrement: 1 } },
  });

  return NextResponse.json({ ok: true });
}
