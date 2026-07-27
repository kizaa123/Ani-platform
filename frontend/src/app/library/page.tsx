"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  ResearchComment,
  ResearchPublication,
  canPurchasePublication,
  isResearcher,
  isStudent,
} from "@/lib/types";
import {
  PUBLICATION_CATEGORY_LABELS,
  PUBLICATION_CATEGORY_ORDER,
  groupPublicationsByCategory,
} from "@/lib/publicationCategories";
import { Icon } from "@/components/icons";
import { PublicationCoverImage } from "@/components/PublicationCoverImage";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PaymentCheckout, TransactionSuccess } from "@/components/PaymentCheckout";
import { assetUrl } from "@/lib/assetUrl";

function formatGhc(amount: number) {
  return `GHC ${amount.toFixed(2)}`;
}

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PublicationComments({
  publicationId,
  canComment,
}: {
  publicationId: string;
  canComment: boolean;
}) {
  const [comments, setComments] = useState<ResearchComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(() => {
    setLoading(true);
    api.research.comments
      .list(publicationId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [publicationId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      const comment = await api.research.comments.add(publicationId, trimmed);
      setComments((prev) => [...prev, comment]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h3 className="mb-3 text-sm font-bold text-gray-900">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet. Be the first to share your thoughts.</p>
      ) : (
        <ul className="mb-4 max-h-48 space-y-3 overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {comment.user.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assetUrl(comment.user.profilePicture) || ""}
                      alt={comment.user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    comment.user.name.charAt(0)
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-800">{comment.user.name}</span>
                <span className="text-xs text-gray-400">{formatCommentDate(comment.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-gray-700">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            rows={3}
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-500">Unlock this publication to join the discussion.</p>
      )}
    </div>
  );
}

function PublicationCard({
  pub,
  viewCount,
  onView,
  onLike,
  onShare,
}: {
  pub: ResearchPublication;
  viewCount: number;
  onView: (pub: ResearchPublication) => void;
  onLike: (pubId: string, result: { liked: boolean; likesCount: number }) => void;
  onShare: (pubId: string, sharesCount: number) => void;
}) {
  const [liking, setLiking] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const result = await api.research.like(pub.id);
      onLike(pub.id, result);
    } catch {
      /* non-blocking */
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/library?pub=${pub.id}`
          : "";
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pub.title, url: shareUrl });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Publication link copied to clipboard!");
      }
      const result = await api.research.share(pub.id);
      onShare(pub.id, result.sharesCount);
    } catch {
      /* user cancelled or failed */
    } finally {
      setSharing(false);
    }
  };

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-md transition hover:border-brand-200 hover:shadow-lg">
      <PublicationCoverImage coverImage={pub.coverImage} title={pub.title} className="rounded-none" />

      <div className="flex flex-1 flex-col p-5">
      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-brand-100 bg-brand-50 shadow-xs">
          {pub.researcher.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(pub.researcher.profilePicture) || ""}
              alt={pub.researcher.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-brand-700">
              {pub.researcher.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-gray-700">{pub.researcher.name}</span>
          <VerificationBadge status={pub.researcher.verificationStatus ?? "VERIFIED"} />
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 leading-snug">{pub.title}</h3>

      <div className="mt-2.5 text-sm text-gray-600 leading-relaxed">
        <p>
          <span className="font-semibold text-gray-900">Qualifications: </span>
          {pub.description ||
            "PhD Crop Science (KNUST), MSc Sustainable Agriculture (UCC), Senior Agronomist at CSIR-Crops Research Institute. 15+ years experience in climate-resilient farming."}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <div className="flex items-center gap-3 text-gray-600 font-medium">
          <span className="flex items-center gap-1.5">
            <Icon name="eye" className="h-4 w-4 text-gray-500" />
            {viewCount}
          </span>
          {pub.likesCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Icon name="thumbs-up" className="h-4 w-4 text-gray-500" />
              {pub.likesCount}
            </span>
          )}
          {pub.sharesCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Icon name="share" className="h-4 w-4 text-gray-500" />
              {pub.sharesCount}
            </span>
          )}
        </div>

        <span className="font-bold text-brand-700 text-base">
          {pub.isFree ? "Free" : formatGhc(pub.price ?? 0)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
            pub.likedByMe
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/80"
          }`}
        >
          <Icon name="thumbs-up" className="h-3.5 w-3.5 shrink-0" />
          <span>{pub.likesCount > 0 ? pub.likesCount : "Like"}</span>
        </button>

        <button
          type="button"
          onClick={() => onView(pub)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100/70 px-2 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
        >
          <Icon name="comment" className="h-3.5 w-3.5 shrink-0" />
          <span>{(pub.commentsCount ?? 0) > 0 ? pub.commentsCount : "Comment"}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100/70 px-2 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
        >
          <Icon name="share" className="h-3.5 w-3.5 shrink-0" />
          <span>{pub.sharesCount > 0 ? pub.sharesCount : "Share"}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => onView(pub)}
        className="mt-auto w-full rounded-2xl bg-brand-800 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-900 active:scale-98"
      >
        {pub.isLocked ? "View & unlock" : "Read now"}
      </button>
      </div>
    </article>
  );
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResearchPublication | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [loadError, setLoadError] = useState("");
  const [modalLiking, setModalLiking] = useState(false);
  const [modalSharing, setModalSharing] = useState(false);

  const studentView = user ? isStudent(user.roleId) : false;
  const groupedPublications = useMemo(
    () => groupPublicationsByCategory(publications),
    [publications]
  );

  const updatePublication = (pubId: string, patch: Partial<ResearchPublication>) => {
    setPublications((prev) => prev.map((p) => (p.id === pubId ? { ...p, ...patch } : p)));
    setSelected((prev) => (prev?.id === pubId ? { ...prev, ...patch } : prev));
  };

  const handleLike = (pubId: string, result: { liked: boolean; likesCount: number }) => {
    updatePublication(pubId, { likedByMe: result.liked, likesCount: result.likesCount });
  };

  const handleShare = (pubId: string, sharesCount: number) => {
    updatePublication(pubId, { sharesCount });
  };

  const load = (q?: string) =>
    api.research
      .browse(q)
      .then((data) => {
        setPublications(data);
        const counts: Record<string, number> = {};
        data.forEach((p) => {
          counts[p.id] = p.viewCount;
        });
        setViewCounts(counts);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load"));

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const handleView = async (pub: ResearchPublication) => {
    try {
      const { viewCount } = await api.research.recordView(pub.id);
      setViewCounts((prev) => ({ ...prev, [pub.id]: viewCount }));
    } catch {
      // non-blocking
    }
    const full = await api.research.get(pub.id);
    setSelected(full);
    setPurchaseError("");
    setPurchaseSuccess("");
  };

  const handlePurchase = async (paymentMethod: string) => {
    if (!selected) return;
    setPurchasing(true);
    setPurchaseError("");
    try {
      await api.research.purchase(selected.id, paymentMethod);
      const updated = await api.research.get(selected.id);
      setSelected(updated);
      setPurchaseSuccess(`You now have access to "${selected.title}".`);
      load(search.trim() || undefined);
    } catch (e) {
      setPurchaseError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const handleModalLike = async () => {
    if (!selected || modalLiking) return;
    setModalLiking(true);
    try {
      const result = await api.research.like(selected.id);
      handleLike(selected.id, result);
    } finally {
      setModalLiking(false);
    }
  };

  const handleModalShare = async () => {
    if (!selected || modalSharing) return;
    setModalSharing(true);
    try {
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/library?pub=${selected.id}`
          : "";
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: selected.title, url: shareUrl });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Publication link copied to clipboard!");
      }
      const result = await api.research.share(selected.id);
      handleShare(selected.id, result.sharesCount);
    } catch {
      /* user cancelled */
    } finally {
      setModalSharing(false);
    }
  };

  const openDocument = (url: string) => {
    const href = assetUrl(url);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-brand-900">Research Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          {studentView
            ? "Explore researcher publications by farming category"
            : "Browse books and research publications from verified researchers"}
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 flex gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="rounded-2xl bg-brand-800 px-6 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-900">
          Search
        </button>
      </form>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError}
        </p>
      )}

      {publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications found.
        </div>
      ) : studentView ? (
        <div className="space-y-8">
          {PUBLICATION_CATEGORY_ORDER.map((category) => {
            const items = groupedPublications[category];
            if (items.length === 0) return null;
            return (
              <section
                key={category}
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-xs"
              >
                <div className="mb-4 border-b border-brand-50 pb-3">
                  <h2 className="text-xl font-bold text-brand-900">
                    {PUBLICATION_CATEGORY_LABELS[category]}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {items.length} publication{items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                  {items.map((pub) => (
                    <PublicationCard
                      key={pub.id}
                      pub={pub}
                      viewCount={viewCounts[pub.id] ?? pub.viewCount}
                      onView={handleView}
                      onLike={handleLike}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {publications.map((pub) => (
            <PublicationCard
              key={pub.id}
              pub={pub}
              viewCount={viewCounts[pub.id] ?? pub.viewCount}
              onView={handleView}
              onLike={handleLike}
              onShare={handleShare}
            />
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-brand-900">{selected.title}</h2>
                <p className="mt-1 text-sm text-gray-500">by {selected.researcher.name}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                onClick={() => {
                  setSelected(null);
                  setPurchaseSuccess("");
                  setPurchaseError("");
                }}
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            {selected.description && <p className="mb-4 text-sm text-gray-600">{selected.description}</p>}

            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Icon name="eye" className="h-4 w-4" />
                {viewCounts[selected.id] ?? selected.viewCount} views
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="thumbs-up" className="h-4 w-4" />
                {selected.likesCount} likes
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="share" className="h-4 w-4" />
                {selected.sharesCount} shares
              </span>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={handleModalLike}
                disabled={modalLiking}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  selected.likedByMe
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/80"
                }`}
              >
                <Icon name="thumbs-up" className="h-3.5 w-3.5" />
                {selected.likedByMe ? "Liked" : "Like"}
              </button>
              <button
                type="button"
                onClick={handleModalShare}
                disabled={modalSharing}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-100/70 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
              >
                <Icon name="share" className="h-3.5 w-3.5" />
                Share
              </button>
            </div>

            {selected.hasAccess && selected.fileUrl ? (
              <div className="space-y-4">
                {purchaseSuccess && (
                  <TransactionSuccess
                    title="Unlocked successfully"
                    message={purchaseSuccess}
                    actionLabel="Open document"
                    onAction={() => openDocument(selected.fileUrl!)}
                    onDismiss={() => setPurchaseSuccess("")}
                    dismissLabel="Close"
                  />
                )}
                {!purchaseSuccess && (
                  <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                    <p className="mb-3 text-sm text-green-800">You have access to this publication.</p>
                    <button
                      type="button"
                      className="btn-primary w-full"
                      onClick={() => openDocument(selected.fileUrl!)}
                    >
                      Open document
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Unlock to read
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-900">
                    {formatGhc(selected.price ?? 0)}
                  </p>
                </div>

                {isResearcher(user.roleId) ? (
                  <p className="text-sm text-gray-600">Researchers cannot purchase publications.</p>
                ) : canPurchasePublication(user.roleId) ? (
                  <PaymentCheckout
                    totalLabel="Publication"
                    totalAmount={formatGhc(selected.price ?? 0)}
                    subtitle={`Payment goes to ${selected.researcher.name}`}
                    payLabel={`Pay ${formatGhc(selected.price ?? 0)} & unlock`}
                    onPay={handlePurchase}
                    submitting={purchasing}
                    error={purchaseError}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    Register as a Buyer or Student to purchase and read paid publications.
                  </p>
                )}
              </div>
            )}

            <PublicationComments
              publicationId={selected.id}
              canComment={!!selected.hasAccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}
