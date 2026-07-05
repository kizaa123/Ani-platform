"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { HandlerClientFarm, formatListingUnit, isHandler } from "@/lib/types";
import { FarmerAvatar, ProductImage } from "@/components/FarmerAvatar";
import { HandlerClientNav } from "@/components/HandlerClientNav";
import { CountryBadge } from "@/components/CountrySelect";
import { Icon } from "@/components/icons";

export default function HandlerClientFarmPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [farm, setFarm] = useState<HandlerClientFarm | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user && ownerId) {
      api.agents
        .clientFarm(ownerId)
        .then(setFarm)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load farm"));
    }
  }, [user?.id, loading, router, ownerId]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/agents" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to My Clients
        </Link>
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  if (!farm || farm.clientType !== "farmer" || !farm.farmer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-gray-500">
        Loading farm...
      </div>
    );
  }

  const { farmer, products = [] } = farm;
  const availableCount = products.filter((p) => p.available).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <HandlerClientNav ownerId={ownerId} farmName={farmer.farmName} />

      {/* Farm hero */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-brand-800 to-brand-700 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-100">
            Handler · Access Farm
          </p>
        </div>

        <div className="p-6 lg:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <FarmerAvatar
              src={farmer.profilePicture}
              name={farmer.name}
              size="xl"
              cacheBust={farmer.updatedAt ? new Date(farmer.updatedAt).getTime() : undefined}
            />

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{farmer.farmName}</h1>
              <p className="mt-1 text-lg text-brand-700">{farmer.name}</p>
              <CountryBadge country={farmer.country} region={farmer.region} className="mt-3" />

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoTile label="Phone" value={farmer.phone} href={`tel:${farmer.phone}`} />
                <InfoTile label="Email" value={farmer.email} />
                <InfoTile label="City" value={farmer.city} />
                {farmer.farmSize && <InfoTile label="Farm size" value={farmer.farmSize} />}
                {farmer.experienceYears != null && farmer.experienceYears > 0 && (
                  <InfoTile
                    label="Experience"
                    value={`${farmer.experienceYears} years`}
                  />
                )}
                <InfoTile
                  label="Products listed"
                  value={`${products.length} (${availableCount} available)`}
                />
              </div>

              {farmer.commodities.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Commodities on farm
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {farmer.commodities.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-900"
                      >
                        {c.name}
                        <span className="ml-1 text-brand-500">· {c.category}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-brand-100 pb-3">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Farm products</h2>
            <p className="text-sm text-gray-500">
              Full product details for your assigned farmer client
            </p>
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900">
            {products.length} listing{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/20 p-12 text-center">
            <Icon name="wheat" className="mx-auto h-12 w-12 text-brand-300" />
            <p className="mt-3 font-semibold text-brand-900">No products listed yet</p>
            <p className="mt-1 text-sm text-gray-500">
              This farmer has not added products to their farm.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="flex flex-col overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm"
              >
                {product.images?.[0] ? (
                  <ProductImage
                    src={product.images[0]}
                    alt={product.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
                    <Icon name="wheat" className="h-12 w-12 text-brand-300" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-brand-900 leading-snug">{product.title}</h3>
                    <StatusBadge available={product.available !== false} />
                  </div>
                  <p className="mt-1 text-sm text-brand-600">{product.commodity?.name}</p>
                  <p className="mt-3 text-lg font-bold text-brand-900">
                    {product.priceLabel ||
                      `GHC ${product.price}/${formatListingUnit(product.unit ?? "bags")}`}
                  </p>
                  {product.quantity != null && (
                    <p className="text-xs text-gray-500">
                      {product.quantity} {formatListingUnit(product.unit ?? "bags")} in stock
                    </p>
                  )}
                  {product.harvestLabel && (
                    <p className="mt-2 flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
                      {product.harvestLabel}
                    </p>
                  )}
                  {product.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">{product.description}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      {href ? (
        <a href={href} className="mt-0.5 block font-semibold text-brand-800 hover:underline">
          {value}
        </a>
      ) : (
        <p className="mt-0.5 font-medium text-brand-900 break-all">{value}</p>
      )}
    </div>
  );
}

function StatusBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        available ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {available ? "Available" : "Unavailable"}
    </span>
  );
}
