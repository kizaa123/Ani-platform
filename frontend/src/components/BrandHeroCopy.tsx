import type { ReactNode } from "react";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";

const SUPPORTING =
  "Connecting verified fellows with clients. Secure commodity trading with full privacy protection.";

const MOTTO = "The Premier Commodity Exchange Platform";

type BrandHeroCopyProps = {
  /** Larger type for the homepage hero; panel matches login/register side branding */
  size?: "hero" | "panel";
  /** Optional CTAs under the copy (Join / Sign In on home) */
  actions?: ReactNode;
  className?: string;
  /** When false, skip ScrollReveal wrappers (e.g. already wrapped) */
  animate?: boolean;
};

function FellowsMeetMarkets({ size }: { size: "hero" | "panel" }) {
  const headingClass =
    size === "hero"
      ? "text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]"
      : "text-3xl font-bold leading-[1.15] tracking-tight text-white xl:text-4xl 2xl:text-[2.75rem]";

  const Tag = size === "hero" ? "h1" : "h2";

  return (
    <Tag className={`${headingClass} text-balance`}>
      Where Fellows{" "}
      <span className="whitespace-nowrap bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
        Meet Markets
      </span>
    </Tag>
  );
}

/**
 * Shared brand stack for home, login, and register:
 * Brand name → motto → headline → supporting line → optional actions.
 */
export function BrandHeroCopy({
  size = "hero",
  actions,
  className = "",
  animate = true,
}: BrandHeroCopyProps) {
  const supportClass =
    size === "hero"
      ? "text-lg font-light leading-relaxed text-brand-100 sm:text-xl md:text-2xl"
      : "max-w-xl text-lg font-light leading-relaxed text-brand-100/90 xl:text-xl";

  const stack = (
    <div className={`flex flex-col gap-5 sm:gap-6 ${className}`}>
      <PlatformBrandTitle theme="light" size={size} motto={MOTTO} />
      <FellowsMeetMarkets size={size} />
      <p className={`${supportClass} text-pretty`}>{SUPPORTING}</p>
      {actions ? <div className="pt-1">{actions}</div> : null}
    </div>
  );

  if (!animate) return stack;

  return (
    <div className={`flex flex-col gap-5 sm:gap-6 ${className}`}>
      <ScrollReveal trigger="mount" delay={scrollStagger(0, 80)} duration={500} direction="fade-up">
        <PlatformBrandTitle theme="light" size={size} motto={MOTTO} />
      </ScrollReveal>
      <ScrollReveal trigger="mount" delay={scrollStagger(1, 80)} duration={550} direction="fade-up">
        <FellowsMeetMarkets size={size} />
      </ScrollReveal>
      <ScrollReveal trigger="mount" delay={scrollStagger(2, 80)} duration={500} direction="fade-up">
        <p className={`${supportClass} text-pretty`}>{SUPPORTING}</p>
      </ScrollReveal>
      {actions ? (
        <ScrollReveal trigger="mount" delay={scrollStagger(3, 80)} duration={500} direction="fade-up">
          <div className="pt-1">{actions}</div>
        </ScrollReveal>
      ) : null}
    </div>
  );
}
