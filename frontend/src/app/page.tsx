
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icons";
import { PortalNavCard } from "@/components/PortalNavCard";
import { BrandHeroCopy } from "@/components/BrandHeroCopy";
import { AnimatedStat } from "@/components/AnimatedStat";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { HOW_IT_WORKS_IMAGES } from "@/lib/homepageImages";

const STATS = [
  { value: "1,000+", label: "Verified Users" },
  { value: "50+", label: "Districts Covered" },
  { value: "100%", label: "Secure Transactions" },
];

const HOW_IT_WORKS: { step: number; title: string; desc: string; image: string }[] = [
  {
    step: 1,
    title: "Fellows Register",
    desc: "Create a verified profile, select your crops or livestock, and list your commodities with prices, quantities and delivery dates.",
    image: HOW_IT_WORKS_IMAGES.farmersRegister,
  },
  {
    step: 2,
    title: "Clients Pay for Access",
    desc: "Browse previews freely. Pay a one-time access fee to unlock full fellow data, quantities, contact details and direct messaging.",
    image: HOW_IT_WORKS_IMAGES.buyersPay,
  },
  {
    step: 3,
    title: "Agents Represent",
    desc: "Fellow Liaison Officers and Client Liaison Officers negotiate on behalf of clients, manage relationships and streamline deals.",
    image: HOW_IT_WORKS_IMAGES.agentsRepresent,
  },
  {
    step: 4,
    title: "Connect & Trade",
    desc: "Request connections, chat securely, finalise orders and track financials - all in one protected platform.",
    image: HOW_IT_WORKS_IMAGES.connectTrade,
  },
];

const TEAM = [
  {
    name: "Obeng Stephen Boakye",
    role: "Founder and Chief Executive Officer ",
    bio: "Entrepreneur | Supply Chain Strategist | Business Consultant | Diplomatic & Global Partnerships Strategist | Global Food Systems Advocate | Sustainable Development Enthusiast.",
    img: "/ANI Founder and Chief Executive Officer.png",
  },
  {
    name: "Gloria Bless Dzogbenyuie ",
    role: "Chief Communications Officer ",
    bio: "Procurement & Supply Chain Professional | Strategic Communications | Sustainable Agriculture Advocate | Youth & Climate Development Enthusiast.",
    img: "/ANI Chief Communications Officer.png",
  },
  {
    name: "Lawrence Kennedy Kwarteng ",
    role: "Director of Research and Quality Assurance",
    bio: "Head of Extension/Plant Doctor | Agricultural Extension Specialist | 15+ Years Farmer Advisory Experience | Crop Health & Sustainable Agriculture Advocate.",
    img: "/Replace ANI Director.png",
  },
];

/**
 * Role card images - swap any path below with your own file under frontend/public/.
 * Place images in public/roles/ (e.g. public/roles/crop-farmer.jpg) and update the matching entry.
 */
const ROLE_CARD_IMAGES = {
  cropFarmer: "/famer on pitch.jpg",
  livestockFarmer: "/herd-of-cattle-grazing-in-green-pasture-looking-at-camera-photo.jpg",
  fruitFarmer: "/portrait-happy-farmer-couple-holding-baskets-vegetables-fruits-vineyard-77869777.webp",
  fishFarmer: "/fish-farmer-holding-freshly-caught-fish-aquaculture-farm-fish-farmer-holding-freshly-caught-fish-fish-farm-demonstrating-372101156.webp",
  client: "/farmer and buyer.jpg",
  student: "/agricultural-students-woman-evaluating-crop-growth-notes-focused-documenting-plant-health-check-vegetable-growth-problems-465673929.webp",
  organization: "/CropsBlaringhem-LowRes-265.jpg",
  handler: "/farmer and her agent.webp",
  researcher: "/Agric researchers.jpg",
} as const;

