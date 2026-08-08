"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { PublisherLibrary, ResearchComment, ResearchPublication } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { LibraryPublicationCard } from "@/components/LibraryPublicationCard";
import { PublicationAccessPaymentModal } from "@/components/PublicationAccessPaymentModal";
import { PublicationCommentsModal } from "@/components/PublicationCommentsModal";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import { CardGridSkeleton, PageContentSkeleton } from "@/components/LoadingPrimitives";
import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/ScrollReveal";
import { InlineNameWithVerificationTags } from "@/components/VerificationTagBadge";
import { scrollStagger } from "@/lib/scrollStagger";

export default function PublisherLibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const publisherId = params.id as string;

  const [library, setLibrary] = useState<PublisherLibrary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [payPublication, setPayPublication] = useState<ResearchPublication | null>(null);
  const [commentsPublication, setCommentsPublication] = useState<ResearchPublication | null>(null);
  const [publicationComments, setPublicationComments] = useState<ResearchComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [readingPublication, setReadingPublication] = useState<ResearchPublication | null>(null);

  const load = useCallback(() => {
    setDataLoading(true);
    setLoadError("");
    api.research
      .getPublisher(publisherId)
      .then((data) => {
        setLibrary(data);
        const counts: Record<string, number> = {};
        data.publications.forEach((p) => {
          counts[p.id] = p.viewCount;
        });
        setViewCounts(counts);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load publisher"))
      .finally(() => setDataLoading(false));
  }, [publisherId]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router, load]);

  const updatePublication = (pubId: string, patch: Partial<ResearchPublication>) => {
    setLibrary((prev) => {
      if (!prev) return prev;
      const publications = prev.publications.map((p) => (p.id === pubId ? { ...p, ...patch } : p));
      return {
        ...prev,
        publisher: {
          ...prev.publisher,
          canViewFiles: true,
        },
        publications,
      };
    });
    setPayPublication((prev) => (prev?.id === pubId ? { ...prev, ...patch } : prev));
    setCommentsPublication((prev) => (prev?.id === pubId ? { ...prev, ...patch } : prev));
  };

  const handleLike = (pubId: string, result: { liked: boolean; likesCount: number }) => {
    updatePublication(pubId, { likedByMe: result.liked, likesCount: result.likesCount });
  };

  const handleShare = (pubId: string, sharesCount: number) => {
    updatePublication(pubId, { sharesCount });
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
    load();
  };

  const handleReadNow = async (pub: ResearchPublication) => {
    await recordView(pub.id);
    setReadingPublication(pub);
  };

  const loadDocument = useCallback(
    () => api.research.openDocument(readingPublication!.id),
    [readingPublication]
  );

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  const publisher = library?.publisher;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ScrollReveal trigger="mount" delay={0} duration={450} direction="fade-up" className="mb-6">
        <Link
          href="/library"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Back to library
        </Link>

        {publisher && (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <AvatarWithVerification
              src={publisher.profilePicture}
              name={publisher.name}
              size="lg"
              verificationStatus={publisher.verificationStatus}
              verificationTags={publisher.verificationTags}
              tagPlacement="none"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-brand-900 sm:text-2xl">
                <InlineNameWithVerificationTags
                  name={publisher.name}
                  verificationTags={publisher.verificationTags}
                  verificationStatus={publisher.verificationStatus}
                  nameClassName="font-extrabold text-brand-900"
                  tagSize="md"
                />
              </h1>
            </div>
          </div>
        )}
      </ScrollReveal>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{loadError}</p>
      )}

      {dataLoading ? (
        <CardGridSkeleton count={3} columns="sm:grid-cols-2 lg:grid-cols-3" imageHeight="h-28" />
      ) : !library || library.publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications found for this publisher.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {library.publications.map((pub, i) => (
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
                sharePath={`/library/publisher/${publisherId}?pub=${pub.id}`}
              />
            </ScrollReveal>
          ))}
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

      <PdfViewerModal
        title={readingPublication?.title ?? "Publication"}
        open={!!readingPublication}
        onClose={() => setReadingPublication(null)}
        loadUrl={loadDocument}
      />
    </div>
  );
}
