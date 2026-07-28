import { LogoIcon } from "@/components/Logo";

interface PlatformBrandTitleProps {
  /** "light" = white text on dark backgrounds; "dark" = dark text on light backgrounds */
  theme?: "light" | "dark";
  /** hero = homepage; panel = auth side panels; compact = mobile auth header */
  size?: "hero" | "panel" | "compact";
  showIcon?: boolean;
  showMotto?: boolean;
  className?: string;
}

const sizeStyles = {
  hero: {
    primary:
      "text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl",
    motto: "mt-0.5 text-lg font-medium tracking-wide sm:text-xl md:text-2xl",
    icon: "h-12 w-auto shrink-0 sm:h-14 md:h-16 lg:h-[4.5rem]",
    gap: "gap-2 sm:gap-3",
  },
  panel: {
    primary: "text-3xl font-black leading-tight tracking-tight lg:text-4xl xl:text-5xl",
    motto: "mt-0.5 text-base font-medium tracking-wide lg:text-lg",
    icon: "h-12 w-auto shrink-0 lg:h-14",
    gap: "gap-2",
  },
  compact: {
    primary: "text-xl font-black leading-tight tracking-tight sm:text-2xl",
    motto: "mt-0.5 text-sm font-medium tracking-wide",
    icon: "h-10 w-auto shrink-0",
    gap: "gap-2",
  },
} as const;

export function PlatformBrandTitle({
  theme = "light",
  size = "hero",
  showIcon = false,
  showMotto = true,
  className = "",
}: PlatformBrandTitleProps) {
  const styles = sizeStyles[size];
  const primaryColor = theme === "light" ? "text-white" : "text-brand-900";
  const mottoColor =
    theme === "light" ? "text-gold/90" : "text-brand-600";

  return (
    <div className={className}>
      <div className={`flex flex-col items-start gap-1 sm:flex-row sm:items-start ${styles.gap}`}>
        {showIcon && (
          <LogoIcon theme={theme} className={styles.icon} />
        )}
        <div className="min-w-0">
          <p className={`${styles.primary} ${primaryColor}`}>
            Agricess Network International
            <span aria-hidden="true"> - </span>
            <span className="text-gold">ANI</span>
          </p>
          {showMotto && (
            <p className={`${styles.motto} ${mottoColor}`}>
              Ghana&apos;s Agricultural Exchange
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