const ROLE_CARDS: { icon: IconName; label: string; desc: string; image: string }[] = [
  {
    icon: "sprout",
    label: "Crop Fellow",
    desc: "Register as a crop fellow to list produce, manage prices and delivery schedules, and track interested clients - all from one dashboard.",
    image: ROLE_CARD_IMAGES.cropFarmer,
  },
  {
    icon: "wheat",
    label: "Livestock Fellow",
    desc: "Showcase your livestock, set availability and pricing, and connect with clients and liaison officers who are ready to trade.",
    image: ROLE_CARD_IMAGES.livestockFarmer,
  },
  {
    icon: "leaf",
    label: "Fruit Fellow",
    desc: "Highlight seasonal fruits, orchard yields and delivery windows so clients can discover and order fresh produce directly from your farm.",
    image: ROLE_CARD_IMAGES.fruitFarmer,
  },
  {
    icon: "leaf",
    label: "Fish Fellow",
    desc: "List aquaculture produce, manage pond yields and delivery windows, and connect with clients sourcing fresh fish across the region.",
    image: ROLE_CARD_IMAGES.fishFarmer,
  },
  {
    icon: "cart",
    label: "Client",
    desc: "Browse verified products, preview listings for free, unlock full fellow details, purchase research publications, and source commodities securely.",
    image: ROLE_CARD_IMAGES.client,
  },
  {
    icon: "book",
    label: "Student",
    desc: "Access the Research Library, purchase and read publications, and learn from verified field research published by ANI researchers.",
    image: ROLE_CARD_IMAGES.student,
  },
  {
    icon: "handshake",
    label: "Liaison Officer",
    desc: "Represent fellows or clients, manage relationships, negotiate deals, and streamline transactions on behalf of your clients.",
    image: ROLE_CARD_IMAGES.handler,
  },
  {
    icon: "book",
    label: "Researcher",
    desc: "Discover knowledge, publish with confidence, and collaborate across disciplines to solve real-world challenges.",
    image: ROLE_CARD_IMAGES.researcher,
  },
  {
    icon: "users",
    label: "Organization",
    desc: "Register as an institution or cooperative to source commodities, manage procurement, and coordinate trade through ANI liaison officers.",
    image: ROLE_CARD_IMAGES.organization,
  },
];

