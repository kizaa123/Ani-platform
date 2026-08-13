"use client";

import { useEffect, useState } from "react";
import { PublisherBrowseCard } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { QualificationBadges } from "@/components/QualificationBadges";
import { VerificationTags } from "@/components/VerificationTagBadge";

interface LibraryPublisherCardProps {
  publisher: PublisherBrowseCard;
  onViewFiles: (publisher: PublisherBrowseCard) => void;
}

function useMinWidth(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function PublisherActionButton({
  publisher,
  onViewFiles,
}: LibraryPublisherCardProps) {
  return (
    <button
      type="button"
      onClick={() => onViewFiles(publisher)}
      className="btn-primary w-full py-2.5 text-sm"
    >
      View files
    </button>
  );
}

export function LibraryPublisherCard({ publisher, onViewFiles }: LibraryPublisherCardProps) {
  const isSm = useMinWidth("(min-width: 640px)");
  const isLg = useMinWidth("(min-width: 1024px)");
  const avatarSize = isLg ? "lg" : isSm ? "md" : "sm";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md sm:p-5">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <AvatarWithVerification
          src={publisher.profilePicture}
          name={publisher.name}
          size={avatarSize}
          verificationStatus={publisher.verificationStatus}
          verificationTags={publisher.verificationTags}
          tagPlacement="none"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="flex min-w-0 items-center gap-1 text-sm font-bold leading-snug text-brand-900">
            <span className="min-w-0 truncate">{publisher.name}</span>
            <VerificationTags
              verificationTags={publisher.verificationTags}
              verificationStatus={publisher.verificationStatus}
              size={isSm ? "sm" : "xs"}
              layout="row"
              className="inline-flex shrink-0"
            />
          </h3>
          {publisher.institution && (
            <p className="truncate text-sm text-brand-700">{publisher.institution}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {publisher.publicationCount} publication{publisher.publicationCount === 1 ? "" : "s"}
          </p>
          <QualificationBadges qualifications={publisher.qualifications} className="mt-2" />
        </div>
      </div>

      {publisher.bio && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-600">{publisher.bio}</p>
      )}

      <div className="mt-auto pt-4">
        <PublisherActionButton publisher={publisher} onViewFiles={onViewFiles} />
      </div>
    </article>
  );
}
