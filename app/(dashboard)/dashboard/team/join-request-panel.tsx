"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type JoinRequest = {
  id: string;
  message: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; createdAt: string };
};

export function JoinRequestPanel({ requests }: { requests: JoinRequest[] }) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function handleAction(requestId: string, action: "APPROVED" | "REJECTED") {
    setProcessing(requestId);
    try {
      await fetch("/api/organization/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      setDismissed((prev) => new Set([...prev, requestId]));
      router.refresh();
    } finally {
      setProcessing(null);
    }
  }

  const visible = requests.filter((r) => !dismissed.has(r.id));

  if (visible.length === 0) return null;

  return (
    <div className="mb-8 bg-white rounded-2xl border border-teal/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-teal/20 bg-teal/5 flex items-center gap-3">
        <UserCheck className="w-5 h-5 text-teal" />
        <div>
          <h2 className="text-sm font-semibold text-navy">
            Pending Join Requests
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-teal text-white rounded-full">
              {visible.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            These users want to join your organization. Approve them to add them to the workspace.
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {visible.map((req) => {
          const initials = req.user.name
            ? req.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            : req.user.email[0].toUpperCase();
          const isProcessing = processing === req.id;

          return (
            <div
              key={req.id}
              className="px-5 py-4 flex items-center gap-4"
              data-testid={`join-request-${req.id}`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{req.user.name || "—"}</p>
                <p className="text-xs text-gray-500 truncate">{req.user.email}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>Requested {new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={isProcessing}
                  onClick={() => handleAction(req.id, "REJECTED")}
                  data-testid={`btn-reject-${req.id}`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1.5">Decline</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-teal hover:bg-teal/90 text-white"
                  disabled={isProcessing}
                  onClick={() => handleAction(req.id, "APPROVED")}
                  data-testid={`btn-approve-${req.id}`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1.5">Approve</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
