import { forwardRef, type ReactNode } from "react";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { authPanelBackgroundStyle, AUTH_HERO_BACKGROUND, AUTH_HERO_BACKGROUND_POSITION } from "@/lib/authImages";

type AuthHeroPanelProps = {
  className?: string;
  children?: ReactNode;
  /** Wider form card for multi-step registration */
  formWidth?: "default" | "wide";
};

/** Full-viewport hero for login/register — branding + form integrated on desktop (lg+). */
export const AuthHeroPanel = forwardRef<HTMLDivElement, AuthHeroPanelProps>(function AuthHeroPanel(
  { className = "", children, formWidth = "default" },
  ref
) {
  const formWidthClass =
    formWidth === "wide" ? "lg:max-w-md xl:max-w-xl" : "lg:max-w-sm xl:max-w-md";

  return (
    <div
      className={`relative flex min-h-[calc(100dvh-11rem)] w-full flex-1 flex-col overflow-hidden bg-brand-50 lg:min-h-[calc(100dvh-9rem)] lg:bg-brand-900 ${className}`}
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

      {/* Content — mobile: stacked; desktop: row with space-between */}
      <div className="relative z-20 flex min-h-0 flex-1 flex-col justify-center gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-10 xl:gap-16 xl:p-14">
        {/* Branding & headline — desktop only */}
        <div className="hidden min-w-0 flex-1 flex-col gap-7 lg:flex xl:max-w-2xl xl:gap-8">
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
            className="space-y-5"
          >
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl 2xl:text-[2.75rem]">
              Where Fellows{" "}
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                Meet Markets
              </span>
            </h2>
            <p className="max-w-xl text-lg font-light leading-relaxed text-brand-100/90 xl:text-xl">
              Connecting verified fellows with clients. Secure commodity trading with full privacy protection.
            </p>
          </ScrollReveal>
        </div>

        {/* Form column */}
        <div className={`w-full shrink-0 ${formWidthClass}`}>
          <div className="mb-5 text-center lg:hidden">
            <PlatformBrandTitle theme="dark" size="compact" />
          </div>

          <div
            ref={ref}
            className="auth-hero-form-card w-full overflow-y-auto rounded-2xl border border-white/20 bg-white p-6 shadow-[0_4px_24px_-4px_rgba(27,67,50,0.12),0_12px_48px_-8px_rgba(27,67,50,0.18)] sm:p-8 lg:max-h-[min(72vh,720px)] lg:p-7 xl:p-8"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
