"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  FolderOpen,
  CheckSquare,
  CreditCard,
  Shield,
  Server,
  Check,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InAppNotification {
  id: string;
  eventKey: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  read: boolean;
  createdAt: string;
}

function getEventIcon(eventKey: string) {
  if (eventKey.startsWith("project.")) return FolderOpen;
  if (eventKey.startsWith("task.")) return CheckSquare;
  if (eventKey.startsWith("billing.") || eventKey.startsWith("credit.")) return CreditCard;
  if (eventKey.startsWith("security.")) return Shield;
  if (eventKey.startsWith("system.")) return Server;
  return Bell;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${p}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n)));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy" data-testid="text-page-title">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5" data-testid="text-unread-count">
            {unread} unread
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm font-medium text-teal hover:text-navy transition-colors px-4 py-2 rounded-xl border border-teal/30 hover:border-teal/60"
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="mb-4">
        <Link
          href="/dashboard/settings/notifications"
          className="text-sm text-teal hover:underline"
          data-testid="link-notification-preferences"
        >
          Manage notification preferences
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Bell className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No notifications yet</h3>
          <p className="text-sm text-gray-500">
            You will be notified here when there are updates to your projects, tasks, and account.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50">
          {notifications.map((n) => {
            const Icon = getEventIcon(n.eventKey);
            return (
              <div
                key={n.id}
                className={cn("flex gap-4 p-4 transition-colors", !n.isRead && "bg-blue-50/40")}
                data-testid={`notification-item-${n.id}`}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "#F5F8FA" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "#0091AE" }} />
                </div>
                <div className="flex-1 min-w-0">
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => { if (!n.isRead) markRead(n.id); }}
                      className="text-sm font-semibold text-navy hover:text-teal transition-colors"
                      data-testid={`link-notification-${n.id}`}
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-navy">{n.title}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-gray-300 hover:text-teal transition-colors flex-shrink-0 mt-1"
                    title="Mark as read"
                    data-testid={`button-read-${n.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 25 && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 disabled:opacity-40 hover:border-teal/50 transition-colors"
            data-testid="button-prev-page"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page} of {Math.ceil(total / 25)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 25)}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 disabled:opacity-40 hover:border-teal/50 transition-colors"
            data-testid="button-next-page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
