import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";

const MOTTO = "The Premier Commodity Exchange Platform";
const SUPPORTING =
  "Connecting verified fellows with clients. Secure commodity trading with full privacy protection.";

type BrandHeroCopyProps = {
  /** Larger type for the homepage hero; panel matches login/register side branding */
  size?: "hero" | "panel";
  /** Optional CTAs under the copy (Join / Sign In on home) */
  actions?: ReactNode;
  className?: string;
};

const SIZE = {
  hero: {
    brand:
      "text-[1.35rem] font-black leading-snug tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.65rem]",
    motto:
      "text-sm font-semibold tracking-[0.04em] text-gold sm:text-base md:text-lg",
    headline:
      "text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl",
    support:
      "max-w-xl text-base font-light leading-relaxed text-brand-100/95 sm:text-lg md:text-xl",
    stack: "gap-3 sm:gap-4",
  },
  panel: {
    brand:
      "text-2xl font-black leading-snug tracking-tight text-white lg:text-3xl xl:text-[2.35rem]",
    motto: "text-sm font-semibold tracking-[0.04em] text-gold lg:text-base xl:text-lg",
    headline:
      "text-2xl font-bold leading-snug tracking-tight text-white xl:text-3xl 2xl:text-4xl",
    support: "max-w-xl text-base font-light leading-relaxed text-brand-100/90 xl:text-lg",
    stack: "gap-3 xl:gap-4",
  },
} as const;

/** Brand line: full name flows; "— ANI" never orphans alone. */
function BrandLine({ className }: { className: string }) {
  return (
    <p className={className}>
      Agricess Network International
      <span className="whitespace-nowrap">
        {" "}
        — <span className="text-gold">ANI</span>
      </span>
    </p>
  );
}

function Headline({ className, as: Tag }: { className: string; as: "h1" | "h2" }) {
  return (
    <Tag className={className}>
      Where Fellows{" "}
      <span className="whitespace-nowrap bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
        Meet Markets
      </span>
    </Tag>
  );
}

/**
 * Shared brand stack for home, login, and register — same order & style:
 * 1. Agricess Network International — ANI
 * 2. The Premier Commodity Exchange Platform
 * 3. Where Fellows Meet Markets
 * 4. Supporting sentence
 * 5. Optional actions
 */
export function BrandHeroCopy({
  size = "hero",
  actions,
  className = "",
}: BrandHeroCopyProps) {
  const s = SIZE[size];
  const HeadingTag = size === "hero" ? "h1" : "h2";

  return (
    <div className={`flex flex-col ${s.stack} ${className}`}>
      <ScrollReveal trigger="mount" delay={scrollStagger(0, 70)} duration={480} direction="fade-up">
        <BrandLine className={s.brand} />
      </ScrollReveal>

      <ScrollReveal trigger="mount" delay={scrollStagger(1, 70)} duration={480} direction="fade-up">
        <p className={s.motto}>{MOTTO}</p>
      </ScrollReveal>

      <ScrollReveal trigger="mount" delay={scrollStagger(2, 70)} duration={520} direction="fade-up">
        <Headline className={s.headline} as={HeadingTag} />
      </ScrollReveal>

      <ScrollReveal trigger="mount" delay={scrollStagger(3, 70)} duration={480} direction="fade-up">
        <p className={s.support}>{SUPPORTING}</p>
      </ScrollReveal>

      {actions ? (
        <ScrollReveal trigger="mount" delay={scrollStagger(4, 70)} duration={480} direction="fade-up">
          <div className="pt-2 sm:pt-3">{actions}</div>
        </ScrollReveal>
      ) : null}
    </div>
  );
}
