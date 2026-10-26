"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, ArrowRight, CheckCircle,
  Building2, AlertCircle, UserPlus, PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type OrgCheckResult =
  | { exists: false }
  | { exists: true; org: { id: string; name: string; memberCount: number } };

type JoinMode = "create" | "join";

const BENEFITS = [
  "14-day free trial, no credit card",
  "AI + human translation in one platform",
  "Translation memory & glossary included",
  "Cancel anytime",
];

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    orgName: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orgCheck, setOrgCheck] = useState<OrgCheckResult | null>(null);
  const [orgChecking, setOrgChecking] = useState(false);
  const [joinMode, setJoinMode] = useState<JoinMode>("create");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "orgName") {
      setOrgCheck(null);
      setJoinMode("create");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim().length >= 2) {
        debounceRef.current = setTimeout(() => checkOrg(value.trim()), 600);
      }
    }
  }

  async function checkOrg(name: string) {
    setOrgChecking(true);
    try {
      const res = await fetch(`/api/auth/check-org?name=${encodeURIComponent(name)}`);
      const data: OrgCheckResult = await res.json();
      setOrgCheck(data);
      if (data.exists) setJoinMode("join");
    } catch {
    } finally {
      setOrgChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const body: Record<string, string> = {
      name: form.name,
      email: form.email,
      orgName: form.orgName,
      password: form.password,
    };

    if (joinMode === "join" && orgCheck?.exists) {
      body.joinOrgId = (orgCheck as { exists: true; org: { id: string; name: string; memberCount: number } }).org.id;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    if (data.joinRequest) {
      router.push(`/login?joinRequest=true&org=${encodeURIComponent(data.orgName)}`);
    } else {
      router.push("/login?registered=true");
    }
  }

  const existingOrg =
    orgCheck && orgCheck.exists
      ? (orgCheck as { exists: true; org: { id: string; name: string; memberCount: number } }).org
      : null;

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left: Benefits panel */}
      <div className="hidden md:flex flex-col justify-center p-8 bg-navy rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-3">Start translating in minutes</h2>
        <p className="text-white/70 text-sm mb-8 leading-relaxed">
          Join 1,000+ companies using Contentech to go global faster, smarter, and without compromise.
        </p>
        <ul className="space-y-4">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-white/80">
              <CheckCircle className="w-5 h-5 text-teal flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        {existingOrg && joinMode === "join" && (
          <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/20">
            <p className="text-xs text-white/60 mb-1">Requesting to join</p>
            <p className="text-sm font-semibold text-white">{existingOrg.name}</p>
            <p className="text-xs text-white/50 mt-0.5">
              {existingOrg.memberCount} member{existingOrg.memberCount !== 1 ? "s" : ""} · shared TM &amp; glossary
            </p>
          </div>
        )}
      </div>

      {/* Right: Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy mb-1">Create your account</h1>
          <p className="text-sm text-gray-500">
            {joinMode === "join" && existingOrg
              ? `Request to join ${existingOrg.name}`
              : "Set up your organization workspace"}
          </p>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2"
            data-testid="error-message"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="Jane Smith"
                required
                data-testid="input-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Company name</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.orgName}
                  onChange={(e) => update("orgName", e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors pr-8
                    ${existingOrg
                      ? joinMode === "join"
                        ? "border-teal/60 focus:ring-teal/20 bg-teal/5"
                        : "border-gold/60 focus:ring-gold/20 bg-amber-50"
                      : "border-gray-200 focus:ring-navy/20 focus:border-navy"
                    }`}
                  placeholder="Acme Corp"
                  required
                  data-testid="input-org"
                />
                {orgChecking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  </div>
                )}
                {!orgChecking && existingOrg && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Building2 className="w-3.5 h-3.5 text-teal" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Org-found banner */}
          {existingOrg && (
            <div
              className="rounded-xl border border-teal/30 overflow-hidden"
              data-testid="org-exists-banner"
            >
              <div className="px-4 py-3 bg-teal/5 border-b border-teal/20 flex items-start gap-3">
                <Building2 className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy">
                    <span className="text-teal">{existingOrg.name}</span> is already on Contentech
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {existingOrg.memberCount} team member{existingOrg.memberCount !== 1 ? "s" : ""} ·
                    shared Translation Memory &amp; Glossary
                  </p>
                </div>
              </div>
              <div className="p-3 bg-white flex gap-2">
                <button
                  type="button"
                  onClick={() => setJoinMode("join")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border transition-all
                    ${joinMode === "join"
                      ? "bg-teal text-white border-teal shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal/40 hover:text-teal"
                    }`}
                  data-testid="btn-request-join"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Request to join {existingOrg.name}
                </button>
                <button
                  type="button"
                  onClick={() => setJoinMode("create")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border transition-all
                    ${joinMode === "create"
                      ? "bg-navy text-white border-navy shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-navy/40 hover:text-navy"
                    }`}
                  data-testid="btn-create-separate"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create separate account
                </button>
              </div>
              {joinMode === "join" && (
                <div className="px-4 py-2.5 bg-teal/5 border-t border-teal/10 text-xs text-gray-500">
                  You&apos;ll be able to sign in immediately. A workspace admin will approve your access.
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Work email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder="jane@company.com"
              required
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy pr-10"
                placeholder="Min. 8 characters"
                required
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder="••••••••"
              required
              data-testid="input-confirm-password"
            />
          </div>

          <Button
            type="submit"
            className={`w-full ${joinMode === "join" && existingOrg ? "bg-teal hover:bg-teal/90 text-white" : ""}`}
            size="lg"
            disabled={loading}
            data-testid="btn-register"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : joinMode === "join" && existingOrg ? (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Request to Join {existingOrg.name}
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </form>

        <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-navy font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
