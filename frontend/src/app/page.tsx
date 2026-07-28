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
    title: "Farmers Register",
    desc: "Create a verified profile, select your crops or livestock, and list your commodities with prices, quantities and harvest dates.",
    image: HOW_IT_WORKS_IMAGES.farmersRegister,
  },
  {
    step: 2,
    title: "Buyers Pay for Access",
    desc: "Browse previews freely. Pay a one-time access fee to unlock full farmer data, quantities, contact details and direct messaging.",
    image: HOW_IT_WORKS_IMAGES.buyersPay,
  },
  {
    step: 3,
    title: "Agents Represent",
    desc: "Farmer Handlers and Buyer Handlers negotiate on behalf of clients, manage relationships and streamline deals.",
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
    name: "Kwame Asante",
    role: "CEO & Co-Founder",
    bio: "Agricultural economist with 12 years connecting Ghanaian farmers to global markets.",
    img: "/team_1.png",
  },
  {
    name: "Abena Mensah",
    role: "Head of Operations",
    bio: "Supply chain expert driving seamless commodity trading experiences across West Africa.",
    img: "/team_2.png",
  },
  {
    name: "Kofi Boateng",
    role: "Chief Technology Officer",
    bio: "Full-stack engineer building secure, scalable infrastructure for agricultural exchanges.",
    img: "/team_3.png",
  },
];

/**
 * Role card images — swap any path below with your own file under frontend/public/.
 * Place images in public/roles/ (e.g. public/roles/crop-farmer.jpg) and update the matching entry.
 */
const ROLE_CARD_IMAGES = {
  cropFarmer: "/famer on pitch.jpg",       // Change image here: Crop Farmer card
  livestockFarmer: "/herd-of-cattle-grazing-in-green-pasture-looking-at-camera-photo.jpg",  // Change image here: Livestock Farmer card
  fruitFarmer: "/portrait-happy-farmer-couple-holding-baskets-vegetables-fruits-vineyard-77869777.webp",      // Change image here: Fruit Farmer card
  buyer: "/farmer and buyer.jpg",            // Change image here: Buyer card
  handler: "/farmer and her agent.webp",          // Change image here: Handler card
  researcher: "/Agric researchers.jpg",       // Change image here: Researcher card
} as const;

const ROLE_CARDS: { icon: IconName; label: string; desc: string; image: string }[] = [
  {
    icon: "sprout",
    label: "Crop Farmer",
    desc: "Register as a crop farmer to list produce, manage prices and harvest schedules, and track interested buyers — all from one dashboard.",
    image: ROLE_CARD_IMAGES.cropFarmer,
  },
  {
    icon: "wheat",
    label: "Livestock Farmer",
    desc: "Showcase your livestock, set availability and pricing, and connect with buyers and agents who are ready to trade.",
    image: ROLE_CARD_IMAGES.livestockFarmer,
  },
  {
    icon: "leaf",
    label: "Fruit Farmer",
    desc: "Highlight seasonal fruits, orchard yields and delivery windows so buyers can discover and order fresh produce directly from your farm.",
    image: ROLE_CARD_IMAGES.fruitFarmer,
  },
  {
    icon: "cart",
    label: "Buyer",
    desc: "Browse verified farms, preview listings for free, and unlock full farmer details to source commodities securely across Ghana.",
    image: ROLE_CARD_IMAGES.buyer,
  },
  {
    icon: "handshake",
    label: "Handler",
    desc: "Represent farmers or buyers, manage relationships, negotiate deals, and streamline transactions on behalf of your clients.",
    image: ROLE_CARD_IMAGES.handler,
  },
  {
    icon: "book",
    label: "Researcher",
    desc: "Access agricultural data, publish field research, and connect with farmers and buyers to support evidence-based farming across the region.",
    image: ROLE_CARD_IMAGES.researcher,
  },
];

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-brand-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/ani background color.jpg"
            alt="Agricultural field background"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-900/80 to-brand-800/30" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <ScrollReveal trigger="mount" delay={0} duration={500} direction="fade-up">
              <PlatformBrandTitle theme="light" size="hero" showIcon className="mb-8" />
            </ScrollReveal>

            <ScrollReveal trigger="mount" delay={scrollStagger(2, 100)} duration={550} direction="fade-up">
              <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Where Farmers{" "}
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                  Meet Markets
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal trigger="mount" delay={scrollStagger(3, 100)} duration={500} direction="fade-up">
              <p className="mb-10 text-xl font-light leading-relaxed text-brand-100 md:text-2xl">
                Connect verified farmers with trusted buyers across Ghana. Secure commodity trading with full privacy protection until payment is complete.
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
      <section className="bg-brand-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <ScrollReveal className="mb-14 text-center" duration={500} direction="fade-up">
            <span className="mb-3 inline-block rounded-full bg-brand-700 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-200">
              The People Behind It
            </span>
            <h2 className="text-4xl font-black text-white">Meet Our Team</h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-300">
              A passionate team of agricultural and technology experts dedicated to transforming African commodity trading.
            </p>
          </ScrollReveal>
          <div className="grid gap-8 md:grid-cols-3">
            {TEAM.map((member, i) => (
              <ScrollReveal key={member.name} delay={scrollStagger(i, 110)} duration={550} direction="fade-up">
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-700 bg-brand-800 shadow-md transition-all hover:border-brand-500 hover:shadow-xl">
                  <div className="relative h-64 w-full overflow-hidden">
                    <Image
                      src={member.img}
                      alt={member.name}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white">{member.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-yellow-400">{member.role}</p>
                    <p className="mt-3 text-sm leading-relaxed text-brand-300">{member.bio}</p>
                  </div>
                </div>
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
            Join thousands of farmers, buyers and handlers already using ANI to trade commodities safely and efficiently across Ghana.
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
