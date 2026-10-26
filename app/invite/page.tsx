"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, CheckCircle2, XCircle, Clock, Loader2, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvitationData {
  id: string;
  email: string;
  languagePairs: { sourceLang: string; targetLang: string }[];
  organization: { id: string; name: string };
  invitedBy: { name: string; email: string };
  expiresAt: string;
}

export default function LinguistInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }
    fetch(`/api/invite/validate?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Invalid invitation.");
        } else {
          const data = await res.json();
          setInvitation(data);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept(needsAccount: boolean) {
    setFormError(null);
    if (needsAccount && (!name.trim() || !password.trim())) {
      setFormError("Name and password are required.");
      return;
    }
    setAccepting(true);
    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: name || undefined, password: password || undefined }),
    });
    setAccepting(false);
    if (res.ok) {
      setAccepted(true);
      setTimeout(() => router.push("/portal"), 2500);
    } else {
      const data = await res.json();
      setFormError(data.error ?? "Failed to accept invitation.");
    }
  }

  if (loading) {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 text-teal animate-spin mx-auto" />
        <p className="text-sm text-gray-400 mt-3">Validating invitation...</p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy mb-2">Invitation Invalid</h1>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <Link href="/" className="text-sm text-teal font-medium hover:underline">
          Go to Contentech
        </Link>
      </Shell>
    );
  }

  if (accepted) {
    return (
      <Shell>
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy mb-2">Welcome to {invitation?.organization.name}!</h1>
        <p className="text-sm text-gray-500">Invitation accepted. Redirecting to your portal...</p>
      </Shell>
    );
  }

  if (!invitation) return null;

  const inviterName = invitation.invitedBy.name ?? invitation.invitedBy.email;
  const expiryDate = new Date(invitation.expiresAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Shell>
      <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7 text-navy" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        Linguist Invitation
      </p>
      <h1 className="text-xl font-bold text-navy mb-1">
        Join {invitation.organization.name}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{invitation.organization.name}</strong> as an Internal Linguist.
      </p>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 text-sm space-y-2 text-left">
        <Row label="Organization" value={invitation.organization.name} />
        <Row label="Your role" value="Internal Linguist" />
        <Row label="Invited email" value={invitation.email} />
        {invitation.languagePairs.length > 0 && (
          <div className="pt-1">
            <p className="text-gray-400 mb-1.5">Language pairs</p>
            <div className="flex flex-wrap gap-1.5">
              {invitation.languagePairs.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-medium"
                >
                  <Globe className="w-2.5 h-2.5" />
                  {p.sourceLang.toUpperCase()} → {p.targetLang.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 text-left mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Create your account</p>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          data-testid="input-invite-name"
        />
        <input
          type="password"
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          data-testid="input-invite-password"
        />
        {formError && (
          <p className="text-xs text-red-500" data-testid="text-invite-error">{formError}</p>
        )}
        <p className="text-xs text-gray-400">
          Already have an account?{" "}
          <Link href={`/login?callbackUrl=/invite?token=${token}`} className="text-teal hover:underline">
            Log in first
          </Link>
          , then revisit this link.
        </p>
      </div>

      <Button
        className="w-full"
        disabled={accepting}
        onClick={() => handleAccept(true)}
        data-testid="btn-accept-invitation"
      >
        {accepting ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Accepting...</>
        ) : (
          <>Accept Invitation<ArrowRight className="ml-2 w-4 h-4" /></>
        )}
      </Button>

      <p className="text-xs text-gray-400 mt-4">Expires {expiryDate}</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <Link href="/" className="inline-block mb-6">
          <span className="block text-2xl font-bold tracking-tight" style={{ color: "#33475B" }}>
            Contentech
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}
