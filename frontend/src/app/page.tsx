
import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icons";
import { PortalNavCard } from "@/components/PortalNavCard";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { AnimatedStat } from "@/components/AnimatedStat";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { HOW_IT_WORKS_IMAGES } from "@/lib/homepageImages";

const STATS = [
  { value: "10,000+", label: "Verified Users" },
  { value: "54+", label: "Districts Covered" },
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
    desc: "Request connections, chat securely, finalise orders and track financials — all in one protected platform.",
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
    img: "/ANI Director of Research and Quality Assurance .png",
  },
];

/**
 * Role card images — swap any path below with your own file under frontend/public/.
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
    desc: "Register as a crop fellow to list produce, manage prices and delivery schedules, and track interested clients — all from one dashboard.",
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
    desc: "List aquaculture produce, manage pond yields and delivery windows, and connect with clients sourcing fresh fish across Ghana.",
    image: ROLE_CARD_IMAGES.fishFarmer,
  },
  {
    icon: "cart",
    label: "Client",
    desc: "Browse verified farms, preview listings for free, unlock full fellow details, purchase research publications, and source commodities securely.",
    image: ROLE_CARD_IMAGES.client,
  },
  {
    icon: "book",
    label: "Student",
    desc: "Access the Research Library, purchase and read agricultural publications, and learn from verified field research published by ANI researchers.",
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
    desc: "Access agricultural data, publish field research, and connect with fellows and clients to support evidence-based farming across the region.",
    image: ROLE_CARD_IMAGES.researcher,
  },
  {
    icon: "users",
    label: "Organization",
    desc: "Register as an institution or cooperative to source commodities, manage procurement, and coordinate trade through ANI liaison officers.",
    image: ROLE_CARD_IMAGES.organization,
  },
];

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative flex min-h-[min(100dvh,720px)] items-end overflow-hidden bg-brand-900 sm:min-h-[85vh] sm:items-center lg:min-h-[92vh]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/comprehensive-world-flags-collection-stunning-national-flag-images-every-project-showcase-beauty-diversity-global-360726791.webp"
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
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <ScrollReveal trigger="mount" delay={0} duration={500} direction="fade-up">
              <PlatformBrandTitle
                theme="light"
                size="hero"
                motto="The Premier Commodity Exchange Platform"
                className="mb-6 sm:mb-8"
              />
            </ScrollReveal>

            <ScrollReveal trigger="mount" delay={scrollStagger(2, 100)} duration={550} direction="fade-up">
              <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Where Fellows{" "}
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                  Meet Markets
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal trigger="mount" delay={scrollStagger(3, 100)} duration={500} direction="fade-up">
              <p className="mb-10 text-xl font-light leading-relaxed text-brand-100 md:text-2xl">
                connecting verified fellows with clients. Secure commodity trading with full privacy protection.
              </p>
            </ScrollReveal>

            <ScrollReveal trigger="mount" delay={scrollStagger(4, 100)} duration={500} direction="fade-up">
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 text-base font-bold text-brand-900 shadow-lg transition-all hover:scale-105 hover:bg-yellow-300"
                >
                  <Icon name="sprout" className="h-5 w-5" />
                  Join ANI
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/60 hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-brand-800 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-3 gap-6">
            {STATS.map((s, i) => (
              <ScrollReveal key={s.label} delay={scrollStagger(i, 90)} duration={450} direction="fade-up">
                <div className="text-center">
                  <p className="text-3xl font-black tabular-nums text-yellow-400">
                    <AnimatedStat value={s.value} delay={scrollStagger(i, 90)} />
                  </p>
                  <p className="mt-1 text-sm font-medium text-brand-200">{s.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className="bg-brand-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <ScrollReveal className="mb-12 text-center" duration={500} direction="fade-up">
            <span className="mb-3 inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              Built for Everyone
            </span>
            <h2 className="text-4xl font-black text-brand-900">One Platform, Many Roles</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              Whether you grow it, buy it, or broker it — ANI has a tailored experience designed for your role.
            </p>
          </ScrollReveal>
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
          <ScrollReveal className="mb-14 text-center" duration={500} direction="fade-up">
            <span className="mb-3 inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              Simple Process
            </span>
            <h2 className="text-4xl font-black text-brand-900">How It Works</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              Four simple steps from registration to closed deal — all protected by our secure escrow system.
            </p>
          </ScrollReveal>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, i) => (
              <ScrollReveal key={item.step} delay={scrollStagger(i, 100)} duration={500} direction="fade-up">
                <div className="card-elevated group flex h-full flex-col overflow-hidden rounded-2xl bg-white">
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-brand-900/25 to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm">
                        {item.step}
                      </span>
                      <h3 className="font-bold text-brand-900">{item.title}</h3>
                    </div>
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
          {/* Section header */}
          <ScrollReveal className="mb-16 text-center" duration={500} direction="fade-up">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-600/50 bg-brand-800/60 px-5 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              The People Behind It
            </span>
            <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              Meet Our{" "}
              <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                Team
              </span>
            </h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-yellow-400/0 via-yellow-400 to-yellow-400/0" />
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-brand-300">
              A passionate team of agricultural and technology experts dedicated to transforming African commodity trading.
            </p>
          </ScrollReveal>

          {/* Team cards grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member, i) => (
              <ScrollReveal key={member.name} delay={scrollStagger(i, 120)} duration={600} direction="fade-up">
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-700/50 bg-brand-900 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-yellow-500/30 hover:shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
                  <div className="relative aspect-[4/3] max-h-56 w-full shrink-0 overflow-hidden bg-brand-800 sm:max-h-60">
                    <Image
                      src={member.img}
                      alt={member.name}
                      fill
                      className="object-cover object-[center_18%] transition-transform duration-700 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_100%,rgba(116,198,157,0.18),transparent_70%),linear-gradient(to_top,rgba(64,145,108,0.22)_0%,rgba(82,183,136,0.08)_40%,transparent_70%)]"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-2.5 px-6 py-6">
                    <div className="space-y-1">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 py-24 text-white">
        <div className="absolute inset-0 bg-[url('/login_cover.png')] bg-cover bg-center opacity-10" />
        <ScrollReveal className="relative z-10 mx-auto max-w-3xl px-6 text-center" duration={550} direction="fade-up">
          <h2 className="mb-4 text-4xl font-black leading-tight md:text-5xl">
            Ready to Transform How You Trade?
          </h2>
          <p className="mb-10 text-xl leading-relaxed text-brand-100">
            Join thousands of fellows, clients, and liaison officers already using ANI to trade commodities safely and efficiently across Ghana.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 text-base font-bold text-brand-900 shadow-lg transition-all hover:scale-105 hover:bg-yellow-300"
            >
              <Icon name="sprout" className="h-5 w-5" />
              Create Free Account
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Marketplace
            </Link>
          </div>
        </ScrollReveal>
      </section>

    </div>
  );
}
