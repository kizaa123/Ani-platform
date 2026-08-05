"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { CommodityCategory, HandlerProfile, ROLES, farmerCategoryFilter, isFarmer, isOrganizationFarmer } from "@/lib/types";
import {
  getDialCodeForCountryName,
  isValidPhone,
  normalizePhoneForStorage,
  onCountryChangePhone,
  parsePhoneInput,
} from "@/lib/phone";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { CommodityPicker } from "@/components/CommodityPicker";
import { QualificationSelector } from "@/components/QualificationSelector";
// Email verification removed
import { PhoneVerificationChallenge } from "@/components/PhoneVerificationChallenge";
import { EmailText } from "@/components/EmailText";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";
import { PlatformBrandTitle } from "@/components/PlatformBrandTitle";
import { ScrollReveal } from "@/components/ScrollReveal";

const ALL_ROLES = [
  { group: "Fellow", id: ROLES.CROP_FARMER, label: "Fellow - Crop" },
  { group: "Fellow", id: ROLES.LIVESTOCK_FARMER, label: "Fellow - Livestock" },
  { group: "Fellow", id: ROLES.ORGANIZATION_FARMER, label: "Fellow - Organization" },
  { group: "Research & Commerce", id: ROLES.RESEARCHER, label: "Researcher" },
  { group: "Research & Commerce", id: ROLES.BUYER, label: "Client" },
  { group: "Support & Operations", id: ROLES.FARMER_HANDLER, label: "Fellow Liaison Officer" },
  { group: "Support & Operations", id: ROLES.BUYER_HANDLER, label: "Client Liaison Officer" },
  { group: "Support & Operations", id: ROLES.ANI_ACCOUNTANT, label: "ANI Accountant" },
];

const ROLE_GROUPS = [
  { groupLabel: "Fellow", roles: ALL_ROLES.filter((r) => r.group === "Fellow") },
  { groupLabel: "Research & Commerce", roles: ALL_ROLES.filter((r) => r.group === "Research & Commerce") },
  { groupLabel: "Support & Operations", roles: ALL_ROLES.filter((r) => r.group === "Support & Operations") },
];

function buildCompletePayload(
  form: {
    phone: string;
    password: string;
    country: string;
    region: string;
    city: string;
    address: string;
    roleId: number;
    farmName: string;
    experienceYears: number;
    company: string;
    institution: string;
    expertise: string;
    qualifications: string[];
    handlerId: string;
  },
  selectedCommodities: number[],
  customProducts: string[],
  isFarmerRole: boolean,
  needsHandler: boolean,
  hasGoogleAuth: boolean
) {
  const payload: Record<string, unknown> = {
    phone: normalizePhoneForStorage(form.phone, form.country),
    country: form.country.trim(),
    region: form.region.trim(),
    city: form.city.trim(),
    roleId: form.roleId,
  };
  if (!hasGoogleAuth && form.password.trim()) payload.password = form.password;
  if (form.address.trim()) payload.address = form.address.trim();
  if (needsHandler && form.handlerId.trim()) payload.handlerId = form.handlerId.trim();
  if (isFarmerRole) {
    if (selectedCommodities.length > 0) payload.commodityIds = selectedCommodities;
    if (customProducts.length > 0) payload.customProducts = customProducts;
    if (form.farmName.trim()) payload.farmName = form.farmName.trim();
    if (form.experienceYears > 0) payload.experienceYears = form.experienceYears;
  } else if (form.roleId === ROLES.BUYER && form.company.trim()) {
    payload.company = form.company.trim();
  } else if (form.roleId === ROLES.RESEARCHER) {
    if (form.institution.trim()) payload.institution = form.institution.trim();
    if (form.expertise.trim()) payload.expertise = form.expertise.trim();
    if (form.qualifications.length > 0) payload.qualifications = form.qualifications;
  }
  return payload;
}

