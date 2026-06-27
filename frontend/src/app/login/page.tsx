"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";

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
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-brand-900">Welcome Back</h1>
        <p className="mb-6 text-gray-500">Sign in to ANI Exchange</p>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          No account? <Link href="/register" className="text-brand-700 font-medium">Register</Link>
        </p>
        <div className="mt-6 rounded-lg bg-brand-50 p-4 text-xs text-gray-600">
          <p className="font-semibold mb-1">Demo (Password123!)</p>
          <p>kwame@farm.gh · ama@buyer.gh · admin@ani.gh</p>
        </div>
      </div>
    </div>
  );
}
