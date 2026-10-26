import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bell, Star, Briefcase, Clock, DollarSign } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getServerTranslation } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const NOTIF_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  PREFERRED_JOB:     { icon: Star,      color: "bg-gold/10 text-gold" },
  NEW_JOB:           { icon: Briefcase, color: "bg-navy/10 text-navy" },
  DEADLINE_REMINDER: { icon: Clock,     color: "bg-red-100 text-red-600" },
  PAYMENT:           { icon: DollarSign,color: "bg-teal/10 text-teal" },
  SYSTEM:            { icon: Bell,      color: "bg-gray-100 text-gray-500" },
};

export default async function PortalNotificationsPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const { t } = await getServerTranslation();

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t("notifications.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unreadCount} {t("notifications.new")}</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Bell className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">{t("notifications.noNotifications")}</h3>
          <p className="text-sm text-gray-500">{t("notifications.noNotificationsDesc")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50">
          {notifications.map((notif: any) => {
            const config = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.SYSTEM;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`flex gap-4 p-4 ${!notif.isRead ? "bg-navy/5" : ""}`}
                data-testid={`notif-${notif.id}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{formatDate(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
