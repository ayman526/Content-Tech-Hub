import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

// Warn at three milestones so users get advance notice without daily spam.
// Each window is ±12 h of the milestone to account for cron timing drift.
const WARN_DAYS = [7, 3, 1] as const;
const HALF_DAY_MS = 12 * 60 * 60 * 1000;

function windowFor(daysFromNow: number, now: Date) {
  const centre = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  return {
    gte: new Date(centre.getTime() - HALF_DAY_MS),
    lte: new Date(centre.getTime() + HALF_DAY_MS),
  };
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let notified = 0;
  const results: { keyId: string; keyName: string; daysRemaining: number; adminsNotified: number }[] = [];

  for (const days of WARN_DAYS) {
    const window = windowFor(days, now);

    const expiringKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        expiresAt: window,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            users: {
              where: { role: "ADMIN" },
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    for (const key of expiringKeys) {
      const admins = key.organization.users;
      if (admins.length === 0) continue;

      const expiryDate = key.expiresAt!.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      notifyAsync({
        eventKey: "apikey.expiring_soon",
        recipients: admins.map((u) => ({ userId: u.id, email: u.email, name: u.name ?? undefined })),
        vars: {
          key_name: key.name,
          days_remaining: String(days),
          expiry_date: expiryDate,
          settings_url: "/dashboard/settings#api-keys",
          support_email: "support@contentech.io",
        },
        entityId: key.id,
        entityType: "apiKey",
      });

      notified += admins.length;
      results.push({ keyId: key.id, keyName: key.name, daysRemaining: days, adminsNotified: admins.length });
    }
  }

  return NextResponse.json({ ok: true, notified, keys: results });
}
