import type { CSSProperties } from "react";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import {
  VerificationTags,
  getAvatarVerificationBadges,
} from "@/components/VerificationTagBadge";
import type { UserVerificationTag } from "@/lib/types";

type AvatarWithVerificationProps = {
  src?: string | null;
  name?: string;
  size?: number | "sm" | "md" | "lg" | "xl";
  cacheBust?: number;
  verificationStatus?: string | null;
  verificationTags?: UserVerificationTag[];
  className?: string;
  onClick?: () => void;
  /** Where to place verification badges relative to the avatar */
  tagPlacement?: "overlay" | "below" | "none";
};

const sizeMap = { sm: 56, md: 96, lg: 140, xl: 180 };

function resolveSize(size: AvatarWithVerificationProps["size"]): number {
  if (typeof size === "number") return size;
  return sizeMap[size ?? "sm"];
}

function tagSizeForAvatar(avatarPx: number): "xs" | "sm" | "md" {
  if (avatarPx >= 120) return "md";
  if (avatarPx >= 72) return "sm";
  return "xs";
}

/** Anchor badge cluster to the avatar's bottom-right rim (~4–5 o'clock). */
function edgeBadgeStyle(avatarPx: number): CSSProperties {
  const nudge = Math.max(2, Math.round(avatarPx * 0.08));
  return {
    bottom: -nudge,
    right: -nudge,
  };
}

export function AvatarWithVerification({
  src,
  name,
  size = "sm",
  cacheBust,
  verificationStatus,
  verificationTags,
  className = "",
  onClick,
  tagPlacement = "overlay",
}: AvatarWithVerificationProps) {
  const px = resolveSize(size);
  const badges = getAvatarVerificationBadges(verificationTags, verificationStatus);
  const hasTags = badges.length > 0 && tagPlacement !== "none";
  const tagSize = tagSizeForAvatar(px);

  const tags = hasTags ? (
    <VerificationTags
      verificationTags={verificationTags}
      verificationStatus={verificationStatus}
      size={tagSize}
      showLabels={false}
      layout="row"
      className={tagPlacement === "overlay" ? "gap-0.5 !justify-end" : undefined}
      badgeClassName={
        tagPlacement === "overlay" ? "ring-2 ring-white shadow-sm" : undefined
      }
    />
  ) : null;

  if (tagPlacement === "overlay") {
    return (
      <div className={`relative inline-flex shrink-0 ${className}`}>
        <ProfilePhoto
          src={src}
          name={name}
          size={px}
          cacheBust={cacheBust}
          onClick={onClick}
          className="!shadow-none"
        />
        {tags && (
          <div
            className="pointer-events-none absolute z-10 flex flex-row items-end justify-end"
            style={edgeBadgeStyle(px)}
          >
            {tags}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex shrink-0 flex-col items-center gap-1.5 ${className}`}>
      <ProfilePhoto
        src={src}
        name={name}
        size={px}
        cacheBust={cacheBust}
        onClick={onClick}
        className="!shadow-none"
      />
      {tags}
    </div>
  );
}
