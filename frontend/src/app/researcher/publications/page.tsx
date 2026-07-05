"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ResearchPublication, isResearcher } from "@/lib/types";
import { Icon } from "@/components/icons";
import { assetUrl } from "@/lib/assetUrl";

const emptyForm = {
  title: "",
  description: "",
  fileUrl: "",
  coverImage: "",
  price: 0,
  isFree: true,
};

export default function ResearcherPublicationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.research.my().then(setPublications).catch(console.error);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isResearcher(user.roleId)) router.push("/dashboard");
    if (user && isResearcher(user.roleId)) load();
  }, [user?.id, loading, router]);

  const handleUpload = async (file?: File, cover?: File) => {
    if (!file && !cover) return;
    setUploading(true);
    try {
      const result = await api.upload.publicationFiles(file, cover);
      setForm((f) => ({
        ...f,
        fileUrl: result.fileUrl ?? f.fileUrl,
        coverImage: result.coverImage ?? f.coverImage,
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  const startEdit = (pub: ResearchPublication) => {
    setEditingId(pub.id);
    setForm({
      title: pub.title,
      description: pub.description || "",
      fileUrl: pub.fileUrl || "",
      coverImage: pub.coverImage || "",
      price: pub.price ?? 0,
      isFree: pub.isFree,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const save = async () => {
    if (!form.title.trim() || !form.fileUrl) {
      setError("Title and document file are required");
      return;
    }
    if (!form.isFree && form.price <= 0) {
      setError("Paid publications need a price greater than 0");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        fileUrl: form.fileUrl,
        coverImage: form.coverImage || undefined,
        isFree: form.isFree,
        price: form.isFree ? undefined : form.price,
      };
      if (editingId) {
        await api.research.update(editingId, payload);
      } else {
        await api.research.create(payload);
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    if (!confirm("Archive this publication?")) return;
    await api.research.remove(id);
    load();
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">My Publications</h1>
          <p className="text-sm text-gray-500">Upload books and research files for students to read</p>
        </div>
        {!showForm && (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            + Upload publication
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">
            {editingId ? "Edit publication" : "New publication"}
          </h2>
          {error && <p className="auth-error mb-4">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="auth-label">Title</label>
              <input
                className="auth-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="auth-label">Description</label>
              <textarea
                className="auth-input min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="auth-label">Document (PDF, EPUB, Word, text)</label>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.epub,.doc,.docx,.txt"
                onChange={(e) => handleUpload(e.target.files?.[0], undefined)}
              />
              <button
                type="button"
                className="btn-outline w-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading..." : form.fileUrl ? "Replace document" : "Choose document"}
              </button>
              {form.fileUrl && (
                <p className="mt-1 truncate text-xs text-green-700">Uploaded: {form.fileUrl.split("/").pop()}</p>
              )}
            </div>
            <div>
              <label className="auth-label">Cover image (optional)</label>
              <input
                ref={coverRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleUpload(undefined, e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn-outline w-full"
                disabled={uploading}
                onClick={() => coverRef.current?.click()}
              >
                {form.coverImage ? "Replace cover" : "Choose cover"}
              </button>
              {form.coverImage && (
                <img
                  src={assetUrl(form.coverImage) || ""}
                  alt="Cover preview"
                  className="mt-2 h-24 w-16 rounded object-cover"
                />
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                />
                Free to read
              </label>
            </div>
            {!form.isFree && (
              <div>
                <label className="auth-label">Price (GHC)</label>
                <input
                  type="number"
                  min={1}
                  step={0.01}
                  className="auth-input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn-primary" disabled={saving || uploading} onClick={save}>
              {saving ? "Saving..." : editingId ? "Update" : "Publish"}
            </button>
            <button type="button" className="btn-outline" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications yet. Upload your first book or research file.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((pub) => (
            <div key={pub.id} className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              {pub.coverImage ? (
                <img
                  src={assetUrl(pub.coverImage) || ""}
                  alt=""
                  className="mb-3 h-32 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-brand-50">
                  <Icon name="book" className="h-10 w-10 text-brand-300" />
                </div>
              )}
              <h3 className="font-semibold text-brand-900">{pub.title}</h3>
              {pub.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{pub.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-500">
                  <Icon name="eye" className="h-4 w-4" />
                  {pub.viewCount}
                </span>
                <span className="font-semibold text-brand-700">
                  {pub.isFree ? "Free" : `GHC ${(pub.price ?? 0).toFixed(2)}`}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-outline flex-1 text-sm" onClick={() => startEdit(pub)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => archive(pub.id)}
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
