"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { CommodityCategory, HandlerProfile, ROLES } from "@/lib/types";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { Icon } from "@/components/icons";

const ROLE_OPTIONS = [
  { id: ROLES.CROP_FARMER, label: "Crop Farmer" },
  { id: ROLES.LIVESTOCK_FARMER, label: "Livestock Farmer" },
  { id: ROLES.FARMER_HANDLER, label: "Farmer Handler" },
  { id: ROLES.BUYER, label: "Buyer" },
  { id: ROLES.BUYER_HANDLER, label: "Buyer Handler" },
  { id: ROLES.ANI_ACCOUNTANT, label: "ANI Accountant" },
];

const STEP_LABELS = ["Account", "Details", "Commodities"] as const;

function categoryForRole(roleId: number): "Crop" | "Livestock" | null {
  if (roleId === ROLES.CROP_FARMER) return "Crop";
  if (roleId === ROLES.LIVESTOCK_FARMER) return "Livestock";
  return null;
}

function buildRegisterPayload(
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    country: string;
    region: string;
    city: string;
    address: string;
    roleId: number;
    farmName: string;
    farmSize: string;
    experienceYears: number;
    company: string;
    handlerId: string;
  },
  selectedCommodities: number[],
  isFarmerRole: boolean,
  needsHandler: boolean
) {
  const payload: Record<string, unknown> = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    password: form.password,
    country: form.country.trim(),
    region: form.region.trim(),
    city: form.city.trim(),
    roleId: form.roleId,
  };

  if (form.address.trim()) payload.address = form.address.trim();
  if (needsHandler && form.handlerId.trim()) payload.handlerId = form.handlerId.trim();

  if (isFarmerRole) {
    payload.commodityIds = selectedCommodities;
    if (form.farmName.trim()) payload.farmName = form.farmName.trim();
    if (form.farmSize.trim()) payload.farmSize = form.farmSize.trim();
    if (form.experienceYears > 0) payload.experienceYears = form.experienceYears;
  } else if (form.roleId === ROLES.BUYER && form.company.trim()) {
    payload.company = form.company.trim();
  }

  return payload;
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
    roleId: ROLES.BUYER as number, farmName: "", farmSize: "", experienceYears: 0, company: "",
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
  const totalSteps = isFarmerRole ? 3 : 2;
  const stepLabels = isFarmerRole ? STEP_LABELS : STEP_LABELS.slice(0, 2);

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
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    form.email.trim() &&
    form.phone.trim().length >= 9 &&
    form.password.length >= 8 &&
    form.country.trim();

  const goToStep2 = () => {
    if (!canContinueStep1) {
      setError("Please fill in all required fields (names at least 2 characters, phone at least 9 digits) and select your country.");
      return;
    }
    setError("");
    setStep(2);
  };

  const canContinueStep2 =
    form.region.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
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
      await register(
        buildRegisterPayload(form, selectedCommodities, isFarmerRole, needsHandler)
      );

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
    <div className="auth-page auth-page-wide">
      <div className="auth-card">
        <header className="auth-header">
          <div className="auth-icon-wrap">
            <Icon name="user" className="h-7 w-7" />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Step {step} of {totalSteps} — {stepLabels[step - 1]}
          </p>
        </header>

        <div className="auth-step-indicator">
          <div className="auth-step-track">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`auth-step-bar ${step >= s ? "auth-step-bar-active" : ""}`}
                aria-hidden
              />
            ))}
          </div>
          <div className="auth-step-labels">
            {stepLabels.map((label, index) => (
              <span
                key={label}
                className={step >= index + 1 ? "auth-step-label-active" : undefined}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="auth-error mb-5" role="alert">
            <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="auth-form">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="auth-field">
                <label htmlFor="reg-first-name" className="auth-label">
                  First Name
                </label>
                <input
                  id="reg-first-name"
                  required
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="auth-input"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-last-name" className="auth-label">
                  Last Name
                </label>
                <input
                  id="reg-last-name"
                  required
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email" className="auth-label">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-phone" className="auth-label">
                Phone
              </label>
              <input
                id="reg-phone"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="auth-input"
              />
              <p className="auth-hint">At least 8 characters</p>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-role" className="auth-label">
                Role
              </label>
              <select
                id="reg-role"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: parseInt(e.target.value) })}
                className="auth-input"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              {isFarmerRole && (
                <p className="auth-hint text-brand-700">
                  You will only select {categoryFilter?.toLowerCase()} commodities in step 3.
                </p>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label">Country</label>
              <CountrySelect
                value={form.country}
                onChange={(country) => setForm({ ...form, country })}
                required
              />
              <p className="auth-hint">Select the African country where you are based</p>
            </div>

            <button
              type="button"
              onClick={goToStep2}
              disabled={!canContinueStep1}
              className="btn-primary auth-nav-btn disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="auth-form">
            <div className="auth-section">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Selected country
              </p>
              <CountrySelect
                value={form.country}
                onChange={(country) => setForm({ ...form, country })}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="auth-field">
                <label htmlFor="reg-region" className="auth-label">
                  Region / State
                </label>
                <input
                  id="reg-region"
                  required
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="auth-input"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-city" className="auth-label">
                  City
                </label>
                <input
                  id="reg-city"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="auth-input"
                />
              </div>
              <div className="auth-field sm:col-span-2">
                <label htmlFor="reg-address" className="auth-label">
                  Address <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="reg-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="auth-input"
                />
              </div>
            </div>

            {isFarmerRole && (
              <>
                <div className="auth-section">
                  <p className="auth-section-title mb-4">
                    Profile photo <span className="font-normal text-gray-500">(visible to buyers before payment)</span>
                  </p>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-200 bg-white">
                      {profilePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <Icon name="user" className="h-8 w-8 text-brand-400" />
                      )}
                    </div>
                    <div className="text-center sm:text-left">
                      <input
                        ref={profileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleProfileSelect(e.target.files[0])}
                      />
                      <button
                        type="button"
                        onClick={() => profileInputRef.current?.click()}
                        className="btn-outline inline-flex items-center gap-2"
                      >
                        <Icon name="camera" className="h-4 w-4" />
                        Upload photo
                      </button>
                      <p className="auth-hint mt-2">Buyers see this on the marketplace</p>
                    </div>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-farm-name" className="auth-label">
                    Farm Name
                  </label>
                  <input
                    id="reg-farm-name"
                    value={form.farmName}
                    onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                    placeholder={`${form.firstName || "My"}'s Farm`}
                    className="auth-input"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="auth-field">
                    <label htmlFor="reg-farm-size" className="auth-label">
                      Farm Size
                    </label>
                    <input
                      id="reg-farm-size"
                      placeholder="e.g. 10 acres"
                      value={form.farmSize}
                      onChange={(e) => setForm({ ...form, farmSize: e.target.value })}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-experience" className="auth-label">
                      Experience (years)
                    </label>
                    <input
                      id="reg-experience"
                      type="number"
                      min={0}
                      value={form.experienceYears}
                      onChange={(e) =>
                        setForm({ ...form, experienceYears: parseInt(e.target.value) || 0 })
                      }
                      className="auth-input"
                    />
                  </div>
                </div>
              </>
            )}

            {form.roleId === ROLES.BUYER && (
              <div className="auth-field">
                <label htmlFor="reg-company" className="auth-label">
                  Company
                </label>
                <input
                  id="reg-company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="auth-input"
                />
              </div>
            )}

            {needsHandler && (
              <div className="auth-section bg-white">
                <HandlerSelect
                  handlers={availableHandlers}
                  value={form.handlerId}
                  onChange={(handlerId) => setForm({ ...form, handlerId })}
                  label={handlerLabel}
                  emptyMessage={handlerEmptyMessage}
                />
                <p className="auth-hint mt-3">
                  All registered {isFarmerRole ? "farmer" : "buyer"} handlers appear here. Your
                  handler supports you on the platform.
                </p>
              </div>
            )}

            <div className="auth-nav">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-outline auth-nav-btn"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => (isFarmerRole ? goToStep3() : handleSubmit())}
                disabled={loading || (needsHandler && !canContinueStep2)}
                className="btn-primary auth-nav-btn disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating..." : isFarmerRole ? "Continue" : "Create Account"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && isFarmerRole && categoryFilter && (
          <div className="auth-form">
            <div className="auth-section">
              <div className="flex items-start gap-3">
                <Icon name="leaf" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <h3 className="auth-section-title">Select {categoryFilter} Commodities</h3>
                  <p className="auth-hint mt-1">
                    Tick only the {categoryFilter.toLowerCase()} you produce. Buyers will see these on
                    your profile.
                  </p>
                </div>
              </div>
            </div>

            {selectableCommodities.length === 0 ? (
              <p className="text-center text-sm text-gray-500">Loading commodities...</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
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
                          : "border-brand-200 bg-white hover:border-brand-300"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                          selected
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {selected && <Icon name="check" className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <span className="block font-semibold text-brand-900">{commodity.name}</span>
                        <p className="text-xs text-gray-500">{categoryFilter}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedCommodities.length > 0 && (
              <p className="text-sm font-medium text-brand-700">
                {selectedCommodities.length} commodity(s) selected
              </p>
            )}

            <div className="auth-nav">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-outline auth-nav-btn"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedCommodities.length === 0 || !form.handlerId}
                className="btn-primary auth-nav-btn disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        )}

        <p className="auth-switch">
          Have an account?{" "}
          <Link href="/login" className="auth-switch-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