function SectionHeader({
  badge,
  title,
  subtitle,
  theme = "light",
}: {
  badge: string;
  title: ReactNode;
  subtitle: string;
  theme?: "light" | "dark";
}) {
  const isDark = theme === "dark";
  return (
    <ScrollReveal className="mb-14 text-center" duration={500} direction="fade-up">
      <span
        className={`mb-4 inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-widest ${
          isDark
            ? "border border-brand-600/50 bg-brand-800/60 text-yellow-400 backdrop-blur-sm"
            : "border border-brand-200 bg-brand-100/80 text-brand-700"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isDark ? "bg-yellow-400" : "bg-brand-600"}`} />
        {badge}
      </span>
      <h2
        className={`text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.75rem] ${
          isDark ? "text-white" : "text-brand-900"
        }`}
      >
        {title}
      </h2>
      <div
        className={`mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r ${
          isDark
            ? "from-yellow-400/0 via-yellow-400 to-yellow-400/0"
            : "from-brand-500/0 via-brand-500 to-brand-500/0"
        }`}
      />
      <p
        className={`mx-auto mt-5 max-w-xl text-base leading-relaxed ${
          isDark ? "text-brand-300" : "text-gray-500"
        }`}
      >
        {subtitle}
      </p>
    </ScrollReveal>
  );
}

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative flex min-h-[min(100dvh,720px)] items-end overflow-hidden bg-brand-900 sm:min-h-[85vh] sm:items-center lg:min-h-[92vh]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/edited flag for the ani bag.jpg"
            alt="Agricultural field background"
            fill
            className="object-cover object-[center_25%] sm:object-center"
            sizes="100vw"
            priority
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_35%,rgba(116,198,157,0.28),transparent_68%),linear-gradient(135deg,rgba(82,183,136,0.18)_0%,transparent_50%,rgba(64,145,108,0.1)_100%)]"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/90 via-brand-900/75 to-brand-900/60 sm:bg-gradient-to-r sm:from-brand-950/95 sm:via-brand-900/80 sm:to-brand-800/30" />
          {/* Smooth fade into the stats band */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-950 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <BrandHeroCopy
              size="hero"
              actions={
                <div className="flex w-full max-w-xl flex-row gap-3 sm:gap-4">
                  <Link
                    href="/register"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-4 text-sm font-bold text-brand-900 shadow-[0_8px_30px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.02] hover:bg-yellow-300 sm:px-8 sm:text-base sm:min-w-[12rem]"
                  >
                    <Icon name="sprout" className="h-5 w-5 shrink-0" />
                    Join ANI
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/5 px-4 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/60 hover:bg-white/10 sm:px-8 sm:text-base sm:min-w-[12rem]"
                  >
                    Sign In
                  </Link>
                </div>
              }
            />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 sm:block">
          <div className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/25 p-1.5">
            <span className="h-2 w-1 animate-bounce rounded-full bg-yellow-400" />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative bg-brand-950 py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            {STATS.map((s, i) => (
              <ScrollReveal key={s.label} delay={scrollStagger(i, 90)} duration={450} direction="fade-up">
                <div className="px-3 text-center sm:px-6">
                  <p className="text-3xl font-black tabular-nums text-yellow-400 sm:text-4xl lg:text-[2.75rem]">
                    <AnimatedStat value={s.value} delay={scrollStagger(i, 90)} />
                  </p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300 sm:text-xs">
                    {s.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className="relative bg-brand-50 py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6">
          <SectionHeader
            badge="Built for Everyone"
            title={
              <>
                One Platform,{" "}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  Many Roles
                </span>
              </>
            }
            subtitle="Whether you produce it, buy it, or broker it — ANI has a tailored experience designed for your role."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_CARDS.map((r, i) => (
              <ScrollReveal key={r.label} delay={scrollStagger(i, 100)} duration={500} direction="fade-up">
                <PortalNavCard
                  href="/login"
                  title={r.label}
                  desc={r.desc}
                  icon={r.icon}
                  image={r.image}
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeader
            badge="Simple Process"
            title={
              <>
                How It{" "}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  Works
                </span>
              </>
            }
            subtitle="Four simple steps from registration to closed deal — all protected by our secure escrow system."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, i) => (
              <ScrollReveal key={item.step} delay={scrollStagger(i, 100)} duration={500} direction="fade-up">
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-xl">
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-brand-900/25 to-transparent" />
                    <span className="absolute bottom-3 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-brand-900 shadow-lg ring-2 ring-white/60">
                      {item.step}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-500">
                      Step {item.step} of 4
                    </p>
                    <h3 className="text-lg font-bold text-brand-900 transition-colors group-hover:text-brand-700">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="relative overflow-hidden bg-brand-950 py-28">
        {/* Decorative background grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        {/* Radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <SectionHeader
            theme="dark"
            badge="The People Behind It"
            title={
              <>
                Meet Our{" "}
                <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  Team
                </span>
              </>
            }
            subtitle="A passionate team of industry and technology experts committed to transforming trade across Africa and beyond."
          />

          {/* Team cards grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member, i) => (
              <ScrollReveal key={member.name} delay={scrollStagger(i, 120)} duration={600} direction="fade-up">
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-700/50 bg-gradient-to-b from-brand-900 to-brand-950 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-yellow-500/30 hover:shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
                  <div className="flex justify-center px-6 pt-8">
                    <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl bg-gradient-to-b from-brand-800 to-brand-900 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
                      <Image
                        src={member.img}
                        alt={member.name}
                        fill
                        className="object-contain object-center p-1 transition-transform duration-700 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 45vw, 220px"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(64,145,108,0.12)_0%,transparent_45%)]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-6 text-center">
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-bold leading-snug text-white transition-colors duration-300 group-hover:text-yellow-300">
                        {member.name.trim()}
                      </h3>
                      <p className="text-sm font-semibold leading-snug text-yellow-400">
                        {member.role.trim()}
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed text-brand-200">
                      {member.bio
                        .split("|")
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>


      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 py-28 text-white">
        <div className="absolute inset-0 bg-[url('/login_cover.png')] bg-cover bg-center opacity-10" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

        <ScrollReveal className="relative z-10 mx-auto max-w-3xl px-6 text-center" duration={550} direction="fade-up">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            Get Started Today
          </span>
          <h2 className="mb-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
            Ready to Transform{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
              How You Trade?
            </span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-brand-100 md:text-xl">
            Join fellows, clients, and liaison officers using ANI to trade commodities safely and efficiently across Africa and beyond.
          </p>
          <div className="mx-auto flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 text-base font-bold text-brand-900 shadow-[0_8px_30px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.02] hover:bg-yellow-300 sm:min-w-[13rem]"
            >
              <Icon name="sprout" className="h-5 w-5" />
              Create Free Account
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/70 hover:bg-white/10 sm:min-w-[13rem]"
            >
              Browse Marketplace
            </Link>
          </div>
          <p className="mt-6 text-sm text-brand-200">
            Free to join · Verified community · Secure escrow payments
          </p>
        </ScrollReveal>
      </section>

    </div>
  );
}
