"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isStaff, fullName } from "@/lib/types";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [pending, setPending] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; role: { roleName: string } }>>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && isStaff(user.roleId)) {
      api.admin.stats().then(setStats).catch(console.error);
      api.admin.pending().then(setPending).catch(console.error);
    } else if (user) router.push("/dashboard");
  }, [user?.id, loading, router]);

  const verify = async (id: string, status: string) => {
    await api.admin.verify(id, status);
    setPending((p) => p.filter((u) => u.id !== id));
  };

  if (loading || !user) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-brand-900">Admin Panel</h1>

      {stats && (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries({ Users: stats.users, Farmers: stats.farmers, Buyers: stats.buyers, Revenue: stats.totalRevenue }).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-brand-700">{k === "Revenue" ? `GHC ${v}` : v}</p>
              <p className="text-sm text-gray-500">{k}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-brand-900">Pending Verifications</h2>
      {pending.length === 0 ? (
        <p className="text-gray-500">No pending users.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white p-4">
              <div>
                <p className="font-bold">{fullName(u)}</p>
                <p className="text-sm text-gray-500">{u.email} · {u.role.roleName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => verify(u.id, "VERIFIED")} className="rounded-lg bg-brand-700 px-4 py-2 text-sm text-white">Verify</button>
                <button onClick={() => verify(u.id, "REJECTED")} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