export default function CompleteProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<CommodityCategory[]>([]);
  const [selectedCommodities, setSelectedCommodities] = useState<number[]>([]);
  const [customProducts, setCustomProducts] = useState<string[]>([]);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [farmerHandlers, setFarmerHandlers] = useState<HandlerProfile[]>([]);
  const [buyerHandlers, setBuyerHandlers] = useState<HandlerProfile[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    phone: "",
    password: "",
    country: "",
    region: "",
    city: "",
    address: "",
    roleId: ROLES.BUYER as number,
    farmName: "",
    experienceYears: 0,
    company: "",
    institution: "",
    expertise: "",
    qualifications: [] as string[],
    handlerId: "",
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.profileComplete) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    api.commodities.categories().then(setCategories).catch(() => {});
    api.auth.handlers("farmer").then(setFarmerHandlers).catch(() => {});
    api.auth.handlers("buyer").then(setBuyerHandlers).catch(() => {});
  }, []);

  const isFarmerRole = isFarmer(form.roleId);
  const isBuyerRole = form.roleId === ROLES.BUYER;
  const isResearcherRole = form.roleId === ROLES.RESEARCHER;
  const needsHandler = isFarmerRole || isBuyerRole || isResearcherRole;
  const availableHandlers = isFarmerRole ? farmerHandlers : isBuyerRole || isResearcherRole ? buyerHandlers : [];
  const categoryFilter = farmerCategoryFilter(form.roleId);
  const needsPhoneStep = !user?.phoneVerified;
  const ACCOUNT_STEP = 0;
  const PHONE_STEP = needsPhoneStep ? 1 : -1;
  const DETAILS_STEP = needsPhoneStep ? 2 : 1;
  const COMMODITIES_STEP = needsPhoneStep ? 3 : 2;
  const totalSteps = (isFarmerRole ? 4 : 3) - (needsPhoneStep ? 0 : 1);
  const phoneDialCode = getDialCodeForCountryName(form.country);

  const handleCountryChange = (country: string) => {
    setForm((prev) => ({
      ...prev,
      country,
      phone: onCountryChangePhone(prev.phone, prev.country, country),
    }));
  };

  const handlePhoneChange = (raw: string) => {
    const local = parsePhoneInput(raw, form.country);
    setForm((prev) => ({ ...prev, phone: local }));
  };

  const hasGoogleAuth = Boolean(user?.hasGoogleAuth);

  const canContinueAccount =
    isValidPhone(form.phone, form.country) &&
    form.country.trim() &&
    (hasGoogleAuth || !form.password || form.password.length >= 8);

  const canContinueDetails =
    form.region.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    (!needsHandler || (form.handlerId.trim() && availableHandlers.length > 0));

  const finish = async () => {
    if (needsHandler && !form.handlerId) {
      setError("Please select a handler before finishing.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await api.auth.completeProfile(
        buildCompletePayload(form, selectedCommodities, customProducts, isFarmerRole, needsHandler, hasGoogleAuth)
      );
      api.setTokens(result.accessToken, result.refreshToken);
      if (isFarmerRole && profileFile) {
        try {
          await api.upload.profilePicture(profileFile);
        } catch {
          // optional photo
        }
      }
      await refreshUser();
      router.push(
        isFarmerRole ? "/farm" : isResearcherRole ? "/researcher/publications" : "/dashboard"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.profileComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">
        Loading your profile...
      </div>
    );
  }

  const displayStep = step;
  const stepLabels = [
    "Account",
    ...(needsPhoneStep ? ["Phone"] : []),
    "Details",
    ...(isFarmerRole ? ["Commodities"] : []),
  ];

  return (
    <div className="flex-1 w-full bg-brand-50">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-10 sm:py-14">
        <ScrollReveal trigger="mount" duration={500} direction="fade-up" className="w-full">
          <div className="space-y-8 rounded-2xl border border-brand-100 bg-white p-8 shadow-xl">
            <header className="text-center lg:text-left">
              <PlatformBrandTitle theme="dark" size="compact" className="mb-4 lg:hidden" />
              <div className="hidden lg:inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 mb-4">
                <Icon name="user-plus" className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-extrabold text-brand-900 tracking-tight">Complete your profile</h1>
              <p className="mt-2 text-sm text-gray-500">
                Signed in as {user.firstName} {user.lastName} ·{" "}
                <EmailText email={user.email} className="inline" />
              </p>
            </header>

            <div className="auth-step-indicator">
              <div className="auth-step-track">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                  <div
                    key={s}
                    className={`auth-step-bar ${displayStep >= s - 1 ? "auth-step-bar-active" : ""}`}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="auth-step-labels">
                {stepLabels.map((label, index) => (
                  <span key={label} className={displayStep >= index ? "auth-step-label-active" : undefined}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email verification step removed */}

            {step === PHONE_STEP && needsPhoneStep && (
              <PhoneVerificationChallenge
                phone={normalizePhoneForStorage(form.phone, form.country) || form.phone}
                country={form.country}
                onVerified={async () => {
                  await refreshUser();
                  setStep(DETAILS_STEP);
                }}
              />
            )}

            {step === ACCOUNT_STEP && (
              <div className="auth-form">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="auth-field">
                    <label className="auth-label">First name</label>
                    <input value={user.firstName} readOnly className="auth-input bg-brand-50/80" />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Last name</label>
                    <input value={user.lastName} readOnly className="auth-input bg-brand-50/80" />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <input value={user.email} readOnly className="auth-input bg-brand-50/80" />
                </div>
                <div className="auth-field">
                  <label htmlFor="complete-country" className="auth-label">Select Country</label>
                  <CountrySelect id="complete-country" value={form.country} onChange={handleCountryChange} required />
                </div>
                <div className="auth-field">
                  <label htmlFor="complete-phone" className="auth-label">Mobile money phone</label>
                  <div className="flex overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
                    <span className="flex shrink-0 items-center border-r border-brand-200 bg-brand-50/80 px-3 text-sm font-semibold text-brand-800">
                      {phoneDialCode || "-"}
                    </span>
                    <input
                      id="complete-phone"
                      required
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="241234567"
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
                {!hasGoogleAuth && (
                  <div className="auth-field">
                    <label htmlFor="complete-password" className="auth-label">
                      Platform password <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <PasswordInput
                      id="complete-password"
                      minLength={8}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Set a password to also sign in with email"
                    />
                    <p className="auth-hint">Optional - leave blank if you only use email/password login elsewhere</p>
                  </div>
                )}
                <div className="auth-field">
                  <label htmlFor="complete-role" className="auth-label">Select Role</label>
                  <select
                    id="complete-role"
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: Number(e.target.value), handlerId: "" })}
                    className="auth-input w-full"
                  >
                    {ROLE_GROUPS.map((group) => (
                      <optgroup key={group.groupLabel} label={group.groupLabel}>
                        {group.roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!canContinueAccount}
                  onClick={() => {
                    setError("");
                    setStep(needsPhoneStep ? PHONE_STEP : DETAILS_STEP);
                  }}
                  className="btn-primary auth-nav-btn disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            )}

            {step === DETAILS_STEP && (
              <div className="auth-form">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="auth-field">
                    <label htmlFor="complete-region" className="auth-label">Region / State</label>
                    <input id="complete-region" required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="auth-input" />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="complete-city" className="auth-label">City</label>
                    <input id="complete-city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="auth-input" />
                  </div>
                  <div className="auth-field sm:col-span-2">
                    <label htmlFor="complete-address" className="auth-label">Address <span className="font-normal text-gray-500">(optional)</span></label>
                    <input id="complete-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="auth-input" />
                  </div>
                </div>

                {isFarmerRole && (
                  <>
                    <div className="auth-section">
                      <p className="auth-section-title mb-4">Profile photo (optional)</p>
                      <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-200 bg-white">
                          {profilePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profilePreview} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <Icon name="user" className="h-8 w-8 text-brand-400" />
                          )}
                        </div>
                        <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProfileFile(file);
                            setProfilePreview(URL.createObjectURL(file));
                          }
                        }} />
                        <button type="button" onClick={() => profileInputRef.current?.click()} className="btn-outline inline-flex items-center gap-2">
                          <Icon name="camera" className="h-4 w-4" />
                          Upload photo
                        </button>
                      </div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">{isOrganizationFarmer(form.roleId) ? "Organization name" : "Production name"}</label>
                      <input value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} className="auth-input" />
                    </div>
                  </>
                )}

                {form.roleId === ROLES.BUYER && (
                  <div className="auth-field">
                    <label className="auth-label">Company</label>
                    <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="auth-input" />
                  </div>
                )}

                {form.roleId === ROLES.RESEARCHER && (
                  <>
                    <div className="auth-field">
                      <label className="auth-label">Institution</label>
                      <input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className="auth-input" />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Area of expertise</label>
                      <input value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} className="auth-input" />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">
                        Qualifications <span className="text-gray-400">(optional)</span>
                      </label>
                      <QualificationSelector
                        idPrefix="complete"
                        value={form.qualifications}
                        onChange={(qualifications) => setForm({ ...form, qualifications })}
                      />
                    </div>
                  </>
                )}

                {needsHandler && (
                  <HandlerSelect
                    handlers={availableHandlers}
                    value={form.handlerId}
                    onChange={(handlerId) => setForm({ ...form, handlerId })}
                    label={isFarmerRole ? "Choose your Fellow Liaison Officer" : "Choose your Client Liaison Officer"}
                    emptyMessage={isFarmerRole ? "No fellow liaison officers registered yet." : "No client liaison officers registered yet."}
                    variant="compact"
                    handlerRoleId={isFarmerRole ? ROLES.FARMER_HANDLER : ROLES.BUYER_HANDLER}
                  />
                )}

                <div className="auth-nav">
                  <button type="button" onClick={() => setStep(needsPhoneStep ? PHONE_STEP : ACCOUNT_STEP)} className="btn-outline auth-nav-btn">Back</button>
                  <button
                    type="button"
                    disabled={submitting || !canContinueDetails}
                    onClick={() => (isFarmerRole ? setStep(COMMODITIES_STEP) : finish())}
                    className="btn-primary auth-nav-btn disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : isFarmerRole ? "Continue" : "Finish setup"}
                  </button>
                </div>
              </div>
            )}

            {step === COMMODITIES_STEP && isFarmerRole && categoryFilter && (
              <div className="auth-form">
                <div className="auth-section">
                  <h3 className="auth-section-title">
                    {categoryFilter === "All"
                      ? "Commodities"
                      : `${categoryFilter} Commodities`}
                  </h3>
                  <p className="auth-hint mt-1">
                    Search and choose commodities from the list, or select Production to type your own.
                  </p>
                </div>

                <CommodityPicker
                  categories={categories}
                  roleId={form.roleId}
                  mode="multi"
                  selectedIds={selectedCommodities}
                  onSelectionChange={setSelectedCommodities}
                  customProducts={customProducts}
                  onCustomProductsChange={setCustomProducts}
                  idPrefix="complete-commodity"
                />

                <div className="auth-nav">
                  <button type="button" onClick={() => setStep(DETAILS_STEP)} className="btn-outline auth-nav-btn">Back</button>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      (selectedCommodities.length === 0 && customProducts.length === 0) ||
                      !form.handlerId
                    }
                    onClick={finish}
                    className="btn-primary auth-nav-btn disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Finish setup"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
