import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icons";

const STATS = [
  { value: "10,000+", label: "Verified Users" },
  { value: "54+", label: "Districts Covered" },
  { value: "100%", label: "Secure Transactions" },
];

const HOW_IT_WORKS: { icon: IconName; step: string; title: string; desc: string; color: string }[] = [
  {
    icon: "user",
    step: "01",
    title: "Farmers Register",
    desc: "Create a verified profile, select your crops or livestock, and list your commodities with prices, quantities and harvest dates.",
    color: "from-brand-600 to-brand-800",
  },
  {
    icon: "credit-card",
    step: "02",
    title: "Buyers Pay for Access",
    desc: "Browse previews freely. Pay a one-time access fee to unlock full farmer data, quantities, contact details and direct messaging.",
    color: "from-yellow-500 to-yellow-700",
  },
  {
    icon: "handshake",
    step: "03",
    title: "Agents Represent",
    desc: "Farmer Handlers and Buyer Handlers negotiate on behalf of clients, manage relationships and streamline deals.",
    color: "from-emerald-600 to-brand-700",
  },
  {
    icon: "check",
    step: "04",
    title: "Connect & Trade",
    desc: "Request connections, chat securely, finalise orders and track financials — all in one protected platform.",
    color: "from-brand-700 to-brand-900",
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

const ROLES: { icon: IconName; label: string; desc: string }[] = [
  { icon: "sprout", label: "Crop Farmers", desc: "List produce, manage prices & track buyers" },
  { icon: "wheat", label: "Livestock Farmers", desc: "Advertise animals, set availability & connect with agents" },
  { icon: "user", label: "Buyers", desc: "Discover verified farms and pay for secure access" },
  { icon: "handshake", label: "Handlers & Agents", desc: "Represent clients and close deals efficiently" },
];

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-brand-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/login_cover.png"
            alt="Agricultural field background"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-900/80 to-brand-800/30" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/20 px-4 py-1.5 text-sm font-semibold text-brand-200 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Ghana&apos;s #1 Agricultural Exchange Platform
            </span>

            <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
              Where Farmers{" "}
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                Meet Markets
              </span>
            </h1>

            <p className="mb-10 text-xl font-light leading-relaxed text-brand-100 md:text-2xl">
              Connect verified farmers with trusted buyers across Ghana. Secure commodity trading with full privacy protection until payment is complete.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 text-base font-bold text-brand-900 shadow-lg transition-all hover:scale-105 hover:bg-yellow-300"
              >
                <Icon name="sprout" className="h-5 w-5" />
                Join the Platform
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/60 hover:bg-white/10"
              >
                Sign In
                <Icon name="chevron-right" className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-brand-800 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-3 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-yellow-400">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-brand-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className="bg-brand-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              Built for Everyone
            </span>
            <h2 className="text-4xl font-black text-brand-900">One Platform, Many Roles</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              Whether you grow it, buy it, or broker it — ANI Platform has a tailored experience designed for your role.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div
                key={r.label}
                className="group flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                  <Icon name={r.icon} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-900">{r.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              Simple Process
            </span>
            <h2 className="text-4xl font-black text-brand-900">How It Works</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              Four simple steps from registration to closed deal — all protected by our secure escrow system.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 p-6 shadow-sm"
              >
                <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${item.color} opacity-10`} />
                <span className="text-5xl font-black text-brand-100">{item.step}</span>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="bg-brand-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand-700 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-200">
              The People Behind It
            </span>
            <h2 className="text-4xl font-black text-white">Meet Our Team</h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-300">
              A passionate team of agricultural and technology experts dedicated to transforming African commodity trading.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="group flex flex-col overflow-hidden rounded-2xl border border-brand-700 bg-brand-800 shadow-md transition-all hover:border-brand-500 hover:shadow-xl"
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 py-24 text-white">
        <div className="absolute inset-0 bg-[url('/login_cover.png')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-4xl font-black leading-tight md:text-5xl">
            Ready to Transform How You Trade?
          </h2>
          <p className="mb-10 text-xl leading-relaxed text-brand-100">
            Join thousands of farmers, buyers and handlers already using ANI Platform to trade commodities safely and efficiently across Ghana.
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
              <Icon name="chevron-right" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
