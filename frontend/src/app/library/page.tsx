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
import { CardGridSkeleton, PageContentSkeleton, SpinnerLabel } from "@/components/LoadingPrimitives";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
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
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet. Be the first to share your thoughts.</p>
      ) : (
        <ul className="mb-4 max-h-48 space-y-3 overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
                  {comment.user.profilePicture ? (
                    <ProfilePhoto
                      src={comment.user.profilePicture}
                      name={comment.user.name}
                      size={28}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs font-bold text-gray-400">
                      {comment.user.name.charAt(0)}
                    </div>
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
            {submitting ? <SpinnerLabel label="Posting..." className="h-4 w-4" /> : "Post comment"}
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
  onReadNow,
  onLike,
  onShare,
}: {
  pub: ResearchPublication;
  viewCount: number;
  onView: (pub: ResearchPublication) => void;
  onReadNow: (pub: ResearchPublication) => void;
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
    <article className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-md transition hover:border-brand-200 hover:shadow-lg">
      <PublicationCoverImage
        coverImage={pub.coverImage}
        title={pub.title}
        className="rounded-none"
        aspectClass="aspect-[2/1]"
      />

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-100 bg-white shadow-xs">
            {pub.researcher.profilePicture ? (
              <ProfilePhoto
                src={pub.researcher.profilePicture}
                name={pub.researcher.name}
                size={44}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm font-bold text-gray-400">
                {pub.researcher.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-gray-700">{pub.researcher.name}</span>
            <VerificationBadge status={pub.researcher.verificationStatus} />
          </div>
        </div>

        <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900">{pub.title}</h3>

        <p className="line-clamp-2 text-xs leading-snug text-gray-600">
          <span className="font-semibold text-gray-800">Qualifications: </span>
          {pub.description ||
            "PhD Crop Science (KNUST), MSc Sustainable Agriculture (UCC), Senior Agronomist at CSIR-Crops Research Institute. 15+ years experience in climate-resilient farming."}
        </p>

        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
          <span className="flex items-center gap-1 font-medium text-gray-600">
            <Icon name="eye" className="h-3.5 w-3.5 text-gray-500" />
            {viewCount}
          </span>

          <span className="text-sm font-bold text-brand-700">
            {pub.isFree ? "Free" : formatGhc(pub.price ?? 0)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            className="flex items-center justify-center gap-1 rounded-lg bg-emerald-100/70 px-1.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                pub.likedByMe
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-200/80 text-emerald-800"
              }`}
            >
              <Icon name="thumbs-up" className="h-3 w-3" />
            </span>
            <span>{pub.likesCount > 0 ? pub.likesCount : "Like"}</span>
          </button>

          <button
            type="button"
            onClick={() => onView(pub)}
            className="flex items-center justify-center gap-1 rounded-lg bg-emerald-100/70 px-1.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
          >
            <Icon name="comment" className="h-3 w-3 shrink-0" />
            <span>{(pub.commentsCount ?? 0) > 0 ? pub.commentsCount : "Comment"}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center justify-center gap-1 rounded-lg bg-emerald-100/70 px-1.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
          >
            <Icon name="share" className="h-3 w-3 shrink-0" />
            <span>{pub.sharesCount > 0 ? pub.sharesCount : "Share"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => (pub.isLocked ? onView(pub) : onReadNow(pub))}
          className="mt-auto w-full rounded-xl bg-brand-700 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 active:scale-98"
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
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResearchPublication | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [loadError, setLoadError] = useState("");
  const [modalLiking, setModalLiking] = useState(false);
  const [modalSharing, setModalSharing] = useState(false);

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

  const load = (q?: string) => {
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
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setDataLoading(false));
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDataLoading(true);
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

  const handleReadNow = async (pub: ResearchPublication) => {
    try {
      const { viewCount } = await api.research.recordView(pub.id);
      setViewCounts((prev) => ({ ...prev, [pub.id]: viewCount }));
    } catch {
      // non-blocking
    }

    if (pub.fileUrl) {
      openDocument(pub.fileUrl);
      return;
    }

    try {
      const full = await api.research.get(pub.id);
      if (full.fileUrl) {
        openDocument(full.fileUrl);
        return;
      }
    } catch {
      /* fall through to modal */
    }

    await handleView(pub);
  };

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ScrollReveal trigger="mount" delay={0} duration={450} direction="fade-up" className="mb-6">
        <h1 className="text-3xl font-extrabold text-brand-900">Research Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse books and research publications by farming category
        </p>
      </ScrollReveal>

      <ScrollReveal trigger="mount" delay={80} duration={450} direction="fade-up" className="mb-8">
      <form onSubmit={handleSearch} className="flex gap-3">
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
      </ScrollReveal>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError}
        </p>
      )}

      {dataLoading ? (
        <CardGridSkeleton count={4} columns="sm:grid-cols-2" imageHeight="h-28" />
      ) : publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications found.
        </div>
      ) : (
        <div className="space-y-8">
          {PUBLICATION_CATEGORY_ORDER.map((category, sectionIndex) => {
            const items = groupedPublications[category];
            if (items.length === 0) return null;
            return (
              <ScrollReveal
                key={category}
                delay={scrollStagger(sectionIndex, 100)}
                duration={500}
                direction="fade-up"
              >
              <section
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm"
              >
                <div className="border-b border-brand-50 px-4 py-3 sm:px-5 sm:py-4">
                  <h2 className="text-lg font-bold text-brand-900 sm:text-xl">
                    {PUBLICATION_CATEGORY_LABELS[category]}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {items.length} publication{items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-1 snap-x snap-mandatory scrollbar-hide sm:gap-6">
                    {items.map((pub, i) => (
                      <ScrollReveal
                        key={pub.id}
                        delay={scrollStagger(i, 80)}
                        duration={450}
                        direction="fade-up"
                        className="w-80 shrink-0 snap-start sm:w-[22rem]"
                      >
                        <PublicationCard
                          pub={pub}
                          viewCount={viewCounts[pub.id] ?? pub.viewCount}
                          onView={handleView}
                          onReadNow={handleReadNow}
                          onLike={handleLike}
                          onShare={handleShare}
                        />
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </section>
              </ScrollReveal>
            );
          })}
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
                className="flex items-center gap-1.5 rounded-xl bg-emerald-100/70 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                    selected.likedByMe
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-200/80 text-emerald-800"
                  }`}
                >
                  <Icon name="thumbs-up" className="h-3.5 w-3.5" />
                </span>
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
                    actionLabel="Read PDF"
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
                      Read PDF
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
