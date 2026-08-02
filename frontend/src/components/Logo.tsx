"use client";

import Link from "next/link";

interface LogoProps {
  /** "full" = Icon + ANI + Tagline, "mark" = Icon only, "compact" = Icon + ANI only */
  variant?: "full" | "mark" | "compact";
  /** "dark" = for light backgrounds (dark text), "light" = for dark/green backgrounds (white text) */
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showTagline?: boolean;
}

export function LogoIcon({ className = "h-9 w-auto", theme = "dark" }: { className?: string; theme?: "dark" | "light" }) {
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
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Right Hexagon (Outline) */}
      <polygon
        points="48 4, 62 12, 62 28, 48 36, 34 28, 34 12"
        fill={theme === "light" ? "rgba(255,255,255,0.08)" : "none"}
        stroke={strokeColor}
        strokeWidth="2.5"
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
    sm: "h-8 w-auto flex-shrink-0",
    md: "h-10 w-auto flex-shrink-0",
    lg: "h-14 w-auto flex-shrink-0",
  };

  // "ANI" - the brand mark
  const brandSizes = {
    sm: "text-xl font-extrabold tracking-tight leading-none",
    md: "text-2xl font-extrabold tracking-tight leading-none",
    lg: "text-4xl font-extrabold tracking-tight leading-none",
  };

  // Platform subtitle - compact form for nav & sidebars
  const taglineSizes = {
    sm: "text-[9px] font-medium tracking-wide leading-none mt-1 opacity-80",
    md: "text-[10px] font-medium tracking-wide leading-none mt-1 opacity-80",
    lg: "text-[11px] font-medium tracking-wide leading-none mt-1.5 opacity-80",
  };

  const brandColor = theme === "light" ? "text-white" : "text-gray-900";
  const taglineColor = theme === "light" ? "text-emerald-100" : "text-emerald-600";

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoIcon className={iconSizes[size]} theme={theme} />
      {variant !== "mark" && (
        <div className="flex flex-col justify-center">
          <span className={`${brandSizes[size]} ${brandColor}`}>ANI</span>
          {(showTagline || variant === "full") && (
            <span className={`${taglineSizes[size]} ${taglineColor}`}>
              Agricess Network International
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-85">
        {content}
      </Link>
    );
  }

  return content;
}
