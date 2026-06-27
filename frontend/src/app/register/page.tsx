"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { CommodityCategory, HandlerProfile, ROLES } from "@/lib/types";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";

const ROLE_OPTIONS = [
  { id: ROLES.CROP_FARMER, label: "Crop Farmer" },
  { id: ROLES.LIVESTOCK_FARMER, label: "Livestock Farmer" },
  { id: ROLES.FARMER_HANDLER, label: "Farmer Handler" },
  { id: ROLES.BUYER, label: "Buyer" },
  { id: ROLES.BUYER_HANDLER, label: "Buyer Handler" },
  { id: ROLES.ANI_ACCOUNTANT, label: "ANI Accountant" },
];

function categoryForRole(roleId: number): "Crop" | "Livestock" | null {
  if (roleId === ROLES.CROP_FARMER) return "Crop";
  if (roleId === ROLES.LIVESTOCK_FARMER) return "Livestock";
  return null;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<CommodityCategory[]>([]);
  const [selectedCommodities, setSelectedCommodities] = useState<number[]>([]);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, refreshUser } = useAuth();
  const router = useRouter();
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [farmerHandlers, setFarmerHandlers] = useState<HandlerProfile[]>([]);
  const [buyerHandlers, setBuyerHandlers] = useState<HandlerProfile[]>([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    country: "", region: "", city: "", address: "",
    roleId: ROLES.BUYER, farmName: "", farmSize: "", experienceYears: 0, company: "",
    handlerId: "",
  });

  const isFarmerRole = form.roleId === ROLES.CROP_FARMER || form.roleId === ROLES.LIVESTOCK_FARMER;
  const isBuyerRole = form.roleId === ROLES.BUYER;
  const needsHandler = isFarmerRole || isBuyerRole;
  const availableHandlers = isFarmerRole ? farmerHandlers : isBuyerRole ? buyerHandlers : [];
  const handlerLabel = isFarmerRole ? "Choose your Farmer Handler" : "Choose your Buyer Handler";
  const handlerEmptyMessage = isFarmerRole
    ? "No farmer handlers registered yet. A farmer handler must register first."
    : "No buyer handlers registered yet. A buyer handler must register first.";
  const categoryFilter = categoryForRole(form.roleId);

  const selectableCommodities = useMemo(() => {
    if (!categoryFilter) return [];
    return categories
      .filter((c) => c.name === categoryFilter)
      .flatMap((c) => c.commodities || []);
  }, [categories, categoryFilter]);

  useEffect(() => {
    api.commodities.categories().then(setCategories).catch(() => {});
    api.auth.handlers("farmer").then(setFarmerHandlers).catch(() => {});
    api.auth.handlers("buyer").then(setBuyerHandlers).catch(() => {});
  }, []);

  // Reset commodity picks and handler when farmer type / role changes
  useEffect(() => {
    setSelectedCommodities([]);
    setForm((prev) => ({ ...prev, handlerId: "" }));
  }, [form.roleId]);

  const toggleCommodity = (id: number) => {
    setSelectedCommodities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleProfileSelect = (file: File) => {
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const canContinueStep1 =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.password.length >= 8 &&
    form.country.trim();

  const goToStep2 = () => {
    if (!canContinueStep1) {
      setError("Please fill in all required fields and select your country.");
      return;
    }
    setError("");
    setStep(2);
  };

  const canContinueStep2 =
    form.region.trim() &&
    form.city.trim() &&
    (!needsHandler || (form.handlerId.trim() && availableHandlers.length > 0));

  const goToStep3 = () => {
    if (!canContinueStep2) {
      setError(
        needsHandler && !form.handlerId
          ? "Please select a handler to continue."
          : "Please complete all required fields."
      );
      return;
    }
    setError("");
    setStep(3);
  };

  const handleSubmit = async () => {
    if (needsHandler && !form.handlerId) {
      setError("Please select a handler before creating your account.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register({
        ...form,
        commodityIds: isFarmerRole ? selectedCommodities : undefined,
        experienceYears: form.experienceYears || undefined,
      });

      if (isFarmerRole && profileFile) {
        try {
          await api.upload.profilePicture(profileFile);
          await refreshUser();
        } catch {
          // Account created — photo can be added on My Farm
        }
      }

      router.push(isFarmerRole ? "/farm" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-brand-900">Create Account</h1>
        <p className="mb-6 text-gray-500">Step {step} of {isFarmerRole ? 3 : 2}</p>

        <div className="mb-6 flex gap-2">
          {[1, 2, ...(isFarmerRole ? [3] : [])].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? "bg-brand-600" : "bg-gray-200"}`} />
          ))}
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">First Name</label>
                <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Last Name</label>
                <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: parseInt(e.target.value) })}
                className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              {isFarmerRole && (
                <p className="mt-1 text-xs text-brand-700">
                  You will only select {categoryFilter?.toLowerCase()} commodities in step 3.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Country</label>
              <CountrySelect
                value={form.country}
                onChange={(country) => setForm({ ...form, country })}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Select the African country where you are based</p>
            </div>
            <button
              type="button"
              onClick={goToStep2}
              disabled={!canContinueStep1}
              className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Selected country</p>
              <CountrySelect
                value={form.country}
                onChange={(country) => setForm({ ...form, country })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Region / State</label>
                <input required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">City</label>
                <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Address (optional)</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
              </div>
            </div>

            {isFarmerRole && (
              <>
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-brand-900">Profile photo (visible to buyers before payment)</p>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-brand-200 bg-white flex items-center justify-center">
                      {profilePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl">👨‍🌾</span>
                      )}
                    </div>
                    <div>
                      <input ref={profileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleProfileSelect(e.target.files[0])} />
                      <button type="button" onClick={() => profileInputRef.current?.click()}
                        className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800">
                        Upload photo
                      </button>
                      <p className="mt-1 text-xs text-gray-500">Buyers see this on the marketplace</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Farm Name</label>
                  <input value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                    placeholder={`${form.firstName || "My"}'s Farm`}
                    className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Farm Size</label>
                    <input placeholder="e.g. 10 acres" value={form.farmSize} onChange={(e) => setForm({ ...form, farmSize: e.target.value })}
                      className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Experience (years)</label>
                    <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
                  </div>
                </div>
              </>
            )}

            {form.roleId === ROLES.BUYER && (
              <div>
                <label className="mb-1 block text-sm font-medium">Company</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none" />
              </div>
            )}

            {needsHandler && (
              <div className="rounded-xl border border-brand-100 bg-white p-4">
                <HandlerSelect
                  handlers={availableHandlers}
                  value={form.handlerId}
                  onChange={(handlerId) => setForm({ ...form, handlerId })}
                  label={handlerLabel}
                  emptyMessage={handlerEmptyMessage}
                />
                <p className="mt-2 text-xs text-gray-500">
                  All registered {isFarmerRole ? "farmer" : "buyer"} handlers appear here. Your
                  handler supports you on the platform.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-brand-200 py-3 font-semibold text-brand-700">Back</button>
              <button
                onClick={() => (isFarmerRole ? goToStep3() : handleSubmit())}
                disabled={loading || (needsHandler && !canContinueStep2)}
                className="flex-1 rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating..." : isFarmerRole ? "Continue" : "Create Account"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && isFarmerRole && categoryFilter && (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-4">
              <h3 className="font-bold text-brand-900">Select {categoryFilter} Commodities</h3>
              <p className="text-sm text-gray-600 mt-1">
                Tick only the {categoryFilter.toLowerCase()} you produce. Buyers will see these on your profile.
              </p>
            </div>

            {selectableCommodities.length === 0 ? (
              <p className="text-sm text-gray-500">Loading commodities...</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectableCommodities.map((commodity) => {
                  const selected = selectedCommodities.includes(commodity.id);
                  return (
                    <button
                      key={commodity.id}
                      type="button"
                      onClick={() => toggleCommodity(commodity.id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-brand-600 bg-brand-100 ring-2 ring-brand-500"
                          : "border-gray-200 bg-white hover:border-brand-300"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
                        selected ? "border-brand-700 bg-brand-700 text-white" : "border-gray-300"
                      }`}>
                        {selected ? "✓" : ""}
                      </span>
                      <div>
                        <span className="font-semibold text-brand-900">{commodity.name}</span>
                        <p className="text-xs text-gray-500">{categoryFilter}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedCommodities.length > 0 && (
              <p className="text-sm text-brand-700 font-medium">
                {selectedCommodities.length} commodity(s) selected
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-brand-200 py-3 font-semibold text-brand-700">Back</button>
              <button onClick={handleSubmit} disabled={loading || selectedCommodities.length === 0 || !form.handlerId}
                className="flex-1 rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Have an account? <Link href="/login" className="text-brand-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
