import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function getSession() {
  return auth();
}

/** Extract plain text from an uploaded file (.txt .md .html .json .docx .pdf) */
async function extractText(file: File): Promise<{ text: string; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buf = Buffer.from(await file.arrayBuffer());

  if (["txt", "md", "markdown", "html", "json"].includes(ext)) {
    return { text: buf.toString("utf-8") };
  }

  if (ext === "docx") {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: buf });
      return { text: result.value };
    } catch {
      return { text: "", error: "Could not read DOCX file." };
    }
  }

  if (ext === "pdf") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      const result = await pdfParse(buf);
      return { text: result.text };
    } catch {
      return { text: "", error: "Could not extract text from PDF." };
    }
  }

  return { text: "", error: `Unsupported file type: .${ext}` };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const clientAccountId = searchParams.get("clientAccountId");

  let where: Prisma.StyleGuideWhereInput = { organizationId: orgId };

  if (clientAccountId === "shared") {
    where = { ...where, clientAccountId: null };
  } else if (clientAccountId) {
    where = { ...where, OR: [{ clientAccountId }, { clientAccountId: null }] };
  }

  const memberAccess = await prisma.memberClientAccountAccess.findMany({
    where: { userId, organizationId: orgId },
    select: { clientAccountId: true },
  });

  if (memberAccess.length > 0) {
    const allowedIds = memberAccess.map((a) => a.clientAccountId);
    const memberFilter: Prisma.StyleGuideWhereInput = {
      OR: [{ clientAccountId: { in: allowedIds } }, { clientAccountId: null }],
    };
    where = { ...where, AND: [memberFilter] };
  }

  const guides = await prisma.styleGuide.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, fileName: true, mimeType: true, createdAt: true, updatedAt: true,
      clientAccountId: true, clientAccount: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(guides);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const generatedContent = formData.get("content") as string | null;
  const clientAccountId = formData.get("clientAccountId") as string | null;

  if (clientAccountId) {
    const acct = await prisma.clientAccount.findFirst({ where: { id: clientAccountId, organizationId: orgId } });
    if (!acct) return NextResponse.json({ error: "Invalid client account" }, { status: 400 });
  }

  // AI-generated style guide path (no file — just text + name)
  if (generatedContent && !file) {
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const safeName = name.trim();
    const guide = await prisma.styleGuide.create({
      data: {
        organizationId: orgId,
        name: safeName,
        fileName: `${safeName.toLowerCase().replace(/\s+/g, "-")}.txt`,
        mimeType: "text/plain",
        content: generatedContent,
        ...(clientAccountId ? { clientAccountId } : {}),
      },
    });
    return NextResponse.json(
      { id: guide.id, name: guide.name, fileName: guide.fileName, mimeType: guide.mimeType, createdAt: guide.createdAt },
      { status: 201 }
    );
  }

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ALLOWED = ["txt", "md", "markdown", "html", "json", "docx", "pdf"];
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Supported: .txt, .md, .html, .json, .docx, .pdf" },
      { status: 400 }
    );
  }

  if (file.size > 10_000_000) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const { text, error } = await extractText(file);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!text.trim()) return NextResponse.json({ error: "File is empty or has no extractable text" }, { status: 400 });
  if (text.length > 500_000) {
    return NextResponse.json({ error: "Extracted text too large (max 500K characters)" }, { status: 400 });
  }

  const guide = await prisma.styleGuide.create({
    data: {
      organizationId: orgId,
      name: name ?? file.name.replace(/\.[^.]+$/, ""),
      fileName: file.name,
      mimeType: file.type || `text/${ext}`,
      content: text,
      ...(clientAccountId ? { clientAccountId } : {}),
    },
  });

  return NextResponse.json(
    { id: guide.id, name: guide.name, fileName: guide.fileName, mimeType: guide.mimeType, createdAt: guide.createdAt },
    { status: 201 }
  );
}
