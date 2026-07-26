"use client";

import Link from "next/link";

interface LogoProps {
  /** "full" = Icon + Name + Tagline "together for all", "mark" = Icon only, "compact" = Icon + Name */
  variant?: "full" | "mark" | "compact";
  /** "dark" = for light backgrounds (dark text), "light" = for dark/green backgrounds (white text) */
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showTagline?: boolean;
}

export function LogoIcon({ className = "h-8 w-auto", theme = "dark" }: { className?: string; theme?: "dark" | "light" }) {
  const strokeColor = theme === "light" ? "#FFFFFF" : "#2C3238";
  return (
    <svg
      viewBox="0 0 68 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left Hexagon (Filled Green) */}
      <polygon
        points="20 4, 34 12, 34 28, 20 36, 6 28, 6 12"
        fill="#1F9D68"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Right Hexagon (Outline) */}
      <polygon
        points="48 4, 62 12, 62 28, 48 36, 34 28, 34 12"
        fill={theme === "light" ? "rgba(255,255,255,0.05)" : "none"}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  variant = "full",
  theme = "dark",
  size = "md",
  href,
  className = "",
  showTagline = true,
}: LogoProps) {
  const iconSizes = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-11 w-auto",
  };

  const titleSizes = {
    sm: "text-base font-extrabold tracking-tight",
    md: "text-xl font-black tracking-tight",
    lg: "text-2xl font-black tracking-tight",
  };

  const taglineSizes = {
    sm: "text-[9px] font-medium tracking-wider uppercase opacity-75 -mt-0.5",
    md: "text-[10px] font-semibold tracking-widest uppercase opacity-80 -mt-0.5",
    lg: "text-xs font-semibold tracking-widest uppercase opacity-85 -mt-0.5",
  };

  const isLight = theme === "light";
  const titleColor = isLight ? "text-white" : "text-brand-950";
  const taglineColor = isLight ? "text-brand-200" : "text-brand-600";

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoIcon className={iconSizes[size]} theme={theme} />
      {variant !== "mark" && (
        <div className="flex flex-col leading-none">
          <span className={`${titleSizes[size]} ${titleColor}`}>
            ANI Platform
          </span>
          {(showTagline || variant === "full") && (
            <span className={`${taglineSizes[size]} ${taglineColor}`}>
              together for all
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
