"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Eye, EyeOff, Loader2, ArrowRight, Building2,
  CheckCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

function LoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const joinRequest = searchParams.get("joinRequest") === "true";
  const joinOrg = searchParams.get("org") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "CallbackRouteError") {
        setError("The service is temporarily unavailable. Please try again in a moment.");
      } else {
        setError(t("auth.invalidCredentials"));
      }
    } else {
      const session = await getSession();
      const role = (session?.user as any)?.role;
      if (role === "ADMIN") {
        window.location.href = "/admin";
      } else if (role === "LINGUIST") {
        window.location.href = "/portal";
      } else {
        window.location.href = "/dashboard";
      }
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-navy/5 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-navy" />
            </div>
            <span className="text-xs font-semibold text-navy uppercase tracking-wide">{t("auth.clientPortal")}</span>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">{t("auth.signInTitle")}</h1>
          <p className="text-sm text-gray-500">{t("auth.signInSubtitle")}</p>
        </div>

        {/* Success: Account created */}
        {registered && (
          <div
            className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-start gap-2"
            data-testid="banner-registered"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Account created! Sign in to access your workspace.</span>
          </div>
        )}

        {/* Success: Join request sent */}
        {joinRequest && (
          <div
            className="mb-6 px-4 py-3 bg-teal/10 border border-teal/30 rounded-xl text-sm text-teal-800 flex items-start gap-2"
            data-testid="banner-join-request"
          >
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Request sent to {joinOrg || "the workspace"}!</p>
              <p className="text-teal-700 mt-0.5">
                Sign in now. A workspace admin will approve your access — you&apos;ll be notified when you&apos;re added to the team.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" data-testid="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
              placeholder="you@company.com"
              required
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("auth.password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors pe-10"
                placeholder="••••••••"
                required
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-gray-600">{t("auth.rememberMe")}</span>
            </label>
            <Link href="/forgot-password" className="text-teal hover:underline font-medium">
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
            data-testid="btn-login"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {t("auth.signIn")}
                <ArrowRight className="ms-2 w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          {t("auth.newToContentech")}{" "}
          <Link href="/register" className="text-navy font-semibold hover:underline">
            {t("auth.createAccount")}
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        {t("auth.linguistQuestion")}{" "}
        <Link href="/linguist-login" className="text-teal font-medium hover:underline">
          {t("auth.linguistPortalLink")}
        </Link>
      </p>
      <p className="text-center text-xs text-gray-300 mt-2">
        <Link href="/admin/login" className="hover:text-gray-400 transition-colors">
          Administrator login →
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <LoginForm />
    </Suspense>
  );
}
