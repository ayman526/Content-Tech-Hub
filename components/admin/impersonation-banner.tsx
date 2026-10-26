"use client";

import { useSession, signOut } from "next-auth/react";
import { ShieldAlert, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ImpersonationBanner() {
  const { data: session } = useSession();
  const router = useRouter();

  const impersonatedBy = (session?.user as any)?.impersonatedBy;
  if (!impersonatedBy) return null;

  const userName = session?.user?.name || session?.user?.email || "this user";

  async function exit() {
    await signOut({ redirect: false });
    router.push("/admin/users");
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-gold/10 border-b-2 border-gold/40 px-5 py-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <ShieldAlert className="w-4 h-4 text-gold flex-shrink-0" />
        <span>
          Admin view — you are logged in as{" "}
          <strong>{userName}</strong>. Changes you make affect this account.
        </span>
      </div>
      <button
        onClick={exit}
        data-testid="exit-impersonation"
        className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-gold/20 hover:bg-gold/30 border border-gold/40 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
      >
        <LogOut className="w-3.5 h-3.5" />
        Exit &amp; return to admin
      </button>
    </div>
  );
}
