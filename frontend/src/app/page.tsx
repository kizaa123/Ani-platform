import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
          <div>
            <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-medium">
              Ghana&apos;s Agricultural Marketplace
            </span>
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
              Connect Farmers with Verified Buyers
            </h1>
            <p className="mb-8 text-lg text-brand-100 leading-relaxed">
              Farmers advertise commodities. Buyers pay for market access. Agents manage relationships.
              Farmer data stays protected until payment rules are satisfied.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="btn-gold inline-block px-6 py-3">
                Get Started
              </Link>
              <Link href="/login" className="rounded-xl border-2 border-white/60 px-6 py-3 font-semibold hover:bg-white/10">
                Sign In
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur">
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="text-xl font-bold mb-2">Secure by Design</h3>
            <p className="text-brand-100">
              JWT auth, RBAC permissions, paid access gates, and audit logs protect every transaction.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-brand-900">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "👨‍🌾", title: "Farmers Register", desc: "Create profiles, select crops or livestock, post listings" },
            { icon: "💳", title: "Buyers Pay for Access", desc: "Unlock full farmer data, quantities, and contact info" },
            { icon: "🤝", title: "Agents Represent", desc: "Handlers negotiate on behalf of farmers or buyers" },
            { icon: "✅", title: "Connect & Trade", desc: "Request connections, chat, and close deals securely" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-brand-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
