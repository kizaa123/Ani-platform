import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { authPanelBackgroundStyle, AUTH_HERO_BACKGROUND, AUTH_HERO_BACKGROUND_POSITION } from "@/lib/authImages";

/** Left-side hero panel shared by login and register — matches the home page hero. */
export function AuthHeroPanel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-brand-900 flex-col justify-start gap-8 p-12 lg:p-16 text-white min-h-[500px] ${className}`}
    >
      <div
        className="absolute inset-0 z-0"
        style={authPanelBackgroundStyle(AUTH_HERO_BACKGROUND, AUTH_HERO_BACKGROUND_POSITION)}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_85%_60%_at_50%_35%,rgba(116,198,157,0.28),transparent_68%),linear-gradient(135deg,rgba(82,183,136,0.18)_0%,transparent_50%,rgba(64,145,108,0.1)_100%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-brand-900/90 via-brand-900/75 to-brand-900/60 sm:bg-gradient-to-r sm:from-brand-950/95 sm:via-brand-900/80 sm:to-brand-800/30" />

      <ScrollReveal trigger="mount" delay={scrollStagger(0, 80)} duration={500} direction="fade-up" className="relative z-20">
        <PlatformBrandTitle
          theme="light"
          size="panel"
          motto="The Premier Commodity Exchange Platform"
        />
      </ScrollReveal>

      <ScrollReveal trigger="mount" delay={scrollStagger(1, 80)} duration={550} direction="fade-up" className="relative z-20 max-w-xl space-y-6">
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
          Where Fellows{" "}
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
            Meet Markets
          </span>
        </h2>
        <p className="text-lg font-light leading-relaxed text-brand-100 md:text-xl">
          Connecting verified fellows with clients. Secure commodity trading with full privacy protection.
        </p>
      </ScrollReveal>
    </div>
  );
}
