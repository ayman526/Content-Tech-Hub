"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
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

    if (result?.error) {
      setLoading(false);
      if (result.error === "CallbackRouteError") {
        setError("The service is temporarily unavailable. Please try again.");
      } else {
        setError("Invalid credentials. Please check your email and password.");
      }
      return;
    }

    const check = await fetch("/api/auth/check-admin").then((r) => r.json());
    if (check.role !== "ADMIN") {
      setLoading(false);
      setError("Access denied. This portal is for administrators only.");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-gold" />
            </div>
            <span className="text-xs font-semibold text-navy uppercase tracking-widest">Admin Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Administrator Sign In</h1>
          <p className="text-sm text-gray-500">Restricted access — authorised personnel only</p>
        </div>

        {error && (
          <div
            className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
            data-testid="error-message"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
              placeholder="admin@company.com"
              required
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
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
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-navy hover:bg-navy/90"
            size="lg"
            disabled={loading}
            data-testid="btn-login"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In to Admin
                <ArrowRight className="ms-2 w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link
            href="/login"
            className="text-xs text-gray-400 hover:text-navy transition-colors"
          >
            ← Back to client portal
          </Link>
        </div>
      </div>
    </div>
  );
}
