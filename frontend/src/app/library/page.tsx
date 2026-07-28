"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { PublisherBrowseCard } from "@/lib/types";
import { Icon } from "@/components/icons";
import { LibraryPublisherCard } from "@/components/LibraryPublisherCard";
import { CardGridSkeleton, PageContentSkeleton } from "@/components/LoadingPrimitives";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [publishers, setPublishers] = useState<PublisherBrowseCard[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback((q?: string) => {
    setDataLoading(true);
    setLoadError("");
    api.research
      .browsePublishers(q)
      .then(setPublishers)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const handleViewFiles = (publisher: PublisherBrowseCard) => {
    router.push(`/library/publisher/${publisher.id}`);
  };

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ScrollReveal trigger="mount" delay={0} duration={450} direction="fade-up" className="mb-6">
        <h1 className="text-3xl font-extrabold text-brand-900">Research Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse publishers and explore their research publications
        </p>
      </ScrollReveal>

      <ScrollReveal trigger="mount" delay={80} duration={450} direction="fade-up" className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Search by publisher, institution, or publication..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-brand-800 px-6 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-900"
          >
            Search
          </button>
        </form>
      </ScrollReveal>

      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{loadError}</p>
      )}

      {dataLoading ? (
        <CardGridSkeleton count={4} columns="sm:grid-cols-2" imageHeight="h-28" />
      ) : publishers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          No publishers found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishers.map((publisher, i) => (
            <ScrollReveal
              key={publisher.id}
              delay={scrollStagger(i, 80)}
              duration={450}
              direction="fade-up"
            >
              <LibraryPublisherCard publisher={publisher} onViewFiles={handleViewFiles} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
