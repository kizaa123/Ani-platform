import { LogoIcon } from "@/components/Logo";

interface PlatformBrandTitleProps {
  /** "light" = white text on dark backgrounds; "dark" = dark text on light backgrounds */
  theme?: "light" | "dark";
  /** hero = homepage; panel = auth side panels; compact = mobile auth header */
  size?: "hero" | "panel" | "compact";
  showIcon?: boolean;
  showMotto?: boolean;
  /** Override default motto text */
  motto?: string;
  className?: string;
}

const sizeStyles = {
  hero: {
    primary:
      "text-[1.35rem] font-black leading-snug tracking-tight sm:text-3xl md:text-4xl lg:text-[2.65rem]",
    motto: "mt-2 text-sm font-semibold tracking-[0.04em] sm:text-base md:text-lg",
    icon: "h-12 w-auto shrink-0 sm:h-14 md:h-16 lg:h-[4.5rem]",
    gap: "gap-3 sm:gap-4",
  },
  panel: {
    primary: "text-2xl font-black leading-snug tracking-tight lg:text-3xl xl:text-[2.35rem]",
    motto: "mt-2 text-sm font-semibold tracking-[0.04em] lg:text-base xl:text-lg",
    icon: "h-12 w-auto shrink-0 lg:h-14",
    gap: "gap-3",
  },
  compact: {
    primary: "text-base font-black leading-snug tracking-tight sm:text-lg",
    motto: "mt-1.5 text-xs font-semibold tracking-[0.04em]",
    icon: "h-10 w-auto shrink-0",
    gap: "gap-2",
  },
} as const;

const DEFAULT_MOTTO = "The Premier Commodity Exchange Platform";

/** Brand line that keeps "— ANI" with the name (no orphaned ANI). */
export function BrandNameLine({
  className = "",
  aniClassName = "text-gold",
}: {
  className?: string;
  aniClassName?: string;
}) {
  return (
    <span className={className}>
      Agricess Network International
      <span className="whitespace-nowrap">
        {" "}
        — <span className={aniClassName}>ANI</span>
      </span>
    </span>
  );
}

export function PlatformBrandTitle({
  theme = "light",
  size = "hero",
  showIcon = false,
  showMotto = true,
  motto = DEFAULT_MOTTO,
  className = "",
}: PlatformBrandTitleProps) {
  const styles = sizeStyles[size];
  const primaryColor = theme === "light" ? "text-white" : "text-brand-900";
  const mottoColor = theme === "light" ? "text-gold" : "text-brand-600";

  const title = (
    <p className={`${styles.primary} ${primaryColor}`}>
      <BrandNameLine />
    </p>
  );

  const mottoEl = showMotto ? (
    <p className={`${styles.motto} ${mottoColor}`}>{motto}</p>
  ) : null;

  return (
    <div className={className}>
      {showIcon ? (
        <div className={`flex flex-col items-start sm:flex-row sm:items-start ${styles.gap}`}>
          <LogoIcon theme={theme} className={styles.icon} />
          <div className="min-w-0">
            {title}
            {mottoEl}
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          {title}
          {mottoEl}
        </div>
      )}
    </div>
  );
}
