"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  AD_PLACEMENT_OPTIONS,
  AD_TARGET_ROLE_OPTIONS,
  isAdmin,
  type AdPlacement,
  type PlatformAd,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";

type AdFormState = {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string;
  placement: AdPlacement;
  targetRoleIds: number[];
  active: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
};

const emptyForm = (): AdFormState => ({
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  ctaLabel: "",
  placement: "marketplace",
  targetRoleIds: [],
  active: true,
  priority: 0,
  startsAt: "",
  endsAt: "",
});

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}

function adToForm(ad: PlatformAd): AdFormState {
  return {
    title: ad.title,
    description: ad.description ?? "",
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl ?? "",
    ctaLabel: ad.ctaLabel ?? "",
    placement: ad.placement,
    targetRoleIds: ad.targetRoleIds,
    active: ad.active,
    priority: ad.priority,
    startsAt: toDatetimeLocal(ad.startsAt),
    endsAt: toDatetimeLocal(ad.endsAt),
  };
}

function placementLabel(placement: AdPlacement) {
  return AD_PLACEMENT_OPTIONS.find((o) => o.value === placement)?.label ?? placement;
}

function scheduleSummary(ad: PlatformAd) {
  if (!ad.startsAt && !ad.endsAt) return "Always on";
  const start = ad.startsAt ? formatDate(ad.startsAt) : "Anytime";
  const end = ad.endsAt ? formatDate(ad.endsAt) : "Open-ended";
  return `${start} → ${end}`;
}

export default function AdminAdsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AdFormState>(emptyForm);
  const [editing, setEditing] = useState<PlatformAd | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlatformAd | null>(null);

  const refreshAds = useCallback(() => {
    setError("");
    return api.admin.ads
      .list()
      .then(setAds)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load ads"));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAdmin(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAdmin(user.roleId)) return;

    let cancelled = false;
    api.admin.ads
      .list()
      .then((rows) => {
        if (!cancelled) setAds(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load ads");
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

  const openEdit = (ad: PlatformAd) => {
    setEditing(ad);
    setForm(adToForm(ad));
    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const toggleRole = (roleId: number) => {
    setForm((f) => ({
      ...f,
      targetRoleIds: f.targetRoleIds.includes(roleId)
        ? f.targetRoleIds.filter((id) => id !== roleId)
        : [...f.targetRoleIds, roleId],
    }));
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const { url } = await api.upload.adImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const payload = {
      title: form.title,
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl.trim() || undefined,
      ctaLabel: form.ctaLabel.trim() || undefined,
      placement: form.placement,
      targetRoleIds: form.targetRoleIds,
      active: form.active,
      priority: form.priority,
      startsAt: fromDatetimeLocal(form.startsAt),
      endsAt: fromDatetimeLocal(form.endsAt),
    };
    try {
      if (editing) {
        await api.admin.ads.update(editing.id, payload);
      } else {
        await api.admin.ads.create(payload);
      }
      closeForm();
      await refreshAds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ad");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteId(confirmDelete.id);
    setError("");
    try {
      await api.admin.ads.remove(confirmDelete.id);
      setConfirmDelete(null);
      await refreshAds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete ad");
    } finally {
      setDeleteId(null);
    }
  };

  if (loading || !user) return <PageContentSkeleton maxWidth="max-w-7xl" />;

  const activeCount = ads.filter((a) => a.active).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs font-semibold text-brand-600 hover:underline">
            Admin Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-brand-900">Internal Ads</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and schedule banner promotions shown across platform portals
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Create ad
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total ads</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">{ads.length}</p>
        </div>
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Placements</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">{AD_PLACEMENT_OPTIONS.length}</p>
        </div>
      </div>

      {showForm && (
        <div className="card-elevated mb-8 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand-900">
            {editing ? "Edit ad" : "Create ad"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-brand-800">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-brand-800">Description (optional)</span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-brand-800">Banner image URL</span>
              <input
                required
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="h-12 w-24 rounded-lg border border-brand-100 object-cover"
                  />
                )}
              </div>
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">Link URL (optional)</span>
              <input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">CTA label (optional)</span>
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="Learn more"
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <div className="block text-sm">
              <label htmlFor="ad-placement-select" className="block font-semibold text-brand-800">Select Placement</label>
              <select
                id="ad-placement-select"
                value={form.placement}
                onChange={(e) =>
                  setForm((f) => ({ ...f, placement: e.target.value as AdPlacement }))
                }
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              >
                {AD_PLACEMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">Priority (higher first)</span>
              <input
                type="number"
                min={0}
                max={1000}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">Starts at (optional)</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-brand-800">Ends at (optional)</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
              />
            </label>
            <div className="block text-sm sm:col-span-2">
              <span className="font-semibold text-brand-800">Target roles</span>
              <p className="mt-0.5 text-xs text-gray-500">Leave empty to show all roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AD_TARGET_ROLE_OPTIONS.map((role) => {
                  const selected = form.targetRoleIds.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        selected
                          ? "bg-brand-700 text-white"
                          : "border border-brand-200 text-brand-700 hover:bg-brand-50"
                      }`}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-brand-300 text-brand-700"
              />
              <span className="font-semibold text-brand-800">Active</span>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Saving…" : editing ? "Save changes" : "Create ad"}
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

      {confirmDelete && (
        <div className="card-elevated mb-8 rounded-2xl border border-red-100 bg-red-50/50 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand-900">Delete ad?</h2>
          <p className="mt-1 text-sm text-gray-600">
            Remove &ldquo;{confirmDelete.title}&rdquo; - this cannot be undone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={deleteId === confirmDelete.id}
              onClick={() => void handleDelete()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleteId === confirmDelete.id ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card-elevated overflow-hidden rounded-2xl">
        <div className="border-b border-brand-100 bg-brand-50/50 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-bold text-brand-900">All ads</h2>
        </div>
        <div className="overflow-x-auto p-4 sm:p-6">
          {pageLoading ? (
            <p className="text-sm text-gray-500">Loading ads…</p>
          ) : ads.length === 0 ? (
            <p className="text-gray-500">No ads yet. Create your first promotion above.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Placement</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Schedule</th>
                  <th className="pb-3 pr-4">Priority</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {ads.map((ad) => (
                  <tr key={ad.id} className={!ad.active ? "opacity-60" : undefined}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-brand-900">{ad.title}</p>
                      {ad.targetRoleIds.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {ad.targetRoleIds.length} role target(s)
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{placementLabel(ad.placement)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          ad.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ad.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{scheduleSummary(ad)}</td>
                    <td className="py-3 pr-4 text-gray-700">{ad.priority}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(ad)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
