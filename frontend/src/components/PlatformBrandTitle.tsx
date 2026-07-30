import { LogoIcon } from "@/components/Logo";

interface PlatformBrandTitleProps {
  /** "light" = white text on dark backgrounds; "dark" = dark text on light backgrounds */
  theme?: "light" | "dark";
  /** hero = homepage; panel = auth side panels; compact = mobile auth header */
  size?: "hero" | "panel" | "compact";
  showIcon?: boolean;
  showMotto?: boolean;
  /** Override default motto text (e.g. homepage hero headline) */
  motto?: string;
  className?: string;
}

const sizeStyles = {
  hero: {
    primary:
      "text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl",
    motto: "mt-1.5 text-base font-semibold tracking-wide sm:text-lg md:text-xl",
    icon: "h-12 w-auto shrink-0 sm:h-14 md:h-16 lg:h-[4.5rem]",
    gap: "gap-2 sm:gap-3",
  },
  panel: {
    primary: "text-2xl font-black leading-tight tracking-tight lg:text-3xl xl:text-4xl",
    motto: "mt-1.5 text-sm font-semibold tracking-wide lg:text-base",
    icon: "h-12 w-auto shrink-0 lg:h-14",
    gap: "gap-2",
  },
  compact: {
    primary: "text-lg font-black leading-tight tracking-tight sm:text-xl",
    motto: "mt-1 text-xs font-semibold tracking-wide",
    icon: "h-10 w-auto shrink-0",
    gap: "gap-2",
  },
} as const;

const DEFAULT_MOTTO = "The Premier Commodity Exchange Platform";

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
  const mottoColor =
    theme === "light" ? "text-gold" : "text-brand-600";

  return (
    <div className={className}>
      {showIcon ? (
        <div className={`flex flex-col items-start gap-1 sm:flex-row sm:items-start ${styles.gap}`}>
          <LogoIcon theme={theme} className={styles.icon} />
          <div className="min-w-0">
            <p className={`${styles.primary} ${primaryColor}`}>
              Agricess Network International
              <span aria-hidden="true"> - </span>
              <span className="text-gold">ANI</span>
            </p>
            {showMotto && (
              <p className={`${styles.motto} ${mottoColor}`}>
                {motto}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <p className={`${styles.primary} ${primaryColor}`}>
            Agricess Network International
            <span aria-hidden="true"> - </span>
            <span className="text-gold">ANI</span>
          </p>
          {showMotto && (
            <p className={`${styles.motto} ${mottoColor}`}>
              {motto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
