"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  FolderOpen,
  CheckSquare,
  CreditCard,
  Shield,
  Server,
  X,
  Check,
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
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {}
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.notifications?.filter((n: InAppNotification) => !n.isRead).length ?? 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
      setUnreadCount(0);
    } catch {}
  }

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
        data-testid="button-notification-bell"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ background: "#FF7A59" }}
            data-testid="text-unread-count"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute end-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-navy">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-teal hover:underline font-medium"
                  data-testid="button-mark-all-read"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const Icon = getEventIcon(n.eventKey);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "border-b border-gray-50 last:border-0 transition-colors",
                        !n.isRead && "bg-blue-50/40"
                      )}
                      data-testid={`notification-item-${n.id}`}
                    >
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: "#F5F8FA" }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: "#0091AE" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {n.link ? (
                            <Link
                              href={n.link}
                              onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false); }}
                              className="text-xs font-semibold text-navy hover:text-teal transition-colors leading-tight block"
                              data-testid={`link-notification-${n.id}`}
                            >
                              {n.title}
                            </Link>
                          ) : (
                            <p className="text-xs font-semibold text-navy leading-tight">{n.title}</p>
                          )}
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-gray-300 hover:text-teal flex-shrink-0 mt-1"
                            title="Mark as read"
                            data-testid={`button-read-${n.id}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-teal hover:underline"
              data-testid="link-view-all-notifications"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
