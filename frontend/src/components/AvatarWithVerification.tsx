import { ProfilePhoto } from "@/components/FarmerAvatar";
import {
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

const sizeMap = { sm: 56, md: 96, lg: 140, xl: 180 };

function resolveSize(size: AvatarWithVerificationProps["size"]): number {
  if (typeof size === "number") return size;
  return sizeMap[size ?? "sm"];
}

function badgeSize(avatarPx: number): string {
  if (avatarPx >= 140) return "h-7 w-7";
  if (avatarPx >= 96) return "h-6 w-6";
  if (avatarPx >= 56) return "h-5 w-5";
  return "h-4 w-4";
}

function badgeOverlap(avatarPx: number): string {
  if (avatarPx >= 140) return "-ml-2";
  if (avatarPx >= 96) return "-ml-1.5";
  return "-ml-1";
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
  const overlapClass = badgeOverlap(px);

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
      {badges.length > 0 && (
        <div className="absolute -bottom-0.5 -right-0.5 z-10 flex items-end justify-end">
          {badges.map((tagType, index) => (
            <span
              key={tagType}
              className={`${index > 0 ? overlapClass : ""} drop-shadow-sm`}
              style={{ zIndex: index + 1 }}
              title={TAG_STYLES[tagType].label}
            >
              <VerificationTagIcon tagType={tagType} className={iconClass} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
