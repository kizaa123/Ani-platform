"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  ResearchPublication,
  canPurchasePublication,
  isResearcher,
  isStudent,
} from "@/lib/types";
import {
  PUBLICATION_CATEGORY_LABELS,
  PUBLICATION_CATEGORY_ORDER,
  groupPublicationsByCategory,
} from "@/lib/publicationCategories";
import { Icon } from "@/components/icons";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PaymentCheckout, TransactionSuccess } from "@/components/PaymentCheckout";
import { assetUrl } from "@/lib/assetUrl";

function formatGhc(amount: number) {
  return `GHC ${amount.toFixed(2)}`;
}

function PublicationCard({
  pub,
  viewCount,
  onView,
}: {
  pub: ResearchPublication;
  viewCount: number;
  onView: (pub: ResearchPublication) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(12);
  const [followed, setFollowed] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pub.title, url: window.location.href });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        alert("Publication link copied to clipboard!");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white p-5 shadow-md transition hover:border-brand-200 hover:shadow-lg">
      {/* Top Preview Title */}
      <div className="mb-3">
        <p className="text-base font-bold text-brand-900 line-clamp-1">{pub.title}</p>
      </div>

      {/* Researcher Profile Row */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-brand-100 bg-brand-50 shadow-xs">
          {pub.researcher.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(pub.researcher.profilePicture) || ""}
              alt={pub.researcher.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-brand-700">
              {pub.researcher.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-gray-700">{pub.researcher.name}</span>
          <VerificationBadge status={pub.researcher.verificationStatus ?? "VERIFIED"} />
        </div>
      </div>

      {/* Full Publication Title */}
      <h3 className="text-lg font-bold text-gray-900 leading-snug">{pub.title}</h3>

      {/* Qualifications / Description */}
      <div className="mt-2.5 text-sm text-gray-600 leading-relaxed">
        <p>
          <span className="font-semibold text-gray-900">Qualifications: </span>
          {pub.description ||
            "PhD Crop Science (KNUST), MSc Sustainable Agriculture (UCC), Senior Agronomist at CSIR-Crops Research Institute. 15+ years experience in climate-resilient farming."}
        </p>
      </div>

      {/* Views & Price Row */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
          <Icon name="eye" className="h-4 w-4 text-gray-500" />
          <span>{viewCount}</span>
        </div>

        <span className="font-bold text-brand-700 text-base">
          {pub.isFree ? "Free" : formatGhc(pub.price ?? 0)}
        </span>
      </div>

      {/* Action Bar (4 Pills) */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => {
            setLiked(!liked);
            setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
          }}
          className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
            liked
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/80"
          }`}
        >
          <span>👍</span>
          <span>Like</span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-center gap-1 rounded-xl bg-emerald-100/70 px-2 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
        >
          <span>💬</span>
          <span>Comment</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-1 rounded-xl bg-emerald-100/70 px-2 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200/80"
        >
          <span>↪️</span>
          <span>Share</span>
        </button>

        <button
          type="button"
          onClick={() => setFollowed(!followed)}
          className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
            followed
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/80"
          }`}
        >
          <span>👤+</span>
          <span>{followed ? "Following" : "Follow"}</span>
        </button>
      </div>

      {/* Read Now Button */}
      <button
        type="button"
        onClick={() => onView(pub)}
        className="mt-4 w-full rounded-2xl bg-brand-800 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-900 active:scale-98"
      >
        {pub.isLocked ? "View & unlock" : "Read now"}
      </button>
    </article>
  );
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResearchPublication | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [loadError, setLoadError] = useState("");

  const studentView = user ? isStudent(user.roleId) : false;
  const groupedPublications = useMemo(
    () => groupPublicationsByCategory(publications),
    [publications]
  );

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
    setPurchaseError("");
    setPurchaseSuccess("");
  };

  const handlePurchase = async (paymentMethod: string) => {
    if (!selected) return;
    setPurchasing(true);
    setPurchaseError("");
    try {
      await api.research.purchase(selected.id, paymentMethod);
      const updated = await api.research.get(selected.id);
      setSelected(updated);
      setPurchaseSuccess(`You now have access to "${selected.title}".`);
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-brand-900">Research Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          {studentView
            ? "Explore researcher publications by farming category"
            : "Browse books and research publications from verified researchers"}
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="rounded-2xl bg-brand-800 px-6 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-900">
          Search
        </button>
      </form>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError}
        </p>
      )}

      {publications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publications found.
        </div>
      ) : studentView ? (
        <div className="space-y-8">
          {PUBLICATION_CATEGORY_ORDER.map((category) => {
            const items = groupedPublications[category];
            if (items.length === 0) return null;
            return (
              <section
                key={category}
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-xs"
              >
                <div className="mb-4 border-b border-brand-50 pb-3">
                  <h2 className="text-xl font-bold text-brand-900">
                    {PUBLICATION_CATEGORY_LABELS[category]}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {items.length} publication{items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                  {items.map((pub) => (
                    <PublicationCard
                      key={pub.id}
                      pub={pub}
                      viewCount={viewCounts[pub.id] ?? pub.viewCount}
                      onView={handleView}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {publications.map((pub) => (
            <PublicationCard
              key={pub.id}
              pub={pub}
              viewCount={viewCounts[pub.id] ?? pub.viewCount}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-brand-900">{selected.title}</h2>
                <p className="mt-1 text-sm text-gray-500">by {selected.researcher.name}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                onClick={() => {
                  setSelected(null);
                  setPurchaseSuccess("");
                  setPurchaseError("");
                }}
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
              <div className="space-y-4">
                {purchaseSuccess && (
                  <TransactionSuccess
                    title="Unlocked successfully"
                    message={purchaseSuccess}
                    actionLabel="Open document"
                    onAction={() => openDocument(selected.fileUrl!)}
                    onDismiss={() => setPurchaseSuccess("")}
                    dismissLabel="Close"
                  />
                )}
                {!purchaseSuccess && (
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
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Unlock to read
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-900">
                    {formatGhc(selected.price ?? 0)}
                  </p>
                </div>

                {isResearcher(user.roleId) ? (
                  <p className="text-sm text-gray-600">Researchers cannot purchase publications.</p>
                ) : canPurchasePublication(user.roleId) ? (
                  <PaymentCheckout
                    totalLabel="Publication"
                    totalAmount={formatGhc(selected.price ?? 0)}
                    subtitle={`Payment goes to ${selected.researcher.name}`}
                    payLabel={`Pay ${formatGhc(selected.price ?? 0)} & unlock`}
                    onPay={handlePurchase}
                    submitting={purchasing}
                    error={purchaseError}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    Register as a Buyer or Student to purchase and read paid publications.
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