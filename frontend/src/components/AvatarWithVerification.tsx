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
  /**
   * Where to place verification badges relative to the avatar.
   * "auto" (default) hides tags on avatars 72px or smaller; use "overlay" or "below" to force.
   */
  tagPlacement?: "auto" | "overlay" | "below" | "none";
};

const sizeMap = { sm: 56, md: 96, lg: 140, xl: 180 };
/** Avatars of 72px or smaller hide verification tags unless placement is forced. */
const MIN_TAG_AVATAR_PX = 72;

function resolveSize(size: AvatarWithVerificationProps["size"]): number {
  if (typeof size === "number") return size;
  return sizeMap[size ?? "sm"];
}

function tagSizeForAvatar(avatarPx: number): "xs" | "sm" | "md" {
  if (avatarPx >= 120) return "md";
  if (avatarPx >= MIN_TAG_AVATAR_PX) return "sm";
  return "xs";
}

function resolveTagPlacement(
  tagPlacement: NonNullable<AvatarWithVerificationProps["tagPlacement"]>,
  avatarPx: number,
): "overlay" | "below" | "none" {
  if (tagPlacement === "none") return "none";
  if (tagPlacement === "below") return "below";
  if (tagPlacement === "overlay") return "overlay";
  return avatarPx > MIN_TAG_AVATAR_PX ? "overlay" : "none";
}

/** Anchor badge cluster to the avatar's bottom-right rim (~4-5 o'clock). */
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
  tagPlacement = "auto",
}: AvatarWithVerificationProps) {
  const px = resolveSize(size);
  const placement = resolveTagPlacement(tagPlacement, px);
  const badges = getAvatarVerificationBadges(verificationTags, verificationStatus);
  const hasTags = badges.length > 0 && placement !== "none";
  const tagSize = tagSizeForAvatar(px);

  const tags = hasTags ? (
    <VerificationTags
      verificationTags={verificationTags}
      verificationStatus={verificationStatus}
      size={tagSize}
      showLabels={false}
      layout="row"
      className={placement === "overlay" ? "gap-0.5 !justify-end" : undefined}
      badgeClassName={
        placement === "overlay" ? "drop-shadow-xs" : undefined
      }
    />
  ) : null;

  if (placement === "overlay") {
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
    <div className={`inline-flex shrink-0 flex-col items-center gap-1 ${className}`}>
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
