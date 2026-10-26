"use client";

import NotificationBell from "@/components/notifications/notification-bell";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export default function DashboardTopBar({ locale }: { locale?: string }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-end px-6 bg-white border-b border-gray-100"
      style={{ height: "52px" }}
      data-testid="dashboard-topbar"
    >
      <div className="flex items-center gap-1">
        <NotificationBell />
        <LanguageSwitcher compact locale={locale} />
      </div>
    </header>
  );
}
