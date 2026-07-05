"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  CommodityCategory,
  FarmerCommodity,
  HandlerProfile,
  ROLES,
  farmerCategoryFilter,
  defaultListingUnit,
} from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";
import { ProfileIdentityHeader, ProfileEditSection, ProfileEditActions } from "@/components/ProfileIdentityHeader";

interface FarmProfileData {
  farmName: string;
  farmSize?: string;
  experienceYears?: number;
  farmerCommodities: FarmerCommodity[];
}

export default function FarmSettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const profilePicRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<CommodityCategory[]>([]);
  const [registered, setRegistered] = useState<FarmerCommodity[]>([]);
  const [farmerHandlers, setFarmerHandlers] = useState<HandlerProfile[]>([]);
  const [handlerId, setHandlerId] = useState("");

  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    region: "",
    city: "",
    address: "",
  });

  const [farm, setFarm] = useState({
    farmName: "",
    farmSize: "",
    experienceYears: 0,
  });

  const categoryFilter = user ? farmerCategoryFilter(user.roleId) : null;

  const selectableCommodities = useMemo(() => {
    if (!categoryFilter) return [];
    return categories
      .filter((c) => c.name === categoryFilter)
      .flatMap((c) => c.commodities || []);
  }, [categories, categoryFilter]);

  const registeredIds = useMemo(
    () => new Set(registered.map((r) => r.commodityId ?? r.commodity?.id)),
    [registered]
  );

  const load = async () => {
    const [profile, commodities, cats] = await Promise.all([
      api.farm.profile() as Promise<FarmProfileData & { user?: unknown }>,
      api.farm.commodities() as Promise<FarmerCommodity[]>,
      api.commodities.categories(),
    ]);
    setRegistered(commodities);
    setCategories(cats);
    setFarm({
      farmName: profile.farmName || "",
      farmSize: profile.farmSize || "",
      experienceYears: profile.experienceYears ?? 0,
    });
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (
      user &&
      ![ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER].includes(user.roleId)
    ) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      setPersonal({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || "",
        country: user.country || DEFAULT_COUNTRY,
        region: user.region || "",
        city: user.city || "",
        address: user.address || "",
      });
      setHandlerId(user.assignedHandler?.id || "");
      load().catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading, router]);

  useEffect(() => {
    api.auth.handlers("farmer").then(setFarmerHandlers).catch(console.error);
  }, []);

  const resetForm = async () => {
    if (!user) return;
    setPersonal({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      country: user.country || DEFAULT_COUNTRY,
      region: user.region || "",
      city: user.city || "",
      address: user.address || "",
    });
    setHandlerId(user.assignedHandler?.id || "");
    setMessage("");
    setEditing(false);
    try {
      await load();
    } catch {
      /* keep current farm state on cancel if reload fails */
    }
  };

  const savePersonalAndFarm = async () => {
    setSaving(true);
    setMessage("");
    try {
      await Promise.all([
        api.auth.updateProfile(personal),
        api.farm.update({
          farmName: farm.farmName,
          farmSize: farm.farmSize,
          experienceYears: farm.experienceYears,
        }),
      ]);
      if (handlerId && handlerId !== user?.assignedHandler?.id) {
        await api.auth.updateHandler(handlerId);
      }
      await refreshUser();
      await load();
      await api.auth.handlers("farmer").then(setFarmerHandlers);
      setMessage("Profile saved successfully.");
      setEditing(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadProfilePic = async (file: File) => {
    setUploading(true);
    setMessage("");
    try {
      await api.upload.profilePicture(file);
      await refreshUser();
      setMessage("Profile photo updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addCommodity = async (commodityId: number) => {
    if (registeredIds.has(commodityId)) return;
    setMessage("");
    try {
      await api.farm.addCommodity({
        commodityId,
        quantity: 0,
        unit: defaultListingUnit(user.roleId),
      });
      await load();
      setMessage("Commodity added to your farm.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add commodity");
    }
  };

  const removeCommodity = async (recordId: string) => {
    if (!confirm("Remove this commodity from your farm?")) return;
    setMessage("");
    try {
      await api.farm.removeCommodity(recordId);
      await load();
      setMessage("Commodity removed.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not remove commodity");
    }
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Link href="/farm" className="text-sm text-brand-600 hover:underline">
          ← Back to My Farm
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Profile</h1>
        <p className="text-gray-500">
          Your farmer profile, farm details, handler, and commodities
        </p>
      </div>

      <ProfileIdentityHeader
        user={user}
        onEditClick={!editing ? () => setEditing(true) : undefined}
      />

      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            message.includes("success") || message.includes("updated") || message.includes("added") || message.includes("removed")
              ? "bg-brand-50 text-brand-800 border border-brand-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {editing && (
      <ProfileEditSection>
      {/* Profile photo */}
      <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-brand-900">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <ProfilePhoto src={user.profilePicture} name={user.firstName} size={80} />
          <div>
            <input
              ref={profilePicRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadProfilePic(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => profilePicRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
          </div>
        </div>
      </section>

      {/* Personal info */}
      <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-brand-900">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">First name</label>
            <input
              value={personal.firstName}
              onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Last name</label>
            <input
              value={personal.lastName}
              onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              value={personal.phone}
              onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input value={user.email} disabled className="w-full rounded-lg border bg-gray-50 px-4 py-2 text-gray-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Country</label>
            <CountrySelect
              value={personal.country}
              onChange={(country) => setPersonal({ ...personal, country })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Region</label>
            <input
              value={personal.region}
              onChange={(e) => setPersonal({ ...personal, region: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input
              value={personal.city}
              onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input
              value={personal.address}
              onChange={(e) => setPersonal({ ...personal, address: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
        </div>
      </section>

      {/* Farmer handler */}
      <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <HandlerSelect
          handlers={farmerHandlers}
          value={handlerId}
          onChange={setHandlerId}
          label="Your Farmer Handler"
          emptyMessage="No farmer handlers registered yet."
        />
        <p className="mt-2 text-xs text-gray-500">
          Choose the handler who represents you on the platform. All registered farmer handlers
          are listed here.
        </p>
      </section>

      {/* Farm details */}
      <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-brand-900">Farm Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Farm name</label>
            <input
              value={farm.farmName}
              onChange={(e) => setFarm({ ...farm, farmName: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Farm size</label>
            <input
              value={farm.farmSize}
              onChange={(e) => setFarm({ ...farm, farmSize: e.target.value })}
              placeholder="e.g. 10 acres"
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Experience (years)</label>
            <input
              type="number"
              min={0}
              value={farm.experienceYears}
              onChange={(e) => setFarm({ ...farm, experienceYears: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
        </div>
      </section>

      {/* Commodities */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-brand-900">My Commodities</h2>
        <p className="mb-4 text-sm text-gray-500">
          These appear when you post products and on your buyer profile. Add {categoryFilter?.toLowerCase()} commodities you produce.
        </p>

        {registered.length === 0 ? (
          <p className="mb-4 text-sm text-amber-700">No commodities yet — add at least one to post products.</p>
        ) : (
          <div className="mb-6 flex flex-wrap gap-2">
            {registered.map((fc) => (
              <span
                key={fc.id}
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900"
              >
                ✓ {fc.commodity?.name}
                <button
                  type="button"
                  onClick={() => removeCommodity(fc.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <h3 className="mb-3 text-sm font-semibold text-brand-800">
          Add {categoryFilter} commodities
        </h3>
        {selectableCommodities.length === 0 ? (
          <p className="text-sm text-gray-500">Loading catalog...</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {selectableCommodities.map((commodity) => {
              const already = registeredIds.has(commodity.id);
              return (
                <button
                  key={commodity.id}
                  type="button"
                  disabled={already}
                  onClick={() => addCommodity(commodity.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                    already
                      ? "border-brand-200 bg-brand-50 text-brand-600 opacity-60 cursor-default"
                      : "border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold ${
                    already ? "bg-brand-600 text-white" : "border border-gray-300"
                  }`}>
                    {already ? "✓" : "+"}
                  </span>
                  <span className="font-medium">{commodity.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <ProfileEditActions
        onCancel={resetForm}
        onSave={savePersonalAndFarm}
        saving={saving}
        saveDisabled={!handlerId}
      />
      </ProfileEditSection>
      )}
    </div>
  );
}
