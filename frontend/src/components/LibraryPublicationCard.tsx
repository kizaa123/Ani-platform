"use client";

import { useState } from "react";
import { ResearchPublication } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { Icon } from "@/components/icons";
import { PublicationCoverImage } from "@/components/PublicationCoverImage";
import { formatGhc } from "@/lib/format";
import { api } from "@/lib/api";

interface LibraryPublicationCardProps {
  pub: ResearchPublication;
  viewCount: number;
  onPayToAccess: (pub: ResearchPublication) => void;
  onReadNow: (pub: ResearchPublication) => void;
  onComment: (pub: ResearchPublication) => void;
  onLike: (pubId: string, result: { liked: boolean; likesCount: number }) => void;
  onShare: (pubId: string, sharesCount: number) => void;
  sharePath?: string;
}

function PublicationActionButton({
  pub,
  onPayToAccess,
  onReadNow,
}: Pick<LibraryPublicationCardProps, "pub" | "onPayToAccess" | "onReadNow">) {
  const hasAccess = pub.hasAccess || !pub.isLocked;

  if (hasAccess) {
    return (
      <button
        type="button"
        onClick={() => onReadNow(pub)}
        className="btn-primary w-full py-2.5 text-sm"
      >
        Read now
      </button>
    );
  }

  const priceLabel = pub.isFree ? null : formatGhc(pub.price ?? 0);

  return (
    <button
      type="button"
      onClick={() => onPayToAccess(pub)}
      className="btn-gold inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
    >
      <Icon name="lock" className="h-4 w-4 shrink-0" />
      Pay to access{priceLabel ? ` (${priceLabel})` : ""}
    </button>
  );
}

export function LibraryPublicationCard({
  pub,
  viewCount,
  onPayToAccess,
  onReadNow,
  onComment,
  onLike,
  onShare,
  sharePath,
}: LibraryPublicationCardProps) {
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
          ? `${window.location.origin}${sharePath ?? `/library/publisher/${pub.researcher.id}?pub=${pub.id}`}`
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
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <PublicationCoverImage
        coverImage={pub.coverImage}
        title={pub.title}
        className="rounded-none"
        aspectClass="aspect-[2/1]"
      />

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AvatarWithVerification
            src={pub.researcher.profilePicture}
            name={pub.researcher.name}
            size="md"
            verificationStatus={pub.researcher.verificationStatus}
            verificationTags={pub.researcher.verificationTags}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-700">{pub.researcher.name}</p>
          </div>
        </div>

        <h3 className="line-clamp-2 font-bold leading-snug text-brand-900">{pub.title}</h3>

        {pub.description && (
          <p className="line-clamp-2 text-xs leading-snug text-gray-600">{pub.description}</p>
        )}

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
            onClick={() => onComment(pub)}
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

        <div className="mt-auto pt-2">
          <PublicationActionButton
            pub={pub}
            onPayToAccess={onPayToAccess}
            onReadNow={onReadNow}
          />
        </div>
      </div>
    </article>
  );
}
