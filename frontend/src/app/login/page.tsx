"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { isAccountant, isAccountantApproved } from "@/lib/types";
import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AuthHeroPanel } from "@/components/AuthHeroPanel";

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
    <AuthHeroPanel className="flex-1">
      <ScrollReveal trigger="mount" delay={120} duration={500} direction="fade-up">
        <div className="space-y-6">
          <header className="text-center lg:text-left">
            <div className="auth-icon-wrap mx-auto mb-4 lg:mx-0">
              <Icon name="lock" className="h-6 w-6" />
            </div>
            <h1 className="auth-title">Sign In</h1>
            <p className="auth-subtitle">Welcome back - sign in to your ANI account</p>
          </header>

          {(error || queryError) && (
            <div className="auth-error" role="alert">
              <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || queryError}</span>
            </div>
          )}

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
