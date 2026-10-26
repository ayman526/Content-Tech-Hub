import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/plan-features";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "CLIENT";

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  const allowed = await hasFeature(org.plan, "ocr_requests");
  if (!allowed) {
    return NextResponse.json(
      { error: "Your plan does not include OCR Requests." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "txt").toLowerCase();
  if (format !== "txt" && format !== "docx") {
    return NextResponse.json(
      { error: "format must be 'txt' or 'docx'" },
      { status: 400 }
    );
  }

  const ocr = await prisma.ocrRequest.findFirst({
    where: { id, organizationId: orgId },
    select: {
      sourceFilename: true,
      extractedText: true,
      verifiedText: true,
      clientAccountId: true,
    },
  });
  if (!ocr) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Member-level ACL: non-elevated users may only access OCR requests for
  // client accounts they have explicit access to. Mirrors the
  // `loadAccessibleRequest` check in /api/ocr-requests/[id]/route.ts so the
  // download endpoint cannot be used to bypass per-member restrictions.
  const isElevated = role === "ADMIN" || role === "OWNER" || role === "AGENCY_OWNER";
  if (!isElevated && ocr.clientAccountId) {
    const access = await prisma.memberClientAccountAccess.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgId,
        clientAccountId: ocr.clientAccountId,
      },
    });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const text = (ocr.verifiedText ?? ocr.extractedText ?? "").trim();
  const baseName = ocr.sourceFilename.replace(/\.[^.]+$/, "") || "ocr-export";

  if (format === "txt") {
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.txt"`,
      },
    });
  }

  // .docx — paragraphs split on blank lines, lines preserved as soft breaks
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const blocks = text.split(/\n{2,}/);
  const paragraphs = blocks.map((block) => {
    const lines = block.split(/\n/);
    const runs = lines.flatMap((line, i) =>
      i === 0
        ? [new TextRun({ text: line })]
        : [new TextRun({ text: line, break: 1 })]
    );
    return new Paragraph({ children: runs });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${baseName}.docx"`,
    },
  });
}
