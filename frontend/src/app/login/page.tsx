"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { isAccountant, isAccountantApproved } from "@/lib/types";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AuthHeroPanel } from "@/components/AuthHeroPanel";
import { AuthDivider, GoogleSignInButton } from "@/components/GoogleSignInButton";
import { api } from "@/lib/api";

const GOOGLE_DEV_MODE = process.env.NEXT_PUBLIC_GOOGLE_DEV_MODE === "true";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryError = searchParams.get("error");

  const routeAfterAuth = (profile: {
    profileComplete?: boolean;
    roleId: number;
    verificationStatus?: string;
  }) => {
    if (profile.profileComplete === false) {
      router.push("/complete-profile");
    } else if (isAccountant(profile.roleId) && isAccountantApproved(profile)) {
      router.push("/accountant");
    } else {
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await login(email, password);
      routeAfterAuth(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDevGoogle = async () => {
    setError("");
    setDevLoading(true);
    try {
      const result = await api.auth.googleDevSignIn({
        email: email || "google.dev@ani.gh",
        firstName: "Google",
        lastName: "User",
      });
      api.setTokens(result.accessToken, result.refreshToken);
      if (result.needsProfile) {
        window.location.href = "/complete-profile";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <AuthHeroPanel className="flex-1">
      <ScrollReveal trigger="mount" delay={120} duration={500} direction="fade-up">
        <div className="space-y-6">
          <header className="text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/70 text-brand-700 shadow-xs">
                <Icon name="lock" className="h-5 w-5 text-brand-700" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">
                Sign In
              </h1>
            </div>
            <p className="auth-subtitle mt-2 text-sm text-gray-500">Welcome back - sign in to your ANI account</p>
          </header>

          {(error || queryError) && (
            <div className="auth-error" role="alert">
              <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || queryError}</span>
            </div>
          )}

          <GoogleSignInButton
            label="Sign in with Google"
            disabled={loading || devLoading}
            showDev={GOOGLE_DEV_MODE}
            onDevSignIn={handleDevGoogle}
            devLoading={devLoading}
          />
          <AuthDivider text="or sign in with email" />

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
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

            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <PasswordInput
                id="login-password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary auth-nav-btn w-full"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="auth-switch !mt-6">
            No account?{" "}
            <Link href="/register" className="auth-switch-link">
              Create one
            </Link>
          </p>
        </div>
      </ScrollReveal>
    </AuthHeroPanel>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
