"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { Icon } from "@/components/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full grid lg:grid-cols-12 bg-brand-50">
      {/* Left Column: Form Container */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-brand-100 shadow-xl">
          <header className="text-center lg:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 mb-4">
              <Icon name="lock" className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-brand-900 tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-500">Sign in to your ANI Exchange account</p>
          </header>

          {error && (
            <div className="auth-error" role="alert">
              <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="auth-label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="auth-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 shadow-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="auth-switch">
            No account?{" "}
            <Link href="/register" className="auth-switch-link">
              Create one
            </Link>
          </p>

          <div className="auth-info-box mt-6">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-brand-800">
              <Icon name="shield" className="h-3.5 w-3.5" />
              Demo accounts (Password123!)
            </p>
            <p className="font-mono text-[11px] tracking-tight">kwame@farm.gh · ama@buyer.gh · admin@ani.gh</p>
          </div>
        </div>
      </div>

      {/* Right Column: Platform Overview & Sprout Image */}
      <div className="hidden lg:col-span-7 lg:flex relative overflow-hidden bg-brand-900 flex-col justify-between p-12 lg:p-16 text-white min-h-[500px]">
        {/* Background sprout image */}
        <div className="absolute inset-0 z-0 bg-[url('/login_cover.png')] bg-cover bg-center" />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/95 via-brand-900/60 to-brand-800/10 z-10" />

        {/* Brand logo */}
        <div className="relative z-20 flex items-center gap-2">
          <div className="h-10 w-10 bg-brand-500 rounded-xl flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-brand-900/40">
            A
          </div>
          <span className="font-extrabold text-2xl tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-brand-50 to-brand-200">
            ANI Platform
          </span>
        </div>

        {/* Marketing text & stats */}
        <div className="relative z-20 space-y-6 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-xs font-semibold text-brand-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Agricultural Exchange Platform
          </span>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
            Connecting African Agriculture to Global Markets
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed font-light">
            Trade commodities securely, connect directly with verified buyers and crop farmers, and request support from expert handlers.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 backdrop-blur-[2px] rounded-xl p-4 bg-white/5">
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">10k+</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Verified Users</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">100%</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Secure Escrow</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">24/7</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Handler Support</p>
            </div>
          </div>
        </div>

        <div className="relative z-20 text-xs text-brand-300 font-medium">
          © {new Date().getFullYear()} ANI Agricultural Exchange Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
