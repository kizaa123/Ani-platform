"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { isAccountant, isAccountantApproved } from "@/lib/types";
import { Icon } from "@/components/icons";
import { LogoIcon } from "@/components/Logo";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { authPanelBackgroundStyle, LOGIN_PANEL_BACKGROUND } from "@/lib/authImages";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await login(email, password);
      if (profile.profileComplete === false) {
        router.push("/complete-profile");
      } else if (isAccountant(profile.roleId) && isAccountantApproved(profile)) {
        router.push("/accountant");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full grid lg:grid-cols-12 bg-brand-50">
      {/* Left Column: Platform Overview & Sprout Image */}
      <div className="hidden lg:col-span-7 lg:flex relative overflow-hidden bg-brand-900 flex-col justify-start gap-8 p-12 lg:p-16 text-white min-h-[500px]">
        {/* Background sprout image */}
        <div
          className="absolute inset-0 z-0"
          style={authPanelBackgroundStyle(LOGIN_PANEL_BACKGROUND)}
        />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-brand-950/95 via-brand-900/80 to-brand-800/40" />

        {/* Brand */}
        <ScrollReveal trigger="mount" delay={scrollStagger(0, 80)} duration={500} direction="fade-up" className="relative z-20">
          <PlatformBrandTitle theme="light" size="panel" />
        </ScrollReveal>

        {/* Marketing text & stats */}
        <ScrollReveal trigger="mount" delay={scrollStagger(1, 80)} duration={500} direction="fade-up" className="relative z-20 max-w-xl space-y-6">
          <h2 className="text-2xl font-bold leading-snug tracking-tight text-white/95 lg:text-3xl">
            Connecting African Agriculture to Global Markets
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed font-light">
            Trade commodities securely, connect directly with verified clients and crop fellows, and request support from expert liaison officers.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 backdrop-blur-[2px] rounded-xl p-4 bg-white/5">
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">Direct</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Fellow–Client Trade</p>
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


      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="flex justify-center px-6 pt-8 text-center lg:hidden">
          <PlatformBrandTitle theme="dark" size="compact" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:p-16">
        <ScrollReveal trigger="mount" delay={120} duration={500} direction="fade-up" className="w-full max-w-md">
        <div className="space-y-8 bg-white p-8 rounded-2xl border border-brand-100 shadow-xl">
          <header className="text-left">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50/80 p-2 border border-brand-100/80 shadow-2xs">
                <LogoIcon theme="dark" className="h-8 w-auto" />
              </div>
              <h1 className="text-3xl font-extrabold text-brand-900 tracking-tight">Login Here</h1>
            </div>
            <p className="text-sm text-gray-500 text-center">Sign in to your ANI account</p>
          </header>

          {(error || queryError) && (
            <div className="auth-error" role="alert">
              <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || queryError}</span>
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
        </div>
        </ScrollReveal>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
