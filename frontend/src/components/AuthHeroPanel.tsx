import { forwardRef, type ReactNode } from "react";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { authPanelBackgroundStyle, AUTH_HERO_BACKGROUND, AUTH_HERO_BACKGROUND_POSITION } from "@/lib/authImages";

type AuthHeroPanelProps = {
  className?: string;
  children?: ReactNode;
};

/** Full-viewport hero for login/register — branding + form integrated on desktop (lg+). */
export const AuthHeroPanel = forwardRef<HTMLDivElement, AuthHeroPanelProps>(function AuthHeroPanel(
  { className = "", children },
  ref
) {
  return (
    <div
      ref={ref}
      className={`relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-brand-50 p-6 sm:p-8 lg:min-h-full lg:justify-between lg:bg-brand-900 lg:p-12 lg:text-white xl:p-16 ${className}`}
    >
      {/* Hero imagery — desktop only */}
      <div
        className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
        style={authPanelBackgroundStyle(AUTH_HERO_BACKGROUND, AUTH_HERO_BACKGROUND_POSITION)}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[5] hidden bg-[radial-gradient(ellipse_85%_60%_at_50%_35%,rgba(116,198,157,0.28),transparent_68%),linear-gradient(135deg,rgba(82,183,136,0.18)_0%,transparent_50%,rgba(64,145,108,0.1)_100%)] lg:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 hidden bg-gradient-to-b from-brand-900/90 via-brand-900/75 to-brand-900/60 lg:block lg:bg-gradient-to-br lg:from-brand-950/95 lg:via-brand-900/82 lg:to-brand-800/40"
        aria-hidden="true"
      />

      {/* Branding & headline — desktop only */}
      <div className="relative z-20 hidden shrink-0 flex-col gap-8 lg:flex">
        <ScrollReveal trigger="mount" delay={scrollStagger(0, 80)} duration={500} direction="fade-up">
          <PlatformBrandTitle
            theme="light"
            size="panel"
            motto="The Premier Commodity Exchange Platform"
          />
        </ScrollReveal>

        <ScrollReveal
          trigger="mount"
          delay={scrollStagger(1, 80)}
          duration={550}
          direction="fade-up"
          className="max-w-2xl space-y-5"
        >
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Where Fellows{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
              Meet Markets
            </span>
          </h2>
          <p className="max-w-xl text-lg font-light leading-relaxed text-brand-100 xl:text-xl">
            Connecting verified fellows with clients. Secure commodity trading with full privacy protection.
          </p>
        </ScrollReveal>
      </div>

      {/* Form slot — mobile brand + page content */}
      <div className="relative z-20 mx-auto w-full max-w-xl shrink-0 lg:mx-0 lg:max-w-lg xl:max-w-xl auth-hero-form">
        <div className="mb-6 text-center lg:hidden">
          <PlatformBrandTitle theme="dark" size="compact" />
        </div>
        {children}
      </div>
    </div>
  );
});
