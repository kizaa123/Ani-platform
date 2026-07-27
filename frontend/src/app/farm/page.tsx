"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Listing, ROLES, defaultListingUnit, listingUnitsForRole, formatListingUnit, isLivestockFarmer, normalizeListingUnit, type ListingUnit, ProductMediaItem } from "@/lib/types";
import { ProductImage } from "@/components/FarmerAvatar";
import { Icon } from "@/components/icons";
import { assetUrl } from "@/lib/assetUrl";
import { basePriceFromListed, computeListedPrice } from "@/lib/listingPrice";

import { productMediaThumbnail } from "@/components/ProductMediaGallery";

const MAX_PRODUCT_MEDIA = 5;
const MAX_VIDEO_DURATION = 60;

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video duration"));
    };
    video.src = url;
  });
}

interface FarmProfile {
  farmerCommodities: Array<{
    id: string;
    commodityId: number;
    unit: string;
    commodity: { id: number; name: string; category: { name: string } };
  }>;
}

const emptyListingForm = (roleId: number) => ({
  commodityId: 0,
  title: "",
  description: "",
  quantity: 0,
  price: 0,
  unit: defaultListingUnit(roleId),
  location: "",
  images: [] as string[],
  harvestStartDate: "",
  harvestEndDate: "",
});

