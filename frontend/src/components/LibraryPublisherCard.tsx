"use client";

import { PublisherBrowseCard } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { QualificationBadges } from "@/components/QualificationBadges";
import { Icon } from "@/components/icons";

interface LibraryPublisherCardProps {
  publisher: PublisherBrowseCard;
  onViewFiles: (publisher: PublisherBrowseCard) => void;
}

function PublisherActionButton({
  publisher,
  onViewFiles,
}: LibraryPublisherCardProps) {
  if (publisher.canViewFiles) {
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

  return (
    <button
      type="button"
      onClick={() => onViewFiles(publisher)}
      className="btn-gold inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
    >
      <Icon name="lock" className="h-4 w-4 shrink-0" />
      Unlock files
    </button>
  );
}

export function LibraryPublisherCard({ publisher, onViewFiles }: LibraryPublisherCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <AvatarWithVerification
          src={publisher.profilePicture}
          name={publisher.name}
          size="lg"
          verificationStatus={publisher.verificationStatus}
          verificationTags={publisher.verificationTags}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-brand-900">{publisher.name}</h3>
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
