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
  /** Where to place verification pills relative to the avatar */
  tagPlacement?: "below" | "none";
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

export function AvatarWithVerification({
  src,
  name,
  size = "sm",
  cacheBust,
  verificationStatus,
  verificationTags,
  className = "",
  onClick,
  tagPlacement = "below",
}: AvatarWithVerificationProps) {
  const px = resolveSize(size);
  const badges = getAvatarVerificationBadges(verificationTags, verificationStatus);
  const hasTags = badges.length > 0 && tagPlacement !== "none";
  const tagSize = tagSizeForAvatar(px);

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
      {hasTags && (
        <VerificationTags
          verificationTags={verificationTags}
          verificationStatus={verificationStatus}
          size={tagSize}
          layout="row"
          className="px-0.5"
        />
      )}
    </div>
  );
}