export default function FarmPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const productMediaRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [productMedia, setProductMedia] = useState<ProductMediaItem[]>([]);
  const [pendingMediaFiles, setPendingMediaFiles] = useState<
    Array<{ file: File; preview: string; duration?: number }>
  >([]);
  const [productMediaUploading, setProductMediaUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyListingForm(ROLES.CROP_FARMER));

  const resetForm = useCallback(() => {
    setForm(emptyListingForm(user?.roleId ?? ROLES.CROP_FARMER));
    setProductMedia([]);
    setPendingMediaFiles((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    setEditingId(null);
    setShowForm(false);
  }, [user?.roleId]);

  const load = async () => {
    const [p, l] = await Promise.all([
      api.farm.profile() as Promise<FarmProfile>,
      api.marketplace.my(),
    ]);
    setProfile(p);
    setListings(l);
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && [ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER].includes(user.roleId as 1 | 2)) {
      load().catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per farmer session
  }, [user?.id, loading, router]);

  const totalProductMediaCount = productMedia.length + pendingMediaFiles.length;

  const handleProductMediaUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (totalProductMediaCount >= MAX_PRODUCT_MEDIA) {
      alert(`Maximum ${MAX_PRODUCT_MEDIA} media files allowed per product`);
      return;
    }

    const file = files[0];
    setProductMediaUploading(true);
    try {
      let duration: number | undefined;
      if (file.type.startsWith("video/")) {
        duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          alert(`Videos must be ${MAX_VIDEO_DURATION} seconds or less`);
          return;
        }
      }

      if (editingId) {
        const item = await api.marketplace.media.upload(editingId, file, duration);
        setProductMedia((prev) => [...prev, item]);
      } else {
        const preview = URL.createObjectURL(file);
        setPendingMediaFiles((prev) => [...prev, { file, preview, duration }]);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Media upload failed");
    } finally {
      if (productMediaRef.current) productMediaRef.current.value = "";
      setProductMediaUploading(false);
    }
  };

  const removeProductMedia = async (id: string) => {
    if (!editingId) return;
    if (!confirm("Remove this media from the product?")) return;
    try {
      await api.marketplace.media.remove(editingId, id);
      setProductMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not remove media");
    }
  };

  const removePendingMedia = (index: number) => {
    setPendingMediaFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const startEdit = (listing: Listing) => {
    setEditingId(listing.id);
    setForm({
      commodityId: listing.commodity?.id ?? 0,
      title: listing.title,
      description: listing.description || "",
      quantity: listing.quantity ?? 0,
      price: basePriceFromListed(listing.price ?? 0),
      unit: normalizeListingUnit(listing.unit, user?.roleId ?? ROLES.CROP_FARMER),
      location: listing.location || "",
      images: listing.images ?? [],
      harvestStartDate: listing.harvestStartDate || "",
      harvestEndDate: listing.harvestEndDate || "",
    });
    setProductMedia(listing.media ?? []);
    setPendingMediaFiles((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveListing = async () => {
    if (!form.commodityId || !form.title || !form.quantity || !form.price) {
      alert("Fill in commodity, title, quantity and price");
      return;
    }
    if (isLivestockFarmer(user?.roleId ?? 0) && form.quantity !== Math.floor(form.quantity)) {
      alert("Enter a whole number of animals");
      return;
    }
    if (
      form.harvestStartDate &&
      form.harvestEndDate &&
      form.harvestEndDate < form.harvestStartDate
    ) {
      alert("Harvest end date must be on or after the start date");
      return;
    }
    const payload = {
      ...form,
      images: [],
      harvestStartDate: form.harvestStartDate,
      harvestEndDate: form.harvestEndDate,
    };
    if (editingId) {
      await api.marketplace.update(editingId, payload);
    } else {
      const created = await api.marketplace.create(payload) as { id: string };
      const listingId = created.id;
      for (const pending of pendingMediaFiles) {
        await api.marketplace.media.upload(listingId, pending.file, pending.duration);
      }
    }
    resetForm();
    load();
  };

  const removeListing = async (listing: Listing) => {
    if (!confirm(`Remove "${listing.title}" from your farm? Buyers will no longer see it.`)) return;
    try {
      await api.marketplace.remove(listing.id);
      if (editingId === listing.id) resetForm();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not remove product");
    }
  };

  const registeredCommodities = useMemo(
    () => profile?.farmerCommodities ?? [],
    [profile]
  );

  const listedPricePreview = useMemo(
    () => (form.price > 0 ? computeListedPrice(form.price) : 0),
    [form.price]
  );

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading your farm...</div>;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-center text-gray-500">Loading farm details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 rounded-2xl border border-brand-100 bg-white p-6 shadow-md">
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="mb-2 text-sm font-semibold text-brand-900">
            Commodities you produce <span className="font-normal text-gray-500">(visible to buyers)</span>
          </p>
          {registeredCommodities.length === 0 ? (
            <p className="text-sm text-gray-500">No commodities registered yet.</p>
          ) : (
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {registeredCommodities.map((fc) => (
                <span
                  key={fc.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-900"
                >
                  <Icon name="check" className="h-3.5 w-3.5 text-brand-600" />
                  {fc.commodity.name}
                  <span className="text-xs text-gray-400">({fc.commodity.category.name})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-900">Products on Your Farm</h2>
          <p className="text-sm text-gray-500">Add, edit, or remove products listed for buyers</p>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          disabled={registeredCommodities.length === 0}
          className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          + Add Product
        </button>
      </div>

      {registeredCommodities.length === 0 && (
        <p className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
          Add commodities in{" "}
          <Link href="/farm/settings" className="font-semibold underline">
            Profile
          </Link>{" "}
          to post products.
        </p>
      )}

      {showForm && (
        <div className="mb-6 space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-brand-900">
              {editingId ? "Edit Product" : "Add Product to Your Farm"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <select
            value={form.commodityId}
            onChange={(e) => {
              const commodityId = parseInt(e.target.value);
              const fc = registeredCommodities.find((c) => c.commodity.id === commodityId);
              setForm({
                ...form,
                commodityId,
                unit: normalizeListingUnit(fc?.unit, user?.roleId ?? ROLES.CROP_FARMER),
              });
            }}
            className="w-full rounded-lg border bg-white px-4 py-2"
          >
            <option value={0}>Select your commodity</option>
            {registeredCommodities.map((fc) => (
              <option key={fc.id} value={fc.commodity.id}>
                {fc.commodity.name} ({fc.commodity.category.name})
              </option>
            ))}
          </select>
          <input
            placeholder={
              isLivestockFarmer(user?.roleId ?? 0)
                ? "Title e.g. Healthy Cattle for Sale"
                : "Title e.g. Premium Cocoa for Sale"
            }
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border bg-white px-4 py-2"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border bg-white px-4 py-2"
            rows={3}
          />
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <input
                type="number"
                placeholder={isLivestockFarmer(user?.roleId ?? 0) ? "No. of animals" : "Quantity"}
                min={1}
                step={isLivestockFarmer(user?.roleId ?? 0) ? 1 : "any"}
                value={form.quantity || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: isLivestockFarmer(user?.roleId ?? 0)
                      ? parseInt(e.target.value, 10) || 0
                      : parseFloat(e.target.value),
                  })
                }
                className="rounded-lg border bg-white px-4 py-2"
              />
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as ListingUnit })}
                className="rounded-lg border bg-white px-4 py-2"
              >
                {listingUnitsForRole(user?.roleId ?? ROLES.CROP_FARMER).map((u) => (
                  <option key={u} value={u}>
                    {formatListingUnit(u)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Your price (GHC)"
                min={0}
                step="any"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="col-span-2 rounded-lg border bg-white px-4 py-2 sm:col-span-1"
              />
            </div>
            <div className="rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm">
              {form.price > 0 ? (
                <p className="font-semibold text-brand-800">
                  Your price: GHC {form.price} → Listed price: GHC {listedPricePreview}/
                  {formatListingUnit(form.unit)}
                </p>
              ) : (
                <p className="text-gray-500">Enter your price — buyers will see it plus 50% as the listed price.</p>
              )}
            </div>
          </div>
          <input
            placeholder="Location e.g. Central Region"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-lg border bg-white px-4 py-2"
          />
          <div className="space-y-3 rounded-xl border border-brand-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-brand-900">Harvest calendar</p>
              <p className="mt-0.5 text-xs text-gray-500">
                When this product is ready — buyers with farm access will see these dates.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Harvest start
                </label>
                <input
                  type="date"
                  value={form.harvestStartDate}
                  onChange={(e) => setForm({ ...form, harvestStartDate: e.target.value })}
                  className="w-full rounded-lg border bg-white px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Harvest end
                </label>
                <input
                  type="date"
                  value={form.harvestEndDate}
                  min={form.harvestStartDate || undefined}
                  onChange={(e) => setForm({ ...form, harvestEndDate: e.target.value })}
                  className="w-full rounded-lg border bg-white px-4 py-2"
                />
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-brand-900">
              Product photos &amp; videos
            </p>
            <p className="mb-3 text-xs text-gray-500">
              Up to {MAX_PRODUCT_MEDIA} files per product. Videos max {MAX_VIDEO_DURATION} seconds.
              Buyers see these when viewing and ordering.
            </p>
            <input
              ref={productMediaRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleProductMediaUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => productMediaRef.current?.click()}
              disabled={productMediaUploading || totalProductMediaCount >= MAX_PRODUCT_MEDIA}
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 disabled:opacity-50"
            >
              {productMediaUploading ? "Uploading..." : "+ Add product media"}
            </button>
            {(productMedia.length > 0 || pendingMediaFiles.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {productMedia.map((item) => {
                  const src = assetUrl(item.url);
                  return (
                    <div key={item.id} className="relative overflow-hidden rounded-xl border border-brand-100 bg-brand-50">
                      {item.type === "VIDEO" && src ? (
                        <video
                          src={src}
                          className="aspect-square w-full object-cover"
                          muted
                          loop
                          playsInline
                          autoPlay
                          preload="metadata"
                        />
                      ) : src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="aspect-square w-full object-cover" />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeProductMedia(item.id)}
                        aria-label="Remove media"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      >
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                {pendingMediaFiles.map((pending, i) => (
                  <div key={pending.preview} className="relative overflow-hidden rounded-xl border border-dashed border-brand-200 bg-brand-50">
                    {pending.file.type.startsWith("video/") ? (
                      <video
                        src={pending.preview}
                        className="aspect-square w-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pending.preview} alt="" className="aspect-square w-full object-cover" />
                    )}
                    <span className="absolute left-1 top-1 rounded bg-brand-700/80 px-1.5 py-0.5 text-[10px] text-white">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => removePendingMedia(i)}
                      aria-label="Remove pending media"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={saveListing}
            disabled={uploading || productMediaUploading}
            className="rounded-xl bg-brand-700 px-6 py-2 font-semibold text-white disabled:opacity-50"
          >
            {editingId ? "Save Changes" : "Add to Farm"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-200 p-8 text-center text-gray-500">
            No products on your farm yet. Click <strong>Add Product</strong> above to list one for buyers.
          </div>
        ) : (
          listings.map((l) => {
            const thumb = productMediaThumbnail(l);
            const isVideo = l.media?.[0]?.type === "VIDEO";
            return (
            <div key={l.id} className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row">
                {thumb ? (
                  isVideo ? (
                    <video
                      src={assetUrl(thumb) ?? undefined}
                      className="h-44 w-full shrink-0 rounded-xl object-cover sm:h-44 sm:w-44"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <ProductImage
                      key={`${l.id}-${thumb}`}
                      src={thumb}
                      alt={l.title}
                      className="h-44 w-full shrink-0 rounded-xl object-cover sm:h-44 sm:w-44"
                    />
                  )
                ) : (
                  <div className="flex h-44 w-full shrink-0 items-center justify-center rounded-xl bg-brand-50 sm:w-44">
                    <Icon name="wheat" className="h-10 w-10 text-brand-300" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-brand-900">{l.title}</h3>
                  <p className="mt-1 text-sm text-brand-700">
                    {l.quantityLabel ||
                      `${l.quantity} ${formatListingUnit(normalizeListingUnit(l.unit, user?.roleId ?? ROLES.CROP_FARMER))}`}
                  </p>
                  <p className="text-lg font-bold text-brand-900">
                    Listed:{" "}
                    {l.priceLabel ||
                      `GHC ${l.price}/${formatListingUnit(normalizeListingUnit(l.unit, user?.roleId ?? ROLES.CROP_FARMER))}`}
                  </p>
                  {l.price != null && l.price > 0 && (
                    <p className="text-xs text-gray-500">
                      Your price: GHC {basePriceFromListed(l.price)}/
                      {formatListingUnit(normalizeListingUnit(l.unit, user?.roleId ?? ROLES.CROP_FARMER))}
                    </p>
                  )}
                  {l.harvestLabel && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-brand-700">
                      <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
                      Harvest: {l.harvestLabel}
                    </p>
                  )}
                  <p className="mt-1 text-xs capitalize text-gray-400">{l.status}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(l)}
                      className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeListing(l)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
