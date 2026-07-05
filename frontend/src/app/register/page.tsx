"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { CommodityCategory, HandlerProfile, ROLES, farmerCategoryFilter } from "@/lib/types";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { CommodityPicker } from "@/components/CommodityPicker";
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
  const categoryFilter = farmerCategoryFilter(form.roleId);
  const totalSteps = isFarmerRole ? 3 : 2;
  const stepLabels = isFarmerRole ? STEP_LABELS : STEP_LABELS.slice(0, 2);

  useEffect(() => {
    api.commodities.categories().then(setCategories).catch(() => {});
    api.auth.handlers("farmer").then(setFarmerHandlers).catch(() => {});
    api.auth.handlers("buyer").then(setBuyerHandlers).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedCommodities([]);
    setForm((prev) => ({ ...prev, handlerId: "" }));
  }, [form.roleId]);

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
    <div className="flex-1 w-full grid lg:grid-cols-12 bg-brand-50">
      {/* Left Column: Platform Overview & Sprout Image */}
      <div className="hidden lg:col-span-6 lg:flex relative overflow-hidden bg-brand-900 flex-col justify-between p-12 lg:p-16 text-white min-h-[500px]">
        {/* Background sprout image */}
        <div className="absolute inset-0 z-0 bg-[url('/login_cover.png')] bg-cover bg-center" />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/95 via-brand-900/60 to-brand-800/10 z-10" />

        {/* Brand logo */}
        <div className="relative z-20 flex items-center gap-2">
          <div className="h-10 w-10 bg-brand-500 rounded-xl flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-brand-900/40">
            A
          </div>
          <span className="font-extrabold text-2xl tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-brand-50 to-brand-200">
            ANI Platform
          </span>
        </div>

        {/* Marketing text & stats */}
        <div className="relative z-20 space-y-6 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-xs font-semibold text-brand-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Agricultural Exchange Platform
          </span>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
            Connecting African Agriculture to Global Markets
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed font-light">
            Trade commodities securely, connect directly with verified buyers and crop farmers, and request support from expert handlers.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 backdrop-blur-[2px] rounded-xl p-4 bg-white/5">
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">10k+</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Verified Users</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">100%</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Secure Escrow</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gold tracking-tight">24/7</p>
              <p className="text-[10px] text-brand-200 uppercase tracking-widest font-semibold mt-1">Handler Support</p>
            </div>
          </div>
        </div>

        <div className="relative z-20 text-xs text-brand-300 font-medium">
          © {new Date().getFullYear()} ANI Agricultural Exchange Platform. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-6 flex items-start justify-center p-6 sm:p-12 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-xl space-y-8 bg-white p-8 rounded-2xl border border-brand-100 shadow-xl">
          <header className="text-center lg:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 mb-4">
              <Icon name="user" className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-brand-900 tracking-tight">Create Account</h1>
            <p className="mt-2 text-sm text-gray-500">
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
                    Search and choose the {categoryFilter?.toLowerCase()} you produce. Buyers will see
                    these on your profile.
                  </p>
                </div>
              </div>
            </div>

            <CommodityPicker
              categories={categories}
              roleId={form.roleId}
              mode="multi"
              selectedIds={selectedCommodities}
              onSelectionChange={setSelectedCommodities}
              idPrefix="reg-commodity"
            />

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
    </div>
  );
}

