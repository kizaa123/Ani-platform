"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/hooks/useScrollAnimation";

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
      {/* Left Column: Platform Overview & Sprout Image */}
      <div className="hidden lg:col-span-7 lg:flex relative overflow-hidden bg-brand-900 flex-col justify-between p-12 lg:p-16 text-white min-h-[500px]">
        {/* Background sprout image */}
        <div className="absolute inset-0 z-0 bg-[url('/ani background color.jpg')] bg-cover bg-center" />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-brand-950/95 via-brand-900/80 to-brand-800/40" />

        {/* Brand logo */}
        <ScrollReveal trigger="mount" delay={scrollStagger(0, 80)} duration={500} direction="fade-up" className="relative z-20">
          <Logo theme="light" size="lg" />
        </ScrollReveal>

        {/* Marketing text & stats */}
        <ScrollReveal trigger="mount" delay={scrollStagger(1, 80)} duration={500} direction="fade-up" className="relative z-20 max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-sm font-medium tracking-wide text-white/90">
              Ghana&apos;s Agricultural Exchange Platform
            </span>
          </div>
          <PlatformBrandTitle theme="light" size="panel" />
          <h2 className="text-2xl font-bold leading-snug tracking-tight text-white/95 lg:text-3xl">
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
        </ScrollReveal>

        <ScrollReveal trigger="mount" delay={scrollStagger(2, 80)} duration={450} direction="fade-in" className="relative z-20 text-xs text-brand-300 font-medium">
          © {new Date().getFullYear()} Agricess Network International — ANI Platform. All rights reserved.
        </ScrollReveal>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <ScrollReveal trigger="mount" delay={120} duration={500} direction="fade-up" className="w-full max-w-md">
        <div className="space-y-8 bg-white p-8 rounded-2xl border border-brand-100 shadow-xl">
          <header className="text-center lg:text-left">
            <div className="mb-6 lg:hidden">
              <PlatformBrandTitle theme="dark" size="compact" showIcon />
            </div>
            <div className="hidden lg:inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 mb-4">
              <Icon name="lock" className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-brand-900 tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-500">Sign in to your ANI Platform account</p>
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
            <p className="font-mono text-[11px] tracking-tight">
              kwame@farm.gh · ama@buyer.gh · akua@research.gh · admin@ani.gh
            </p>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
