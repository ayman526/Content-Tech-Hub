"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function InviteAcceptButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function accept() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setError(data.error ?? "Could not accept invitation.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-600 font-semibold py-2">
        <CheckCircle2 className="w-5 h-5" />
        Invitation accepted! Redirecting…
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={accept}
        disabled={loading}
        className="w-full text-sm bg-[#FF7A59] text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="btn-accept-invite"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Accept Invitation
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
