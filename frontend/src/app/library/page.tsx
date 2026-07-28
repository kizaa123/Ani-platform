"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ResearchComment, ResearchPublication } from "@/lib/types";
import {
  PUBLICATION_CATEGORY_LABELS,
  PUBLICATION_CATEGORY_ORDER,
  groupPublicationsByCategory,
} from "@/lib/publicationCategories";
import { Icon } from "@/components/icons";
import { LibraryPublicationCard } from "@/components/LibraryPublicationCard";
import { PublicationAccessPaymentModal } from "@/components/PublicationAccessPaymentModal";
import { CardGridSkeleton, PageContentSkeleton, SpinnerLabel } from "@/components/LoadingPrimitives";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PublicationCommentsModal({
  publication,
  comments,
  commentsLoading,
  canComment,
  onClose,
  onCommentAdded,
}: {
  publication: ResearchPublication;
  comments: ResearchComment[];
  commentsLoading: boolean;
  canComment: boolean;
  onClose: () => void;
  onCommentAdded: (comment: ResearchComment) => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      const comment = await api.research.comments.add(publication.id, trimmed);
      onCommentAdded(comment);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-brand-900">{publication.title}</h2>
            <p className="mt-1 text-sm text-gray-500">Comments</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {commentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet. Be the first to share your thoughts.</p>
          ) : (
            <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
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
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payPublication, setPayPublication] = useState<ResearchPublication | null>(null);
  const [commentsPublication, setCommentsPublication] = useState<ResearchPublication | null>(null);
  const [publicationComments, setPublicationComments] = useState<ResearchComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState("");
  const [readingPublication, setReadingPublication] = useState<ResearchPublication | null>(null);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");

  const groupedPublications = useMemo(
    () => groupPublicationsByCategory(publications),
    [publications]
  );

  const updatePublication = (pubId: string, patch: Partial<ResearchPublication>) => {
    setPublications((prev) => prev.map((p) => (p.id === pubId ? { ...p, ...patch } : p)));
    setPayPublication((prev) => (prev?.id === pubId ? { ...prev, ...patch } : prev));
    setCommentsPublication((prev) => (prev?.id === pubId ? { ...prev, ...patch } : prev));
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

  const recordView = async (pubId: string) => {
    try {
      const { viewCount } = await api.research.recordView(pubId);
      setViewCounts((prev) => ({ ...prev, [pubId]: viewCount }));
    } catch {
      // non-blocking
    }
  };

  const handlePayToAccess = (pub: ResearchPublication) => {
    if (pub.isFree || pub.hasAccess || !pub.isLocked) {
      void handleReadNow(pub);
      return;
    }
    setPayPublication(pub);
  };

  const handleComment = async (pub: ResearchPublication) => {
    if (pub.isLocked && !pub.hasAccess) {
      setPayPublication(pub);
      return;
    }
    setCommentsPublication(pub);
    setPublicationComments([]);
    setCommentsLoading(true);
    try {
      const comments = await api.research.comments.list(pub.id);
      setPublicationComments(comments);
    } catch {
      setPublicationComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAccessPaymentSuccess = (updated: ResearchPublication) => {
    updatePublication(updated.id, {
      isLocked: false,
      hasAccess: true,
      fileUrl: updated.fileUrl,
    });
    setDataLoading(true);
    load(search.trim() || undefined);
  };

  const closeReader = useCallback(() => {
    setReadingPublication(null);
    setReaderError("");
    setReaderUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (readerUrl) URL.revokeObjectURL(readerUrl);
    };
  }, [readerUrl]);

  const openPublicationReader = async (pub: ResearchPublication) => {
    setReadingPublication(pub);
    setReaderLoading(true);
    setReaderError("");
    setReaderUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const url = await api.research.openDocument(pub.id);
      setReaderUrl(url);
    } catch (e) {
      setReaderError(e instanceof Error ? e.message : "Could not load publication");
    } finally {
      setReaderLoading(false);
    }
  };

  const handleReadNow = async (pub: ResearchPublication) => {
    await recordView(pub.id);
    await openPublicationReader(pub);
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
          <button
            type="submit"
            className="rounded-2xl bg-brand-800 px-6 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-900"
          >
            Search
          </button>
        </form>
      </ScrollReveal>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{loadError}</p>
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
                <section className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
                  <div className="border-b border-brand-50 px-4 py-3 sm:px-5 sm:py-4">
                    <h2 className="text-lg font-bold text-brand-900 sm:text-xl">
                      {PUBLICATION_CATEGORY_LABELS[category]}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {items.length} publication{items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((pub, i) => (
                        <ScrollReveal
                          key={pub.id}
                          delay={scrollStagger(i, 80)}
                          duration={450}
                          direction="fade-up"
                        >
                          <LibraryPublicationCard
                            pub={pub}
                            viewCount={viewCounts[pub.id] ?? pub.viewCount}
                            onPayToAccess={handlePayToAccess}
                            onReadNow={handleReadNow}
                            onComment={handleComment}
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

      {payPublication && (
        <PublicationAccessPaymentModal
          publication={payPublication}
          userRoleId={user.roleId}
          onClose={() => setPayPublication(null)}
          onSuccess={handleAccessPaymentSuccess}
          onReadNow={handleReadNow}
        />
      )}

      {commentsPublication && (
        <PublicationCommentsModal
          publication={commentsPublication}
          comments={publicationComments}
          commentsLoading={commentsLoading}
          canComment={!!commentsPublication.hasAccess || !commentsPublication.isLocked}
          onClose={() => setCommentsPublication(null)}
          onCommentAdded={(comment) => setPublicationComments((prev) => [...prev, comment])}
        />
      )}

      {readingPublication && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-brand-900">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-800 bg-brand-900 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{readingPublication.title}</p>
              <p className="text-xs text-brand-200">In-platform reader — download disabled</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-brand-100 hover:bg-brand-800"
              onClick={closeReader}
              aria-label="Close reader"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1 bg-brand-950">
            {readerLoading && (
              <div className="flex h-full items-center justify-center">
                <SpinnerLabel label="Loading publication…" />
              </div>
            )}
            {readerError && !readerLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-red-200">{readerError}</p>
                <button type="button" className="btn-outline" onClick={closeReader}>
                  Close
                </button>
              </div>
            )}
            {readerUrl && !readerLoading && !readerError && (
              <iframe
                title={readingPublication.title}
                src={`${readerUrl}#toolbar=0&navpanes=0`}
                className="h-full w-full border-0 bg-white"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
