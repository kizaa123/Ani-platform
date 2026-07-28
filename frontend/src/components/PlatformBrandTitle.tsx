import { LogoIcon } from "@/components/Logo";

interface PlatformBrandTitleProps {
  /** "light" = white text on dark backgrounds; "dark" = dark text on light backgrounds */
  theme?: "light" | "dark";
  /** hero = homepage; panel = auth side panels; compact = mobile auth header */
  size?: "hero" | "panel" | "compact";
  showIcon?: boolean;
  className?: string;
}

const sizeStyles = {
  hero: {
    primary:
      "text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl",
    subtitle: "mt-2 text-lg font-medium tracking-wide sm:text-xl md:text-2xl",
    dash: "mr-2 font-light text-emerald-400/70",
  },
  panel: {
    primary: "text-3xl font-black leading-tight tracking-tight lg:text-4xl xl:text-5xl",
    subtitle: "mt-2 text-base font-medium tracking-wide lg:text-lg",
    dash: "mr-1.5 font-light text-emerald-400/70",
  },
  compact: {
    primary: "text-xl font-extrabold leading-tight tracking-tight sm:text-2xl",
    subtitle: "mt-1 text-sm font-medium tracking-wide",
    dash: "mr-1 font-light opacity-70",
  },
} as const;

export function PlatformBrandTitle({
  theme = "light",
  size = "hero",
  showIcon = false,
  className = "",
}: PlatformBrandTitleProps) {
  const styles = sizeStyles[size];
  const primaryColor = theme === "light" ? "text-white" : "text-brand-900";
  const subtitleColor =
    theme === "light" ? "text-emerald-300" : "text-brand-600";

  return (
    <div className={className}>
      {showIcon && (
        <LogoIcon
          theme={theme}
          className={`mb-4 ${size === "compact" ? "h-10 w-auto" : "h-12 w-auto lg:h-14"}`}
        />
      )}
      <p className={`${styles.primary} ${primaryColor}`}>
        Agricess Network International
      </p>
      <p className={`${styles.subtitle} ${subtitleColor}`}>
        <span className={styles.dash} aria-hidden="true">
          —
        </span>
        ANI
      </p>
    </div>
  );
}
