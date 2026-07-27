import { ProfilePhoto } from "@/components/FarmerAvatar";
import { VerifiedBadgeIcon } from "@/components/VerificationBadge";

type AvatarWithVerificationProps = {
  src?: string | null;
  name?: string;
  size?: number | "sm" | "md" | "lg" | "xl";
  cacheBust?: number;
  verificationStatus?: string | null;
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
  className = "",
  onClick,
}: AvatarWithVerificationProps) {
  const px = resolveSize(size);
  const isVerified = verificationStatus === "VERIFIED";

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-visible ${isVerified ? "mb-2" : ""} ${className}`}
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
      {isVerified && (
        <span
          className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2"
          title="Verified User"
        >
          <VerifiedBadgeIcon className={`${badgeSize(px)} drop-shadow-sm`} />
        </span>
      )}
    </div>
  );
}
