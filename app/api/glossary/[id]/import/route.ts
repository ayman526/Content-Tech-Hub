import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface GlossaryRow {
  term: string;
  translation: string;
  definition?: string;
  notes?: string;
}

function parseCsv(csv: string): GlossaryRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const results: GlossaryRow[] = [];
  const isHeader = lines[0]?.toLowerCase().match(/term|source/);
  const start = isHeader ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].match(/("(?:[^"]|"")*"|[^,\t]+)(?:[,\t]|$)/g);
    if (!parts || parts.length < 2) continue;
    const clean = (s: string) =>
      s.replace(/^[,\t]|[,\t]$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();
    const term = clean(parts[0]);
    const translation = clean(parts[1]);
    const definition = parts[2] ? clean(parts[2]) : undefined;
    const notes = parts[3] ? clean(parts[3]) : undefined;
    if (term && translation) results.push({ term, translation, definition, notes });
  }
  return results;
}

async function parseXlsx(buf: Buffer): Promise<GlossaryRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  const results: GlossaryRow[] = [];
  const first = String(rows[0]?.[0] ?? "").toLowerCase();
  const start = first.includes("term") || first.includes("source") ? 1 : 0;
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const term = String(row?.[0] ?? "").trim();
    const translation = String(row?.[1] ?? "").trim();
    const definition = row?.[2] ? String(row[2]).trim() : undefined;
    const notes = row?.[3] ? String(row[3]).trim() : undefined;
    if (term && translation) results.push({ term, translation, definition, notes });
  }
  return results;
}

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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let terms: GlossaryRow[] = [];

  if (fileName.endsWith(".csv") || fileName.endsWith(".tsv") || fileName.endsWith(".txt")) {
    terms = parseCsv(await file.text());
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const buf = Buffer.from(await file.arrayBuffer());
    terms = await parseXlsx(buf);
  } else {
    return NextResponse.json(
      { error: "Unsupported file type. Supported: .csv, .xlsx" },
      { status: 400 }
    );
  }

  if (terms.length === 0)
    return NextResponse.json({ error: "No valid terms found in file" }, { status: 400 });

  const created = await prisma.$transaction(
    terms.slice(0, 2000).map((t) =>
      prisma.glossaryTerm.create({
        data: {
          glossaryId: id,
          term: t.term,
          translations: { default: t.translation },
          definition: t.definition,
          notes: t.notes,
        },
      })
    )
  );

  await prisma.glossary.update({
    where: { id },
    data: { termCount: { increment: created.length } },
  });

  return NextResponse.json({ imported: created.length });
}
