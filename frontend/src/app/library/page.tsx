"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ResearchPublication, isBuyer, isResearcher } from "@/lib/types";
import { Icon } from "@/components/icons";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { assetUrl } from "@/lib/assetUrl";

const PAYMENT_METHODS = [
  { id: "mobile_money", label: "Mobile Money (MTN / Vodafone)" },
  { id: "bank_transfer", label: "Bank Transfer" },
];

function formatGhc(amount: number) {
  return `GHC ${amount.toFixed(2)}`;
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResearchPublication | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = (q?: string) =>
    api.research
      .browse(q)
      .then((data) => {
        setPublications(data);
        const counts: Record<string, number> = {};
        data.forEach((p) => {
          counts[p.id] = p.viewCount;
        });
        setViewCounts(counts);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load"));

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const handleView = async (pub: ResearchPublication) => {
    try {
      const { viewCount } = await api.research.recordView(pub.id);
      setViewCounts((prev) => ({ ...prev, [pub.id]: viewCount }));
    } catch {
      // non-blocking
    }
    const full = await api.research.get(pub.id);
    setSelected(full);
  };

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    setPurchaseError("");
    try {
      await api.research.purchase(selected.id, paymentMethod);
      const updated = await api.research.get(selected.id);
      setSelected(updated);
      load(search.trim() || undefined);
    } catch (e) {
      setPurchaseError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const openDocument = (url: string) => {
    const href = assetUrl(url);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-900">Research Library</h1>
        <p className="text-sm text-gray-500">
          Browse books and research publications from verified researchers
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className="auth-input pl-10"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError}
          {loadError === "Route not found" && (
            <span className="mt-2 block text-sm">
              Restart the backend server so the research API routes load, then run{" "}
              <code className="rounded bg-red-100 px-1">npm run db:setup</code> if the database
              was created before the Research Library feature.
            </span>
          )}
        </p>
      )}

      {publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((pub) => (
            <article
              key={pub.id}
              className="flex flex-col rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition hover:border-brand-300"
            >
              {pub.coverImage ? (
                <img
                  src={assetUrl(pub.coverImage) || ""}
                  alt=""
                  className="mb-3 h-36 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mb-3 flex h-36 items-center justify-center rounded-lg bg-brand-50">
                  <Icon name="book" className="h-12 w-12 text-brand-300" />
                </div>
              )}
              <h3 className="font-semibold text-brand-900">{pub.title}</h3>
              {pub.description && (
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-gray-500">{pub.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <ProfilePhoto
                  src={pub.researcher.profilePicture}
                  name={pub.researcher.name}
                  className="h-7 w-7"
                />
                <span className="text-gray-600">{pub.researcher.name}</span>
                <VerificationBadge status={pub.researcher.verificationStatus} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-brand-50"
                  title="View count"
                  onClick={() => handleView(pub)}
                >
                  <Icon name="eye" className="h-4 w-4" />
                  {viewCounts[pub.id] ?? pub.viewCount}
                </button>
                <span className="font-semibold text-brand-700">
                  {pub.isFree ? "Free" : formatGhc(pub.price ?? 0)}
                </span>
              </div>
              <button type="button" className="btn-primary mt-4 w-full text-sm" onClick={() => handleView(pub)}>
                {pub.isLocked ? "View & unlock" : "Read now"}
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-brand-900">{selected.title}</h2>
                <p className="mt-1 text-sm text-gray-500">by {selected.researcher.name}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                onClick={() => setSelected(null)}
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            {selected.description && <p className="mb-4 text-sm text-gray-600">{selected.description}</p>}

            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <Icon name="eye" className="h-4 w-4" />
              {viewCounts[selected.id] ?? selected.viewCount} views
            </div>

            {selected.hasAccess && selected.fileUrl ? (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="mb-3 text-sm text-green-800">You have access to this publication.</p>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => openDocument(selected.fileUrl!)}
                >
                  Open document
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-800">
                  <Icon name="lock" className="h-5 w-5" />
                  <span className="font-semibold">Paid content — unlock to read</span>
                </div>
                <p className="mb-4 text-sm text-amber-700">
                  Pay {formatGhc(selected.price ?? 0)} directly to the researcher to access this file.
                </p>
                {isResearcher(user.roleId) ? (
                  <p className="text-sm text-gray-600">Researchers cannot purchase publications.</p>
                ) : isBuyer(user.roleId) ? (
                  <>
                    <label className="auth-label">Payment method</label>
                    <select
                      className="auth-input mb-4"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {purchaseError && <p className="auth-error mb-3">{purchaseError}</p>}
                    <button
                      type="button"
                      className="btn-gold w-full"
                      disabled={purchasing}
                      onClick={handlePurchase}
                    >
                      {purchasing ? "Processing..." : `Pay ${formatGhc(selected.price ?? 0)} & unlock`}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Register as a Buyer to purchase and read paid publications.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
