import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  ACCURACY: "Accuracy",
  TERMINOLOGY: "Terminology",
  GRAMMAR: "Grammar",
  STYLE_TONE: "Style / Tone",
  LOCALE: "Locale",
  FORMATTING_TAGS: "Formatting & Tags",
  CONSISTENCY: "Consistency",
  COMPLIANCE: "Compliance",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  CRITICAL: "Critical",
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#00BDA5",
  MEDIUM: "#FF7A59",
  CRITICAL: "#c0392b",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: { select: { name: true, sourceLanguage: true, targetLanguages: true } },
      linguist: { select: { name: true, email: true } },
      segmentIssues: {
        include: {
          reviewer: { select: { name: true } },
          segment: { select: { segmentIndex: true, sourceText: true, translatedText: true } },
        },
        orderBy: [{ segment: { segmentIndex: "asc" } }, { createdAt: "asc" }],
      },
    },
  });

  if (!job) return new NextResponse("Job not found", { status: 404 });

  const issues = job.segmentIssues;
  const totalSegments = await prisma.translationSegment.count({
    where: { document: { projectId: job.projectId } },
  });

  const segmentsWithIssues = new Set(issues.map((i) => i.segmentId)).size;
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length;
  const lowCount = issues.filter((i) => i.severity === "LOW").length;

  const categoryStats: Record<string, number> = {};
  for (const issue of issues) {
    categoryStats[issue.category] = (categoryStats[issue.category] ?? 0) + 1;
  }

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const issueRows = issues.map((issue) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E8EDF1;text-align:center;font-weight:600;color:#33475B;font-size:13px;">
        ${(issue.segment?.segmentIndex ?? 0) + 1}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8EDF1;font-size:12px;color:#516F90;max-width:200px;">
        <div style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
          ${escapeHtml(issue.segment?.sourceText?.slice(0, 120) ?? "")}${(issue.segment?.sourceText?.length ?? 0) > 120 ? "…" : ""}
        </div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8EDF1;">
        <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#E8F5F8;color:#0091AE;">
          ${escapeHtml(CATEGORY_LABELS[issue.category] ?? issue.category)}
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8EDF1;font-size:12px;color:#516F90;">
        ${escapeHtml(issue.subType)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8EDF1;">
        <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;background:${SEVERITY_COLORS[issue.severity] ?? "#999"};">
          ${escapeHtml(SEVERITY_LABELS[issue.severity] ?? issue.severity)}
        </span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8EDF1;font-size:12px;color:#516F90;font-style:${issue.note ? "normal" : "italic"};">
        ${issue.note ? escapeHtml(issue.note) : "<span style='color:#CBD6E2'>—</span>"}
      </td>
    </tr>
  `).join("");

  const categoryStatsRows = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F5F8FA;font-size:13px;color:#33475B;">${CATEGORY_LABELS[cat] ?? cat}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #F5F8FA;font-size:13px;font-weight:600;color:#0091AE;text-align:center;">${count}</td>
      </tr>
    `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Review Audit Report — ${escapeHtml(job.project?.name ?? jobId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #F5F8FA; color: #33475B; }
    .page { max-width: 960px; margin: 0 auto; background: #fff; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { max-width: 100%; box-shadow: none; }
      @page { margin: 20mm; }
    }
    table { border-collapse: collapse; width: 100%; }
    th { background: #33475B; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; padding: 10px 12px; text-align: left; }
    tr:nth-child(even) td { background: #FAFCFD; }
  </style>
</head>
<body>
  <div class="page">

    <!-- Print button -->
    <div class="no-print" style="background:#33475B;padding:12px 32px;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:#CBD6E2;font-size:13px;">AI Review Audit Report</span>
      <button onclick="window.print()" style="background:#FF7A59;color:#fff;border:none;padding:8px 22px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
        Download / Print PDF
      </button>
    </div>

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#33475B 0%,#2D3E50 100%);padding:40px 40px 32px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin-bottom:4px;">Contentech</div>
          <div style="font-size:12px;color:#99ACC2;letter-spacing:1px;">AI REVIEW AUDIT REPORT</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#99ACC2;margin-bottom:2px;">Report Generated</div>
          <div style="font-size:13px;font-weight:600;color:#CBD6E2;">${reportDate}</div>
        </div>
      </div>
      <div style="height:1px;background:rgba(255,255,255,0.12);margin:24px 0;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
        <div>
          <div style="font-size:10px;color:#99ACC2;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Project</div>
          <div style="font-size:15px;font-weight:700;color:#fff;">${escapeHtml(job.project?.name ?? "N/A")}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#99ACC2;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Language Pair</div>
          <div style="font-size:15px;font-weight:700;color:#fff;">${escapeHtml(job.sourceLanguage)} → ${escapeHtml(job.targetLanguage)}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#99ACC2;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Reviewed By</div>
          <div style="font-size:15px;font-weight:700;color:#fff;">${escapeHtml(job.linguist?.name ?? "—")}</div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div style="padding:32px 40px;">
      <h2 style="font-size:14px;font-weight:700;color:#33475B;text-transform:uppercase;letter-spacing:.8px;margin-bottom:20px;border-bottom:2px solid #F5F8FA;padding-bottom:10px;">
        Executive Summary
      </h2>

      <!-- KPI grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;">
        ${kpiCard("Total Segments", String(totalSegments), "#0091AE")}
        ${kpiCard("Segments with Issues", String(segmentsWithIssues), segmentsWithIssues > 0 ? "#FF7A59" : "#00BDA5")}
        ${kpiCard("Total Issues", String(issues.length), issues.length > 0 ? "#FF7A59" : "#00BDA5")}
        ${kpiCard("Error Rate", totalSegments > 0 ? `${Math.round((segmentsWithIssues / totalSegments) * 100)}%` : "0%", "#33475B")}
      </div>

      <!-- Severity breakdown -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <h3 style="font-size:12px;font-weight:700;color:#33475B;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;">Issues by Severity</h3>
          <div style="border-radius:10px;overflow:hidden;border:1px solid #E8EDF1;">
            <table>
              <tr><td style="padding:10px 16px;font-size:13px;color:#33475B;">Critical</td><td style="padding:10px 16px;text-align:center;"><span style="background:#c0392b;color:#fff;font-weight:700;font-size:12px;padding:2px 12px;border-radius:20px;">${criticalCount}</span></td></tr>
              <tr style="background:#FAFCFD;"><td style="padding:10px 16px;font-size:13px;color:#33475B;">Medium</td><td style="padding:10px 16px;text-align:center;"><span style="background:#FF7A59;color:#fff;font-weight:700;font-size:12px;padding:2px 12px;border-radius:20px;">${mediumCount}</span></td></tr>
              <tr><td style="padding:10px 16px;font-size:13px;color:#33475B;">Low</td><td style="padding:10px 16px;text-align:center;"><span style="background:#00BDA5;color:#fff;font-weight:700;font-size:12px;padding:2px 12px;border-radius:20px;">${lowCount}</span></td></tr>
            </table>
          </div>
        </div>
        <div>
          <h3 style="font-size:12px;font-weight:700;color:#33475B;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;">Issues by Category</h3>
          <div style="border-radius:10px;overflow:hidden;border:1px solid #E8EDF1;">
            ${Object.keys(categoryStats).length === 0
              ? `<div style="padding:20px;text-align:center;font-size:13px;color:#CBD6E2;">No issues flagged</div>`
              : `<table>${categoryStatsRows}</table>`}
          </div>
        </div>
      </div>
    </div>

    <!-- Issue detail table -->
    ${issues.length > 0 ? `
    <div style="padding:0 40px 40px;">
      <h2 style="font-size:14px;font-weight:700;color:#33475B;text-transform:uppercase;letter-spacing:.8px;margin-bottom:16px;border-bottom:2px solid #F5F8FA;padding-bottom:10px;">
        Detailed Issue Log (${issues.length} issue${issues.length !== 1 ? "s" : ""})
      </h2>
      <div style="border-radius:10px;overflow:hidden;border:1px solid #E8EDF1;">
        <table>
          <thead>
            <tr>
              <th style="width:50px;text-align:center;">Seg #</th>
              <th style="width:200px;">Source Excerpt</th>
              <th>Category</th>
              <th>Sub-type</th>
              <th style="width:90px;">Severity</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>${issueRows}</tbody>
        </table>
      </div>
    </div>
    ` : `
    <div style="padding:0 40px 40px;text-align:center;">
      <div style="background:#F0FDF9;border-radius:12px;padding:40px;border:1px solid #B2F0E6;">
        <div style="font-size:32px;margin-bottom:8px;">✓</div>
        <div style="font-size:16px;font-weight:700;color:#00BDA5;margin-bottom:4px;">No issues flagged</div>
        <div style="font-size:13px;color:#516F90;">The AI translation passed review with no errors detected.</div>
      </div>
    </div>
    `}

    <!-- Footer -->
    <div style="background:#1A2E3A;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:11px;color:#516F90;">Generated by Contentech — Enterprise Multilingual Platform</span>
      <span style="font-size:11px;color:#516F90;">Job ID: ${jobId}</span>
    </div>

  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function kpiCard(label: string, value: string, color: string): string {
  return `
    <div style="border-radius:10px;border:1px solid #E8EDF1;padding:18px 20px;text-align:center;">
      <div style="font-size:26px;font-weight:800;color:${color};margin-bottom:4px;">${value}</div>
      <div style="font-size:11px;color:#99ACC2;text-transform:uppercase;letter-spacing:.6px;">${label}</div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
