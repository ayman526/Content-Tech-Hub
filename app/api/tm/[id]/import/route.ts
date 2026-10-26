import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseTmx(xml: string, sourceLang: string, targetLang: string): { sourceText: string; targetText: string }[] {
  const entries: { sourceText: string; targetText: string }[] = [];
  const tuRegex = /<tu[^>]*>([\s\S]*?)<\/tu>/gi;
  let tuMatch: RegExpExecArray | null;
  while ((tuMatch = tuRegex.exec(xml)) !== null) {
    const tuBody = tuMatch[1];
    const tuvRegex = /<tuv[^>]+(?:xml:lang|lang)="([^"]+)"[^>]*>([\s\S]*?)<\/tuv>/gi;
    const langMap: Record<string, string> = {};
    let tuvMatch: RegExpExecArray | null;
    while ((tuvMatch = tuvRegex.exec(tuBody)) !== null) {
      const lang = tuvMatch[1].toUpperCase().slice(0, 2);
      const segMatch = /<seg>([\s\S]*?)<\/seg>/i.exec(tuvMatch[2]);
      if (segMatch) langMap[lang] = segMatch[1].trim();
    }
    const src = sourceLang.toUpperCase().slice(0, 2);
    const tgt = targetLang.toUpperCase().slice(0, 2);
    if (langMap[src] && langMap[tgt]) {
      entries.push({ sourceText: langMap[src], targetText: langMap[tgt] });
    }
  }
  return entries;
}

function parseCsv(csv: string): { sourceText: string; targetText: string }[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const entries: { sourceText: string; targetText: string }[] = [];
  const isHeader = lines[0]?.toLowerCase().includes("source");
  const start = isHeader ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].match(/("(?:[^"]|"")*"|[^,]+)(?:,|$)/g);
    if (!parts || parts.length < 2) continue;
    const clean = (s: string) => s.replace(/^,|,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();
    const src = clean(parts[0]);
    const tgt = clean(parts[1]);
    if (src && tgt) entries.push({ sourceText: src, targetText: tgt });
  }
  return entries;
}

async function parseXlsx(buf: Buffer): Promise<{ sourceText: string; targetText: string }[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  const entries: { sourceText: string; targetText: string }[] = [];
  const start = String(rows[0]?.[0] ?? "").toLowerCase().includes("source") ? 1 : 0;
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const src = String(row?.[0] ?? "").trim();
    const tgt = String(row?.[1] ?? "").trim();
    if (src && tgt) entries.push({ sourceText: src, targetText: tgt });
  }
  return entries;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const tm = await prisma.translationMemory.findUnique({ where: { id } });
  if (!tm || tm.organizationId !== orgId)
    return NextResponse.json({ error: "TM not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let entries: { sourceText: string; targetText: string }[] = [];

  if (fileName.endsWith(".tmx")) {
    entries = parseTmx(await file.text(), tm.sourceLanguage, tm.targetLanguage);
  } else if (fileName.endsWith(".csv") || fileName.endsWith(".tsv") || fileName.endsWith(".txt")) {
    entries = parseCsv(await file.text());
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const buf = Buffer.from(await file.arrayBuffer());
    entries = await parseXlsx(buf);
  } else {
    return NextResponse.json(
      { error: "Unsupported file type. Supported: .tmx, .csv, .xlsx" },
      { status: 400 }
    );
  }

  if (entries.length === 0)
    return NextResponse.json({ error: "No valid entries found in file" }, { status: 400 });

  const created = await prisma.$transaction(
    entries.slice(0, 5000).map((e) =>
      prisma.tmEntry.create({
        data: {
          tmId: id,
          sourceText: e.sourceText,
          targetText: e.targetText,
          createdBy: "import",
          confidence: 1.0,
        },
      })
    )
  );

  await prisma.translationMemory.update({
    where: { id },
    data: { entryCount: { increment: created.length } },
  });

  return NextResponse.json({ imported: created.length });
}
