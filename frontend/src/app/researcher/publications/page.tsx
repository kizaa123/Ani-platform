"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ResearchPublication, ResearchPublicationCategory, isResearcher } from "@/lib/types";
import { PUBLICATION_CATEGORY_OPTIONS } from "@/lib/publicationCategories";
import { Icon } from "@/components/icons";
import { FileUploadZone } from "@/components/FileUploadZone";
import { PublicationCoverImage } from "@/components/PublicationCoverImage";
import { PageContentSkeleton, SpinnerLabel } from "@/components/LoadingPrimitives";
import { assetUrl } from "@/lib/assetUrl";

const emptyForm = {
  title: "",
  description: "",
  fileUrl: "",
  coverImage: "",
  category: "CROP_FARM" as ResearchPublicationCategory,
  price: 0,
  isFree: true,
};

export default function ResearcherPublicationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingDocName, setPendingDocName] = useState<string | null>(null);
  const [localCoverPreview, setLocalCoverPreview] = useState<string | null>(null);

  const load = () => api.research.my().then(setPublications).catch(console.error);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isResearcher(user.roleId)) router.push("/dashboard");
    if (user && isResearcher(user.roleId)) load();
  }, [user?.id, loading, router]);

  useEffect(() => {
    return () => {
      if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    };
  }, [localCoverPreview]);

  const handleDocSelect = async (file: File) => {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Only PDF files are allowed");
      return;
    }

    setPendingDocName(file.name);
    setUploadingDoc(true);
    try {
      const result = await api.upload.publicationFiles(file, undefined);
      setForm((f) => ({
        ...f,
        fileUrl: result.fileUrl ?? f.fileUrl,
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingDoc(false);
      setPendingDocName(null);
    }
  };

  const handleCoverSelect = async (file: File) => {
    if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    setLocalCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const result = await api.upload.publicationFiles(undefined, file);
      setForm((f) => ({
        ...f,
        coverImage: result.coverImage ?? f.coverImage,
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const startEdit = (pub: ResearchPublication) => {
    setEditingId(pub.id);
    setForm({
      title: pub.title,
      description: pub.description || "",
      fileUrl: pub.fileUrl || "",
      coverImage: pub.coverImage || "",
      category: pub.category ?? "OTHER",
      price: pub.price ?? 0,
      isFree: pub.isFree,
    });
    if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    setLocalCoverPreview(null);
    setShowForm(true);
  };

  const resetForm = () => {
    if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    setLocalCoverPreview(null);
    setPendingDocName(null);
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const save = async () => {
    if (!form.title.trim() || !form.fileUrl) {
      setError("Title and PDF file are required");
      return;
    }
    if (!form.category) {
      setError("Publisher type is required");
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
        category: form.category,
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

  const docFileName = pendingDocName ?? (form.fileUrl ? form.fileUrl.split("/").pop() : undefined);
  const coverPreviewUrl =
    localCoverPreview ?? (form.coverImage ? assetUrl(form.coverImage) ?? undefined : undefined);
  const uploading = uploadingDoc || uploadingCover;

  if (loading || !user) {
    return <PageContentSkeleton variant="form" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">My Publications</h1>
          <p className="text-sm text-gray-500">Upload PDF publications for students to read</p>
        </div>
        {!showForm && (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            + Upload publication
          </button>
        )}
      </div>

      {showForm && (
        <div className="mx-auto mb-8 max-w-lg rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <div className="mb-5 border-b border-brand-50 pb-4">
            <h2 className="text-lg font-semibold text-brand-900">
              {editingId ? "Edit publication" : "New publication"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add your PDF, optional cover art, and a clear description for readers.
            </p>
          </div>
          {error && <p className="auth-error mb-4">{error}</p>}

          <div className="space-y-5">
            <div>
              <label className="auth-label">Title</label>
              <input
                className="auth-input"
                placeholder="Publication title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="auth-label">Publisher type</label>
              <select
                className="auth-input"
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as typeof form.category,
                  })
                }
              >
                {PUBLICATION_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="space-y-4">
                <FileUploadZone
                  compact
                  label="PDF document"
                  accept=".pdf,application/pdf"
                  icon="file"
                  disabled={uploading}
                  uploading={uploadingDoc}
                  onFileSelect={handleDocSelect}
                  fileName={docFileName}
                  hint="PDF only"
                />
                <FileUploadZone
                  compact
                  label="Cover (optional)"
                  accept="image/*"
                  icon="image"
                  disabled={uploading}
                  uploading={uploadingCover}
                  onFileSelect={handleCoverSelect}
                  previewUrl={coverPreviewUrl}
                  fileName={
                    coverPreviewUrl && !localCoverPreview
                      ? form.coverImage.split("/").pop()
                      : undefined
                  }
                  hint="16:9 or 4:3 works best"
                />
                <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-900">
                    <input
                      type="checkbox"
                      checked={form.isFree}
                      onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                    />
                    Free to read
                  </label>
                  {!form.isFree && (
                    <div className="mt-3">
                      <label className="auth-label">Price (GHC)</label>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        className="auth-input"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-[14rem] flex-col md:min-h-0">
                <label className="auth-label">Description</label>
                <textarea
                  className="auth-input min-h-[12rem] flex-1 resize-y md:min-h-[18rem]"
                  placeholder="Describe what readers will learn, your qualifications, and key topics covered..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 border-t border-brand-50 pt-5">
            <button type="button" className="btn-primary" disabled={saving || uploading} onClick={save}>
              {saving ? <SpinnerLabel label="Saving..." className="h-4 w-4" /> : editingId ? "Update" : "Publish"}
            </button>
            <button type="button" className="btn-outline" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications yet. Upload your first PDF publication.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((pub) => (
            <article
              key={pub.id}
              className="flex flex-col overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <PublicationCoverImage coverImage={pub.coverImage} title={pub.title} className="rounded-none" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold text-brand-900 line-clamp-2">{pub.title}</h3>
                {pub.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{pub.description}</p>
                )}
                <div className="mt-auto pt-3">
                  <div className="flex items-center justify-between text-sm">
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
