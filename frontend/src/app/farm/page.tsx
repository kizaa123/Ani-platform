"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Listing, ROLES, defaultListingUnit, listingUnitsForRole, formatListingUnit, isLivestockFarmer, isFarmer, normalizeListingUnit, listingCommodityName, CUSTOM_COMMODITY_ID, CUSTOM_UNIT_VALUE, resolveListingUnitForSubmit, isPredefinedListingUnit, ProductMediaItem } from "@/lib/types";
import { ProductImage } from "@/components/FarmerAvatar";
import { Icon } from "@/components/icons";
import { PageContentSkeleton, SpinnerLabel } from "@/components/LoadingPrimitives";
import { HarvestCalendarTrigger } from "@/components/HarvestCalendarTrigger";
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
  customCommodityName: "",
  title: "",
  description: "",
  quantity: 0,
  price: 0,
  unit: defaultListingUnit(roleId),
  customUnit: "",
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
    if (user && isFarmer(user.roleId)) {
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
    const roleId = user?.roleId ?? ROLES.CROP_FARMER;
    const hasCustomCommodity = Boolean(listing.customCommodityName?.trim());
    const storedUnit = listing.unit ?? defaultListingUnit(roleId);
    const usesCustomUnit = storedUnit ? !isPredefinedListingUnit(storedUnit, roleId) : false;

    setEditingId(listing.id);
    setForm({
      commodityId: hasCustomCommodity ? CUSTOM_COMMODITY_ID : (listing.commodity?.id ?? 0),
      customCommodityName: listing.customCommodityName ?? "",
      title: listing.title,
      description: listing.description || "",
      quantity: listing.quantity ?? 0,
      price: basePriceFromListed(listing.price ?? 0),
      unit: usesCustomUnit ? CUSTOM_UNIT_VALUE : normalizeListingUnit(storedUnit, roleId),
      customUnit: usesCustomUnit ? storedUnit : "",
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
    const roleId = user?.roleId ?? ROLES.CROP_FARMER;
    const usesCustomCommodity = form.commodityId === CUSTOM_COMMODITY_ID;
    const hasCommodity = usesCustomCommodity
      ? Boolean(form.customCommodityName.trim())
      : Boolean(form.commodityId);
    const resolvedUnit = resolveListingUnitForSubmit(form.unit, form.customUnit, roleId);

    if (!hasCommodity || !form.title || !form.quantity || !form.price) {
      alert("Fill in commodity, title, quantity and price");
      return;
    }
    if (usesCustomCommodity && form.customCommodityName.trim().length < 2) {
      alert("Enter a custom commodity name (at least 2 characters)");
      return;
    }
    if (form.unit === CUSTOM_UNIT_VALUE && !form.customUnit.trim()) {
      alert("Enter a custom unit");
      return;
    }
    if (isLivestockFarmer(roleId) && form.quantity !== Math.floor(form.quantity)) {
      alert("Enter a whole number of animals");
      return;
    }
    if (
      form.harvestStartDate &&
      form.harvestEndDate &&
      form.harvestEndDate < form.harvestStartDate
    ) {
      alert("Delivery end date must be on or after the start date");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      quantity: form.quantity,
      price: form.price,
      unit: resolvedUnit,
      location: form.location,
      images: [] as string[],
      harvestStartDate: form.harvestStartDate,
      harvestEndDate: form.harvestEndDate,
      ...(usesCustomCommodity
        ? { customCommodityName: form.customCommodityName.trim() }
        : { commodityId: form.commodityId }),
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
    if (!confirm(`Remove "${listing.title}" from your farm? Clients will no longer see it.`)) return;
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

  const previewUnitLabel = useMemo(() => {
    const roleId = user?.roleId ?? ROLES.CROP_FARMER;
    const resolved = resolveListingUnitForSubmit(form.unit, form.customUnit, roleId);
    return formatListingUnit(resolved || defaultListingUnit(roleId));
  }, [form.unit, form.customUnit, user?.roleId]);

  if (loading || !user) {
    return <PageContentSkeleton variant="form" maxWidth="max-w-4xl" />;
  }

  if (!profile) {
    return <PageContentSkeleton variant="form" maxWidth="max-w-4xl" />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 rounded-2xl border border-brand-100 bg-white p-6 shadow-md">
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="mb-2 text-sm font-semibold text-brand-900">
            Commodities you produce <span className="font-normal text-gray-500">(visible to clients)</span>
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
          <p className="text-sm text-gray-500">Add, edit, or remove products listed for clients</p>
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
        <div className="mb-8 rounded-2xl border border-brand-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-brand-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-brand-900">
                {editingId ? "Edit Product Listing" : "Add New Product to Your Farm"}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Specify your commodity, pricing, and availability for clients.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-6">
            {/* Commodity & Title */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-900">
                  Select Commodity <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.commodityId}
                  onChange={(e) => {
                    const commodityId = parseInt(e.target.value, 10);
                    if (commodityId === CUSTOM_COMMODITY_ID) {
                      setForm({
                        ...form,
                        commodityId,
                        customCommodityName: form.customCommodityName,
                      });
                      return;
                    }
                    const fc = registeredCommodities.find((c) => c.commodity.id === commodityId);
                    setForm({
                      ...form,
                      commodityId,
                      customCommodityName: "",
                      unit: normalizeListingUnit(fc?.unit, user?.roleId ?? ROLES.CROP_FARMER),
                      customUnit: "",
                    });
                  }}
                  className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value={0}>Choose a commodity</option>
                  {registeredCommodities.map((fc) => (
                    <option key={fc.id} value={fc.commodity.id}>
                      {fc.commodity.name} ({fc.commodity.category.name})
                    </option>
                  ))}
                  <option value={CUSTOM_COMMODITY_ID}>Other (not listed)</option>
                </select>
                {form.commodityId === CUSTOM_COMMODITY_ID && (
                  <input
                    type="text"
                    placeholder="Enter commodity name"
                    value={form.customCommodityName}
                    onChange={(e) => setForm({ ...form, customCommodityName: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-900">
                  Product Title <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder={
                    isLivestockFarmer(user?.roleId ?? 0)
                      ? "e.g. Healthy Cattle for Sale"
                      : "e.g. Premium Fresh Cocoa Beans"
                  }
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-900">
                Description <span className="text-xs font-normal lowercase text-gray-400">(optional)</span>
              </label>
              <textarea
                placeholder="Provide details about quality, grade, packaging, or special terms..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                rows={3}
              />
            </div>

            {/* Quantity, Unit, Price */}
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:p-5">
              <div className="mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
                  Quantity &amp; Pricing
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    {isLivestockFarmer(user?.roleId ?? 0) ? "Number of Animals *" : "Available Quantity *"}
                  </label>
                  <input
                    type="number"
                    placeholder={isLivestockFarmer(user?.roleId ?? 0) ? "e.g. 10" : "e.g. 500"}
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
                    className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Unit *</label>
                  <select
                    value={form.unit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unit: e.target.value,
                        customUnit: e.target.value === CUSTOM_UNIT_VALUE ? form.customUnit : "",
                      })
                    }
                    className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    {listingUnitsForRole(user?.roleId ?? ROLES.CROP_FARMER).map((u) => (
                      <option key={u} value={u}>
                        {formatListingUnit(u)}
                      </option>
                    ))}
                    <option value={CUSTOM_UNIT_VALUE}>Other (custom unit)</option>
                  </select>
                  {form.unit === CUSTOM_UNIT_VALUE && (
                    <input
                      type="text"
                      placeholder="e.g. bundles, trays, pieces"
                      value={form.customUnit}
                      onChange={(e) => setForm({ ...form, customUnit: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Your price (GHC) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    min={0}
                    step="any"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-xs text-brand-900">
                {form.price > 0 ? (
                  <p className="font-medium text-brand-900">
                    <span className="font-semibold text-brand-700">Post price:</span> GHC {listedPricePreview} per{" "}
                    {previewUnitLabel}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    Enter your price to see the post price per {previewUnitLabel}.
                  </p>
                )}
              </div>
            </div>

            {/* Location & Delivery Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-900">
                  Location / Region <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="e.g. Central Region, Mankessim"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-900">Delivery / Availability Dates</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Start Date</label>
                    <input
                      type="date"
                      value={form.harvestStartDate}
                      onChange={(e) => setForm({ ...form, harvestStartDate: e.target.value })}
                      className="w-full rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs shadow-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">End Date</label>
                    <input
                      type="date"
                      value={form.harvestEndDate}
                      min={form.harvestStartDate || undefined}
                      onChange={(e) => setForm({ ...form, harvestEndDate: e.target.value })}
                      className="w-full rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs shadow-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Media */}
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-900">
                    Product Photos &amp; Videos
                  </p>
                  <p className="text-xs text-gray-500">
                    Upload up to {MAX_PRODUCT_MEDIA} photos or short videos (max {MAX_VIDEO_DURATION}s).
                  </p>
                </div>
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
                  className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
                >
                  {productMediaUploading ? (
                    <SpinnerLabel label="Uploading..." className="h-3.5 w-3.5" />
                  ) : (
                    "+ Add Media"
                  )}
                </button>
              </div>

              {(productMedia.length > 0 || pendingMediaFiles.length > 0) && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {productMedia.map((item) => {
                    const src = assetUrl(item.url);
                    return (
                      <div key={item.id} className="relative overflow-hidden rounded-xl border border-brand-100 bg-white">
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
                          <ProductImage
                            src={item.url}
                            alt=""
                            className="aspect-square w-full"
                          />
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveListing}
                disabled={uploading || productMediaUploading}
                className="rounded-xl bg-brand-700 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-800 active:scale-98 disabled:opacity-50"
              >
                {editingId ? "Save Changes" : "Add Product to Farm"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-200 p-8 text-center text-gray-500">
            No products on your farm yet. Click <strong>Add Product</strong> above to list one for clients.
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
                  {listingCommodityName(l) && (
                    <p className="text-xs font-medium text-brand-600">{listingCommodityName(l)}</p>
                  )}
                  <p className="mt-1 text-sm text-brand-700">
                    {l.quantityLabel ||
                      `${l.quantity} ${formatListingUnit(l.unit ?? defaultListingUnit(user?.roleId ?? ROLES.CROP_FARMER))}`}
                  </p>
                  <p className="text-lg font-bold text-brand-900">
                    Listed:{" "}
                    {l.priceLabel ||
                      `GHC ${l.price}/${formatListingUnit(l.unit ?? defaultListingUnit(user?.roleId ?? ROLES.CROP_FARMER))}`}
                  </p>
                  {l.price != null && l.price > 0 && (
                    <p className="text-xs text-gray-500">
                      Your price: GHC {basePriceFromListed(l.price)}/
                      {formatListingUnit(l.unit ?? defaultListingUnit(user?.roleId ?? ROLES.CROP_FARMER))}
                    </p>
                  )}
                  {(l.harvestStartDate || l.harvestEndDate || l.harvestLabel) && (
                    <div className="mt-1">
                      <HarvestCalendarTrigger
                        harvestStartDate={l.harvestStartDate}
                        harvestEndDate={l.harvestEndDate}
                        harvestLabel={
                          l.harvestLabel ? `Delivery: ${l.harvestLabel}` : null
                        }
                        commodityName={listingCommodityName(l) || undefined}
                        productTitle={l.title}
                        className="inline-flex items-center gap-1 rounded-lg px-0 py-0.5 text-xs text-brand-700 hover:bg-brand-50"
                      />
                    </div>
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
