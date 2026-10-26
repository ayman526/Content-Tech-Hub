import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateLayoutHtmlFromStructured,
  isRtlLanguage,
  type PdfStructured,
} from "@/lib/pdf-pipeline";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      jobTranslations: true,
      project: {
        include: {
          documents: {
            include: {
              segments: { orderBy: { segmentIndex: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const translationMap = new Map<string, string>(
    (job as any).jobTranslations.map((jt: any) => [jt.segmentId, jt.translatedText])
  );

  const targetLanguage = job.targetLanguage;
  const rtl = isRtlLanguage(targetLanguage);

  const allSegments = job.project.documents.flatMap((doc: any) =>
    doc.segments.map((s: any) => ({
      segmentId: s.id,
      sourceText: s.sourceText as string,
      translatedText: (translationMap.get(s.id) ?? s.translatedText ?? null) as string | null,
      formatHint: (s.formatHint ?? "p") as string,
    }))
  );

  const firstDoc = job.project.documents[0];
  const structuredData = (firstDoc?.structuredData ?? null) as PdfStructured | null;

  const srcToTranslation = new Map<string, string>();
  for (const seg of allSegments) {
    if (seg.translatedText) {
      srcToTranslation.set(seg.sourceText.trim(), seg.translatedText.trim());
    }
  }

  let previewHtml: string;

  if (structuredData && Array.isArray(structuredData.pages) && structuredData.pages.length > 0) {
    previewHtml = await generateLayoutHtmlFromStructured(
      structuredData,
      srcToTranslation,
      targetLanguage
    );
  } else {
    previewHtml = buildSimplePreviewHtml({
      segments: allSegments,
      documentTitle: job.project.name,
      rtl,
    });
  }

  return new NextResponse(previewHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "no-store",
    },
  });
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSimplePreviewHtml(opts: {
  segments: Array<{ sourceText: string; translatedText: string | null; formatHint: string }>;
  documentTitle: string;
  rtl: boolean;
}): string {
  const { segments, documentTitle, rtl } = opts;
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";

  function renderSeg(s: { sourceText: string; translatedText: string | null; formatHint: string }): string {
    const text = (s.translatedText ?? s.sourceText).trim();
    if (!text) return "";
    const safe = esc(text);
    switch (s.formatHint) {
      case "h1": return `<h1>${safe}</h1>`;
      case "h2": return `<h2>${safe}</h2>`;
      case "h3": return `<h3>${safe}</h3>`;
      case "li": return `<li>${safe}</li>`;
      case "td": return `<div class="td">${safe}</div>`;
      default:   return `<p>${safe}</p>`;
    }
  }

  let body = segments.map(renderSeg).join("\n");
  body = body.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`);

  const fontFamily = rtl
    ? "'Noto Sans Arabic','Arial Unicode MS',Arial,sans-serif"
    : "'Helvetica Neue',Arial,sans-serif";

  return `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${esc(documentTitle)}</title>
<style>
body{font-family:${fontFamily};font-size:12pt;line-height:1.75;color:#1a2e3a;background:#f0f2f5;margin:0;padding:0;direction:${dir};}
.wrap{max-width:750px;margin:0 auto;padding:48px 32px;background:white;min-height:100vh;box-shadow:0 0 20px rgba(0,0,0,.08);}
h1{font-size:1.8em;margin:0 0 20px;color:#33475B;text-align:${align};}
h2{font-size:1.4em;margin:24px 0 12px;color:#33475B;text-align:${align};}
h3{font-size:1.15em;margin:18px 0 8px;color:#33475B;text-align:${align};}
p{margin:0 0 12px;text-align:${rtl ? "right" : "justify"};}
ul{padding-${rtl ? "right" : "left"}:24px;margin:8px 0 16px;}
li{margin-bottom:6px;text-align:${align};}
.td{background:#f0f4f7;padding:6px 10px;border-radius:4px;margin-bottom:4px;font-size:.95em;}
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}
