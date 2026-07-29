import { ProfilePhoto } from "@/components/FarmerAvatar";
import {
  AVATAR_BADGE_POSITIONS,
  TAG_STYLES,
  VerificationTagIcon,
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
};

const sizeMap = { sm: 48, md: 80, lg: 120, xl: 160 };

function resolveSize(size: AvatarWithVerificationProps["size"]): number {
  if (typeof size === "number") return size;
  return sizeMap[size ?? "sm"];
}

function badgeSize(avatarPx: number): string {
  if (avatarPx >= 120) return "h-7 w-7";
  if (avatarPx >= 80) return "h-6 w-6";
  if (avatarPx >= 52) return "h-5 w-5";
  return "h-4 w-4";
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
}: AvatarWithVerificationProps) {
  const px = resolveSize(size);
  const badges = getAvatarVerificationBadges(verificationTags, verificationStatus);
  const iconClass = badgeSize(px);

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-visible ${className}`}
      style={{ width: px, height: px }}
    >
      <ProfilePhoto
        src={src}
        name={name}
        size={px}
        cacheBust={cacheBust}
        onClick={onClick}
        className="!shadow-none"
      />
      {badges.map((tagType, index) => (
        <span
          key={tagType}
          className={AVATAR_BADGE_POSITIONS[index] ?? AVATAR_BADGE_POSITIONS[0]}
          title={TAG_STYLES[tagType].label}
        >
          <VerificationTagIcon tagType={tagType} className={`${iconClass} drop-shadow-sm`} />
        </span>
      ))}
    </div>
  );
}
