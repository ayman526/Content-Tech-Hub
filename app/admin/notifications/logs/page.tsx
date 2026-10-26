"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Filter, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryLog {
  id: string;
  channel: string;
  recipient: string;
  subject?: string | null;
  status: string;
  attempts: number;
  retryCount?: number;
  lastError?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
  template: { eventKey: string; channel: string };
}

const STATUS_STYLES: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  sent: { color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  failed: { color: "text-red-600 bg-red-50", icon: XCircle },
  retrying: { color: "text-orange-600 bg-orange-50", icon: RefreshCw },
  skipped: { color: "text-gray-500 bg-gray-50", icon: Clock },
  pending: { color: "text-yellow-600 bg-yellow-50", icon: Clock },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [eventKeyFilter, setEventKeyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minRetries, setMinRetries] = useState("");

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (eventKeyFilter.trim()) params.set("eventKey", eventKeyFilter.trim());
    if (search.trim()) params.set("recipient", search.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minRetries) params.set("minAttempts", minRetries);

    const res = await fetch(`/api/admin/notification-logs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [statusFilter, channelFilter, eventKeyFilter, search, dateFrom, dateTo, minRetries]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/notifications"
          className="text-gray-400 hover:text-teal transition-colors"
          data-testid="link-back-templates"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy" data-testid="text-page-title">Delivery Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} records total</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal/50"
              data-testid="input-search-logs"
            />
          </div>
          <input
            type="text"
            placeholder="Filter by event key..."
            value={eventKeyFilter}
            onChange={(e) => setEventKeyFilter(e.target.value)}
            className="flex-1 min-w-40 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal/50"
            data-testid="input-event-key-filter"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
              data-testid="select-status-filter"
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="retrying">Retrying</option>
              <option value="skipped">Skipped</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
              data-testid="select-channel-filter"
            >
              <option value="all">All channels</option>
              <option value="email">Email</option>
              <option value="inapp">In-app</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">Date range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
              data-testid="input-date-from"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
              data-testid="input-date-to"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">Min retries:</span>
            <input
              type="number"
              min="0"
              max="10"
              placeholder="0"
              value={minRetries}
              onChange={(e) => setMinRetries(e.target.value)}
              className="w-20 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
              data-testid="input-min-retries"
            />
          </div>

          {(statusFilter !== "all" || channelFilter !== "all" || eventKeyFilter || search || dateFrom || dateTo || minRetries) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setChannelFilter("all");
                setEventKeyFilter("");
                setSearch("");
                setDateFrom("");
                setDateTo("");
                setMinRetries("");
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
              data-testid="button-clear-filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className={cn("bg-white rounded-2xl border border-gray-200 overflow-hidden", loading && "opacity-50")}>
        <table className="w-full text-sm" data-testid="table-delivery-logs">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Event</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Channel</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recipient</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Attempts</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                  No delivery logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const statusStyle = STATUS_STYLES[log.status] ?? STATUS_STYLES.pending;
                const Icon = statusStyle.icon;
                const errorText = log.errorMessage ?? log.lastError;
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors" data-testid={`log-row-${log.id}`}>
                    <td className="px-5 py-3">
                      <code className="text-xs font-mono text-navy">{log.template.eventKey}</code>
                      {log.subject && (
                        <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{log.subject}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize text-gray-600">{log.channel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 truncate max-w-[160px] block">{log.recipient}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit", statusStyle.color)}>
                        <Icon className="w-3 h-3" />
                        {log.status}
                      </span>
                      {errorText && (
                        <p className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={errorText}>
                          {errorText}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {log.attempts} {log.attempts === 1 ? "try" : "tries"}
                        {(log.retryCount ?? 0) > 0 && (
                          <span className="text-orange-500 ml-1">({log.retryCount} retried)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-gray-400">
                        {log.sentAt ? timeAgo(log.sentAt) : timeAgo(log.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => { setPage(p => p - 1); fetchLogs(page - 1); }}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 disabled:opacity-40 hover:border-teal/50 transition-colors"
            data-testid="button-prev-page"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => { setPage(p => p + 1); fetchLogs(page + 1); }}
            disabled={page >= totalPages}
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
