"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn, Loader2 } from "lucide-react";

interface LoginAsButtonProps {
  userId: string;
  userName: string;
  userRole: string;
}

export default function LoginAsButton({ userId, userName, userRole }: LoginAsButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleImpersonate() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to create impersonation session");
        setLoading(false);
        return;
      }

      const { token } = await res.json();

      const redirectUrl =
        userRole === "LINGUIST" ? "/portal" :
        userRole === "ADMIN" ? "/admin" :
        "/dashboard";

      await signIn("impersonate", { token, callbackUrl: redirectUrl });
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      data-testid={`login-as-${userId}`}
      title={`Login as ${userName}`}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-navy/70 hover:text-navy border border-gray-200 hover:border-navy/30 hover:bg-navy/5 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <LogIn className="w-3 h-3" />
      )}
      Login as
    </button>
  );
}
