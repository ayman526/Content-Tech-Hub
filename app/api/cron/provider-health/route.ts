import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recentFailures = await prisma.llmHealthCheck.findMany({
    where: {
      status: "failed",
      checkedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    include: {
      provider: { select: { name: true, type: true } },
      model: { select: { displayName: true } },
    },
    orderBy: { checkedAt: "desc" },
    take: 10,
  });

  if (recentFailures.length === 0) {
    return NextResponse.json({ ok: true, issues: 0 });
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://contentech.io";
  const latestFailure = recentFailures[0];
  const affectedModels = [...new Set(
    recentFailures.map((f) => f.model?.displayName).filter(Boolean)
  )].slice(0, 3).join(", ") || "Unknown";

  const diagnostics = latestFailure.diagnostics as Record<string, unknown> | null;
  const errorMessage =
    (typeof diagnostics?.error === "string" ? diagnostics.error : null) ??
    (typeof diagnostics?.message === "string" ? diagnostics.message : null) ??
    "Health check failed";

  for (const admin of admins) {
    if (!admin.email) continue;
    notifyAsync({
      eventKey: "system.provider_failure",
      recipients: [{ userId: admin.id, email: admin.email }],
      vars: {
        provider_name: latestFailure.provider?.name ?? "Unknown provider",
        provider_type: latestFailure.provider?.type ?? "unknown",
        error_message: errorMessage,
        failed_at: new Date(latestFailure.checkedAt).toLocaleString(),
        affected_models: affectedModels,
        admin_ai_config_url: `${baseUrl}/admin/ai-models`,
        issue_count: String(recentFailures.length),
      },
      triggeredBy: "cron",
    });
  }

  return NextResponse.json({
    ok: true,
    issues: recentFailures.length,
    notifiedAdmins: admins.length,
  });
}
