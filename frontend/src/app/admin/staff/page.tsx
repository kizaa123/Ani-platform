"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  fullName,
  isAdmin,
  ROLES,
  STAFF_ROLE_OPTIONS,
  type StaffMember,
} from "@/lib/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";
import {
  isValidPhone,
  normalizePhoneForStorage,
  PHONE_VALIDATION_MESSAGE,
  phoneToFormValue,
} from "@/lib/phone";
import { PhoneInput } from "@/components/PhoneInput";
import { PasswordInput } from "@/components/PasswordInput";
import { formatDate } from "@/lib/format";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";
import { EmailText } from "@/components/EmailText";

type StaffFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roleId: number;
};

const emptyForm = (): StaffFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  roleId: STAFF_ROLE_OPTIONS[1].id,
});

export default function AdminStaffPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const refreshStaff = useCallback(() => {
    setError("");
    return api.admin.staff
      .list()
      .then(setStaff)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load staff"));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAdmin(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAdmin(user.roleId)) return;

    let cancelled = false;
    api.admin.staff
      .list()
      .then((rows) => {
        if (!cancelled) setStaff(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load staff");
        }
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
    setError("");
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: phoneToFormValue(member.phone, DEFAULT_COUNTRY),
      password: "",
      roleId: member.roleId,
    });
    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing && !isValidPhone(form.phone, DEFAULT_COUNTRY)) {
      setError(PHONE_VALIDATION_MESSAGE);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.admin.staff.update(editing.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          roleId: form.roleId,
        });
      } else {
        await api.admin.staff.create({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: normalizePhoneForStorage(form.phone, DEFAULT_COUNTRY),
          password: form.password,
          roleId: form.roleId,
        });
      }
      closeForm();
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    setActionId(member.id);
    setError("");
    try {
      await api.admin.staff.update(member.id, { isActive: !member.isActive });
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  };

  const pendingAccountants = staff.filter(
    (member) => member.roleId === ROLES.ANI_ACCOUNTANT && member.verificationStatus === "PENDING"
  );

  const reviewAccountant = async (member: StaffMember, status: "VERIFIED" | "REJECTED") => {
    setActionId(member.id);
    setError("");
    try {
      await api.admin.staff.update(member.id, { verificationStatus: status });
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update approval status");
    } finally {
      setActionId(null);
    }
  };

  if (loading || !user) return <PageContentSkeleton maxWidth="max-w-7xl" />;

  const activeCount = staff.filter((s) => s.isActive).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs font-semibold text-brand-600 hover:underline">
            Admin Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-brand-900">ANI Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage platform staff - accountants, admins, CTO, and communications
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Add staff member
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total staff</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">{staff.length}</p>
        </div>
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Pending accountants
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{pendingAccountants.length}</p>
        </div>
      </div>

      {pendingAccountants.length > 0 && (
        <div className="card-elevated mb-8 overflow-hidden rounded-2xl">
          <div className="border-b border-brand-100 bg-amber-50/80 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-bold text-brand-900">Pending accountant registrations</h2>
            <p className="mt-1 text-sm text-gray-500">
              Self-registered ANI Accountants cannot access the financial portal until approved.
            </p>
          </div>
          <div className="overflow-x-auto p-4 sm:p-6">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Registered</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {pendingAccountants.map((member) => {
                  const busy = actionId === member.id;
                  return (
                    <tr key={member.id}>
                      <td className="py-3 pr-4 font-semibold text-brand-900">{fullName(member)}</td>
                      <td className="py-3 pr-4"><EmailText email={member.email} /></td>
                      <td className="py-3 pr-4">
                        <VerificationBadge adminView status={member.verificationStatus} />
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(member.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => reviewAccountant(member, "VERIFIED")}
                            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => reviewAccountant(member, "REJECTED")}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card-elevated mb-8 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand-900">
            {editing ? "Edit staff member" : "Add staff member"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editing
              ? "Update name or role. Use deactivate to revoke access without deleting the account."
              : "Create an account with a temporary password the team member can change after first login."}
          </p>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">First name</span>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">Last name</span>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            {!editing && (
              <>
                <label className="block text-sm">
                  <span className="font-semibold text-brand-800">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-brand-800">Phone</span>
                  <PhoneInput
                    className="mt-1"
                    value={form.phone}
                    country={DEFAULT_COUNTRY}
                    onChange={(phone) => setForm((f) => ({ ...f, phone }))}
                    required
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold text-brand-800">Temporary password</span>
                  <PasswordInput
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    wrapperClassName="mt-1"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2"
                  />
                </label>
              </>
            )}
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-brand-800">Role</span>
              <select
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: Number(e.target.value) }))}
                disabled={editing?.id === user.id}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 disabled:bg-gray-100"
              >
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Saving…" : editing ? "Save changes" : "Create account"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-elevated overflow-hidden rounded-2xl">
        <div className="border-b border-brand-100 bg-brand-50/50 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-bold text-brand-900">Team members</h2>
        </div>
        <div className="overflow-x-auto p-4 sm:p-6">
          {pageLoading ? (
            <p className="text-sm text-gray-500">Loading staff…</p>
          ) : staff.length === 0 ? (
            <p className="text-gray-500">No staff members yet. Add your first team member above.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {staff.map((member) => {
                  const busy = actionId === member.id;
                  const isSelf = member.id === user.id;
                  return (
                    <tr key={member.id} className={!member.isActive ? "opacity-60" : undefined}>
                      <td className="py-3 pr-4 font-semibold text-brand-900">
                        {fullName(member)}
                        {isSelf && (
                          <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4"><EmailText email={member.email} /></td>
                      <td className="py-3 pr-4 text-gray-700">{member.roleName}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              member.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {member.isActive ? "Active" : "Inactive"}
                          </span>
                          {member.roleId === ROLES.ANI_ACCOUNTANT && (
                            <VerificationBadge adminView status={member.verificationStatus} />
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(member.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(member)}
                            className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700"
                          >
                            Edit
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleActive(member)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                                member.isActive
                                  ? "border border-red-200 text-red-600"
                                  : "border border-green-200 text-green-700"
                              }`}
                            >
                              {member.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
