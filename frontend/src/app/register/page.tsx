"use client";

import { Suspense, useEffect, useState, useRef, useMemo, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { CommodityCategory, HandlerProfile, ROLES, farmerCategoryFilter, isFarmer, isOrganizationFarmer } from "@/lib/types";
import {
  getDialCodeForCountryName,
  normalizePhoneForStorage,
  onCountryChangePhone,
  parsePhoneInput,
} from "@/lib/phone";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { CommodityPicker } from "@/components/CommodityPicker";
import { CustomProductInput } from "@/components/CustomProductInput";
import { QualificationSelector } from "@/components/QualificationSelector";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";
import { AuthDivider, GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AuthHeroPanel } from "@/components/AuthHeroPanel";
import {
  blockingMessages,
  canProceedStep1,
  canProceedStep2,
  canProceedStep3,
  mergeFieldErrors,
  parseRegistrationError,
  stepsWithErrors,
  validateStep1,
  validateStep2,
  validateStep3,
  type FieldErrors,
  type RegisterField,
} from "@/lib/registerValidation";

const GOOGLE_DEV_MODE = process.env.NEXT_PUBLIC_GOOGLE_DEV_MODE === "true";

/** Flat list of all roles for the <select> dropdown */
const ALL_ROLES = [
  { group: "Fellow",                  id: ROLES.CROP_FARMER,         label: "Fellow - Crop" },
  { group: "Fellow",                  id: ROLES.LIVESTOCK_FARMER,    label: "Fellow - Livestock" },
  { group: "Fellow",                  id: ROLES.ORGANIZATION_FARMER, label: "Fellow - Organization" },
  { group: "Research & Commerce",      id: ROLES.RESEARCHER,       label: "Researcher" },
  { group: "Research & Commerce",      id: ROLES.BUYER,            label: "Client" },
  { group: "Support & Operations",     id: ROLES.FARMER_HANDLER,   label: "Fellow Liaison Officer" },
  { group: "Support & Operations",     id: ROLES.BUYER_HANDLER,    label: "Client Liaison Officer" },
  { group: "Support & Operations",     id: ROLES.ANI_ACCOUNTANT,   label: "ANI Accountant" },
];

const ROLE_GROUPS_FOR_SELECT = [
  { groupLabel: "Fellow",              roles: ALL_ROLES.filter((r) => r.group === "Fellow") },
  { groupLabel: "Research & Commerce", roles: ALL_ROLES.filter((r) => r.group === "Research & Commerce") },
  { groupLabel: "Support & Operations",roles: ALL_ROLES.filter((r) => r.group === "Support & Operations") },
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
  needsHandler: boolean
) {
  const payload: Record<string, unknown> = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: normalizePhoneForStorage(form.phone, form.country),
    password: form.password,
    country: form.country.trim(),
    region: form.region.trim(),
    city: form.city.trim(),
    roleId: form.roleId,
  };

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

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="auth-field-error" role="alert">
      {message}
    </p>
  );
}

function ValidationSummary({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="auth-validation-summary mb-5" role="status">
      <p className="auth-validation-summary-title">Complete these to continue:</p>
      <ul className="auth-validation-summary-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RegisterActionButton({
  blocked,
  blockingItems,
  loading,
  onBlocked,
  onClick,
  children,
  className = "btn-primary auth-nav-btn",
}: {
  blocked: boolean;
  blockingItems: string[];
  loading?: boolean;
  onBlocked: () => void;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  const handleClick = () => {
    if (loading) return;
    if (blocked) {
      onBlocked();
      return;
    }
    onClick();
  };

  return (
    <div className="group relative w-full sm:flex-1">
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={blocked || loading}
        className={`${className} w-full ${blocked || loading ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {children}
      </button>
      {blocked && blockingItems.length > 0 && (
        <div
          className="pointer-events-none absolute bottom-full left-0 right-0 z-20 mb-2 hidden opacity-0 transition-opacity group-hover:block group-hover:opacity-100"
          role="tooltip"
        >
          <div className="auth-validation-summary shadow-lg">
            <p className="auth-validation-summary-title">Complete these to continue:</p>
            <ul className="auth-validation-summary-list">
              {blockingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const STEP1_FIELDS: RegisterField[] = ["firstName", "lastName", "email", "phone", "password", "country", "roleId"];
const STEP2_FIELDS: RegisterField[] = ["region", "city", "handlerId"];
const STEP3_FIELDS: RegisterField[] = ["commodities", "handlerId"];

function errorsForStep(errors: FieldErrors, fields: RegisterField[]): FieldErrors {
  const out: FieldErrors = {};
  for (const field of fields) {
    if (errors[field]) out[field] = errors[field];
  }
  return out;
}

function RegisterForm() {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<CommodityCategory[]>([]);
  const [selectedCommodities, setSelectedCommodities] = useState<number[]>([]);
  const [customProducts, setCustomProducts] = useState<string[]>([]);
  const [commodityMode, setCommodityMode] = useState<"catalog" | "custom">("catalog");
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [backendFieldErrors, setBackendFieldErrors] = useState<FieldErrors>({});
  const { register, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const profileInputRef = useRef<HTMLInputElement>(null);
  const formColumnRef = useRef<HTMLDivElement>(null);
  const skipInitialStepScrollRef = useRef(true);

  const [farmerHandlers, setFarmerHandlers] = useState<HandlerProfile[]>([]);
  const [buyerHandlers, setBuyerHandlers] = useState<HandlerProfile[]>([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    country: "", region: "", city: "", address: "",
    roleId: ROLES.BUYER as number, farmName: "", experienceYears: 0, company: "",
    institution: "", expertise: "", qualifications: [] as string[],
    handlerId: "",
  });

  const isFarmerRole = isFarmer(form.roleId);
  const isBuyerRole = form.roleId === ROLES.BUYER;
  const isResearcherRole = form.roleId === ROLES.RESEARCHER;
  const needsHandler = isFarmerRole || isBuyerRole || isResearcherRole;
  const availableHandlers = isFarmerRole
    ? farmerHandlers
    : isBuyerRole || isResearcherRole
      ? buyerHandlers
      : [];
  const handlerLabel = isFarmerRole
    ? "Choose your Fellow Liaison Officer"
    : "Choose your Client Liaison Officer";
  const handlerEmptyMessage = isFarmerRole
    ? "No fellow liaison officers registered yet. One must register first."
    : "No client liaison officers registered yet. One must register first.";
  const categoryFilter = farmerCategoryFilter(form.roleId);
  const totalSteps = isFarmerRole ? 3 : 2;
  const stepLabels = isFarmerRole ? STEP_LABELS : STEP_LABELS.slice(0, 2);
  const phoneDialCode = getDialCodeForCountryName(form.country);

  const validationCtx = useMemo(
    () => ({
      form: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        country: form.country,
        region: form.region,
        city: form.city,
        roleId: form.roleId,
        handlerId: form.handlerId,
      },
      selectedCommodities,
      customProducts,
      isFarmerRole,
      needsHandler,
      availableHandlersCount: availableHandlers.length,
      handlerLabel,
    }),
    [
      form.firstName,
      form.lastName,
      form.email,
      form.phone,
      form.password,
      form.country,
      form.region,
      form.city,
      form.roleId,
      form.handlerId,
      selectedCommodities,
      customProducts,
      isFarmerRole,
      needsHandler,
      availableHandlers.length,
      handlerLabel,
    ]
  );

  const step1Errors = useMemo(() => validateStep1(validationCtx.form), [validationCtx.form]);
  const step2Errors = useMemo(() => validateStep2(validationCtx), [validationCtx]);
  const step3Errors = useMemo(() => validateStep3(validationCtx), [validationCtx]);

  const stepProceed = {
    1: canProceedStep1(validationCtx.form),
    2: canProceedStep2(validationCtx),
    3: canProceedStep3(validationCtx),
  } as const;

  const currentClientErrors =
    step === 1 ? step1Errors : step === 2 ? step2Errors : step3Errors;

  const visibleFieldErrors = useMemo(() => {
    const client = showValidation ? currentClientErrors : {};
    const stepFields =
      step === 1 ? STEP1_FIELDS : step === 2 ? STEP2_FIELDS : STEP3_FIELDS;
    const backend = errorsForStep(backendFieldErrors, stepFields);
    return mergeFieldErrors(client, backend);
  }, [showValidation, currentClientErrors, backendFieldErrors, step]);

  const currentBlockingItems = useMemo(
    () => blockingMessages(mergeFieldErrors(showValidation ? currentClientErrors : {}, errorsForStep(backendFieldErrors, step === 1 ? STEP1_FIELDS : step === 2 ? STEP2_FIELDS : STEP3_FIELDS))),
    [showValidation, currentClientErrors, backendFieldErrors, step]
  );

  const stepsWithValidationErrors = useMemo(() => {
    if (!showValidation && Object.keys(backendFieldErrors).length === 0) return [];
    return stepsWithErrors(validationCtx, totalSteps);
  }, [showValidation, backendFieldErrors, validationCtx, totalSteps]);

  const clearBackendError = useCallback((field: RegisterField) => {
    setBackendFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const revealValidation = useCallback(() => setShowValidation(true), []);

  const fieldError = useCallback(
    (field: RegisterField) => visibleFieldErrors[field],
    [visibleFieldErrors]
  );

  const inputClass = useCallback(
    (field: RegisterField) =>
      fieldError(field) ? "auth-input auth-input-invalid" : "auth-input",
    [fieldError]
  );

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

  useEffect(() => {
    api.commodities.categories().then(setCategories).catch(() => {});
    api.auth.handlers("farmer").then(setFarmerHandlers).catch(() => {});
    api.auth.handlers("buyer").then(setBuyerHandlers).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedCommodities([]);
    setCustomProducts([]);
    setCommodityMode("catalog");
    setForm((prev) => ({ ...prev, handlerId: "" }));
  }, [form.roleId]);

  useEffect(() => {
    if (skipInitialStepScrollRef.current) {
      skipInitialStepScrollRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      formColumnRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [step]);

  const handleProfileSelect = (file: File) => {
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const goToStep2 = () => {
    if (!stepProceed[1]) {
      revealValidation();
      setError("");
      return;
    }
    setShowValidation(false);
    setBackendFieldErrors((prev) => errorsForStep(prev, STEP2_FIELDS.concat(STEP3_FIELDS)));
    setError("");
    setStep(2);
  };

  const goToStep3 = () => {
    if (!stepProceed[2]) {
      revealValidation();
      setError("");
      return;
    }
    setShowValidation(false);
    setBackendFieldErrors((prev) => errorsForStep(prev, STEP3_FIELDS));
    setError("");
    setStep(3);
  };

  const handleSubmit = async () => {
    const submitStep = isFarmerRole && step === 3 ? 3 : 2;
    const canSubmit = submitStep === 3 ? stepProceed[3] : stepProceed[2];

    if (!canSubmit) {
      revealValidation();
      if (submitStep === 3 && !stepProceed[2]) {
        setError("Complete step 2 (Details) before creating your account.");
        setStep(2);
      } else {
        setError("");
      }
      return;
    }

    if (needsHandler && !form.handlerId) {
      revealValidation();
      setError("");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await register(
        buildRegisterPayload(form, selectedCommodities, customProducts, isFarmerRole, needsHandler)
      );

      if (isFarmerRole && profileFile) {
        try {
          await api.upload.profilePicture(profileFile);
          await refreshUser();
        } catch {
          // Account created - photo can be added on My Production
        }
      }

      router.push(
        isFarmerRole ? "/farm" : isResearcherRole ? "/researcher/publications" : "/dashboard"
      );
    } catch (err) {
      const parsed = parseRegistrationError(err);
      setBackendFieldErrors(parsed.fieldErrors);
      setShowValidation(true);
      setError(parsed.message);
      if (parsed.targetStep && parsed.targetStep !== step) {
        setStep(parsed.targetStep);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevGoogle = async () => {
    setError("");
    setDevLoading(true);
    try {
      const result = await api.auth.googleDevSignIn({
        email: form.email || "google.dev@ani.gh",
        firstName: form.firstName || "Google",
        lastName: form.lastName || "Dev User",
      });
      api.setTokens(result.accessToken, result.refreshToken);
      await refreshUser();
      router.push("/complete-profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <AuthHeroPanel ref={formColumnRef} className="flex-1" formWidth="wide">
      <ScrollReveal trigger="mount" delay={120} duration={500} direction="fade-up">
        <div className="space-y-6">
          <header className="text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/70 text-brand-700 shadow-xs">
                <Icon name="user" className="h-5 w-5 text-brand-700" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">
                Create Account
              </h1>
            </div>
            <p className="auth-subtitle mt-2 text-sm text-gray-500">
              Step {step} of {totalSteps} - {stepLabels[step - 1]}
            </p>
          </header>

        <div className="auth-step-indicator !mb-6">
          <div className="auth-step-track">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`auth-step-bar ${step >= s ? "auth-step-bar-active" : ""} ${
                  stepsWithValidationErrors.includes(s) ? "auth-step-bar-error" : ""
                }`}
                aria-hidden
              />
            ))}
          </div>
          <div className="auth-step-labels">
            {stepLabels.map((label, index) => {
              const stepNum = index + 1;
              const hasError = stepsWithValidationErrors.includes(stepNum);
              return (
                <span
                  key={label}
                  className={
                    hasError
                      ? "auth-step-label-error"
                      : step >= stepNum
                        ? "auth-step-label-active"
                        : undefined
                  }
                  title={hasError ? `${label} has items to fix` : undefined}
                >
                  {label}
                  {hasError ? " *" : ""}
                </span>
              );
            })}
          </div>
        </div>

        {(error || queryError) && (
          <div className="auth-error mb-5" role="alert">
            <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error || queryError}</span>
          </div>
        )}

        {showValidation && currentBlockingItems.length > 0 && (
          <ValidationSummary items={currentBlockingItems} />
        )}

        {step === 1 && (
          <>
            <GoogleSignInButton
              label="Sign up with Google"
              disabled={loading}
              showDev={GOOGLE_DEV_MODE}
              onDevSignIn={handleDevGoogle}
              devLoading={devLoading}
            />
            <AuthDivider text="or register with email" />
          </>
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
                  onChange={(e) => {
                    clearBackendError("firstName");
                    setForm({ ...form, firstName: e.target.value });
                  }}
                  className={inputClass("firstName")}
                  aria-invalid={!!fieldError("firstName")}
                  aria-describedby={fieldError("firstName") ? "reg-first-name-error" : undefined}
                />
                <FieldErrorMessage message={fieldError("firstName")} />
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
                  onChange={(e) => {
                    clearBackendError("lastName");
                    setForm({ ...form, lastName: e.target.value });
                  }}
                  className={inputClass("lastName")}
                  aria-invalid={!!fieldError("lastName")}
                />
                <FieldErrorMessage message={fieldError("lastName")} />
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
                onChange={(e) => {
                  clearBackendError("email");
                  setForm({ ...form, email: e.target.value });
                }}
                className={inputClass("email")}
                aria-invalid={!!fieldError("email")}
              />
              <FieldErrorMessage message={fieldError("email")} />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-country" className="auth-label">Select Country</label>
              <CountrySelect
                id="reg-country"
                value={form.country}
                onChange={(country) => {
                  clearBackendError("country");
                  handleCountryChange(country);
                }}
                required
                invalid={!!fieldError("country")}
              />
              <FieldErrorMessage message={fieldError("country")} />
              {!fieldError("country") && (
                <p className="auth-hint">Select the African country where you are based</p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="reg-phone" className="auth-label">
                Phone
              </label>
              <div
                className={`flex overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-2 ${
                  fieldError("phone")
                    ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-200"
                    : "border-brand-200 focus-within:border-brand-500 focus-within:ring-brand-200"
                }`}
              >
                <span className="flex shrink-0 items-center border-r border-brand-200 bg-brand-50/80 px-3 text-sm font-semibold text-brand-800">
                  {phoneDialCode || "-"}
                </span>
                <input
                  id="reg-phone"
                  required
                  autoComplete="tel-national"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => {
                    clearBackendError("phone");
                    handlePhoneChange(e.target.value);
                  }}
                  placeholder="241234567"
                  className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0"
                  aria-invalid={!!fieldError("phone")}
                />
              </div>
              <FieldErrorMessage message={fieldError("phone")} />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">
                Password
              </label>
              <PasswordInput
                id="reg-password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => {
                  clearBackendError("password");
                  setForm({ ...form, password: e.target.value });
                }}
                className={inputClass("password")}
                aria-invalid={!!fieldError("password")}
              />
              <FieldErrorMessage message={fieldError("password")} />
              {!fieldError("password") && (
                <p className="auth-hint">At least 8 characters</p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="reg-role" className="auth-label">
                Select Role
              </label>
              <select
                id="reg-role"
                value={form.roleId}
                onChange={(e) => {
                  clearBackendError("roleId");
                  setForm({ ...form, roleId: Number(e.target.value) });
                }}
                className={`${inputClass("roleId")} w-full`}
                aria-invalid={!!fieldError("roleId")}
              >
                {ROLE_GROUPS_FOR_SELECT.map((group) => (
                  <optgroup key={group.groupLabel} label={group.groupLabel}>
                    {group.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {isFarmerRole && categoryFilter && categoryFilter !== "All" && (
                <p className="auth-hint text-brand-700 mt-1">
                  You will only select {categoryFilter.toLowerCase()} commodities in step 3.
                </p>
              )}
              {isOrganizationFarmer(form.roleId) && (
                <p className="auth-hint text-brand-700 mt-1">
                  You will select crop and livestock commodities in step 3.
                </p>
              )}
              <FieldErrorMessage message={fieldError("roleId")} />
            </div>

            <RegisterActionButton
              blocked={!stepProceed[1]}
              blockingItems={blockingMessages(step1Errors)}
              loading={loading}
              onBlocked={revealValidation}
              onClick={goToStep2}
            >
              Continue
            </RegisterActionButton>
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
                onChange={handleCountryChange}
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
                  onChange={(e) => {
                    clearBackendError("region");
                    setForm({ ...form, region: e.target.value });
                  }}
                  className={inputClass("region")}
                  aria-invalid={!!fieldError("region")}
                />
                <FieldErrorMessage message={fieldError("region")} />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-city" className="auth-label">
                  City
                </label>
                <input
                  id="reg-city"
                  required
                  value={form.city}
                  onChange={(e) => {
                    clearBackendError("city");
                    setForm({ ...form, city: e.target.value });
                  }}
                  className={inputClass("city")}
                  aria-invalid={!!fieldError("city")}
                />
                <FieldErrorMessage message={fieldError("city")} />
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
                    {isOrganizationFarmer(form.roleId) ? "Organization Name" : "Farm Name"}
                  </label>
                  <input
                    id="reg-farm-name"
                    value={form.farmName}
                    onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                    placeholder={
                      isOrganizationFarmer(form.roleId)
                        ? `${form.firstName || "My"}'s Organization`
                        : `${form.firstName || "My"}'s Farm`
                    }
                    className="auth-input"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-experience" className="auth-label">
                    Experience (years) <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="reg-experience"
                    type="number"
                    min={0}
                    placeholder="e.g. 5"
                    value={form.experienceYears || ""}
                    onChange={(e) =>
                      setForm({ ...form, experienceYears: parseInt(e.target.value, 10) || 0 })
                    }
                    className="auth-input"
                  />
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

            {form.roleId === ROLES.RESEARCHER && (
              <>
                <div className="auth-field">
                  <label htmlFor="reg-institution" className="auth-label">
                    Institution
                  </label>
                  <input
                    id="reg-institution"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    className="auth-input"
                    placeholder="University or research organization"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-expertise" className="auth-label">
                    Area of expertise
                  </label>
                  <input
                    id="reg-expertise"
                    value={form.expertise}
                    onChange={(e) => setForm({ ...form, expertise: e.target.value })}
                    className="auth-input"
                    placeholder="e.g. Agricultural Economics"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-qualifications" className="auth-label">
                    Qualifications <span className="text-gray-400">(optional)</span>
                  </label>
                  <QualificationSelector
                    idPrefix="reg"
                    value={form.qualifications}
                    onChange={(qualifications) => setForm({ ...form, qualifications })}
                  />
                </div>
              </>
            )}

            {needsHandler && (
              <div className="auth-section">
                <HandlerSelect
                  handlers={availableHandlers}
                  value={form.handlerId}
                  onChange={(handlerId) => {
                    clearBackendError("handlerId");
                    setForm({ ...form, handlerId });
                  }}
                  label={handlerLabel}
                  emptyMessage={handlerEmptyMessage}
                  variant="compact"
                  handlerRoleId={isFarmerRole ? ROLES.FARMER_HANDLER : ROLES.BUYER_HANDLER}
                  invalid={!!fieldError("handlerId")}
                />
                <FieldErrorMessage message={fieldError("handlerId")} />
                {!fieldError("handlerId") && (
                  <p className="auth-hint mt-3">
                    All registered {isFarmerRole ? "fellow liaison officers" : "client liaison officers"} appear here. Your
                    handler supports you on the platform.
                  </p>
                )}
              </div>
            )}

            <div className="auth-nav">
              <button
                type="button"
                onClick={() => {
                  setShowValidation(false);
                  setStep(1);
                }}
                className="btn-outline auth-nav-btn"
              >
                Back
              </button>
              <RegisterActionButton
                blocked={!stepProceed[2]}
                blockingItems={blockingMessages(step2Errors)}
                loading={loading}
                onBlocked={revealValidation}
                onClick={() => (isFarmerRole ? goToStep3() : handleSubmit())}
              >
                {loading ? "Creating..." : isFarmerRole ? "Continue" : "Create Account"}
              </RegisterActionButton>
            </div>
          </div>
        )}

        {step === 3 && isFarmerRole && categoryFilter && (
          <div className="auth-form">
            <div className="auth-section">
              <div className="flex items-start gap-3">
                <Icon name="leaf" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <h3 className="auth-section-title">
                    {commodityMode === "custom"
                      ? "Product"
                      : categoryFilter === "All"
                        ? "Commodities"
                        : `${categoryFilter} Commodities`}
                  </h3>
                  <p className="auth-hint mt-1">
                    {commodityMode === "custom"
                      ? "Type the products you produce. Buyers will see these on your profile."
                      : `Search and choose the ${
                          categoryFilter === "All"
                            ? "crop and livestock products"
                            : categoryFilter?.toLowerCase()
                        } you produce. Buyers will see these on your profile.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 flex rounded-xl border border-brand-200 bg-brand-50/50 p-1">
              <button
                type="button"
                onClick={() => setCommodityMode("catalog")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  commodityMode === "catalog"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-gray-600 hover:text-brand-800"
                }`}
              >
                Select from list
              </button>
              <button
                type="button"
                onClick={() => setCommodityMode("custom")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  commodityMode === "custom"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-gray-600 hover:text-brand-800"
                }`}
              >
                Type my products
              </button>
            </div>

            {commodityMode === "catalog" ? (
              <CommodityPicker
                categories={categories}
                roleId={form.roleId}
                mode="multi"
                selectedIds={selectedCommodities}
                onSelectionChange={(ids) => {
                  clearBackendError("commodities");
                  setSelectedCommodities(ids);
                }}
                idPrefix="reg-commodity"
                invalid={!!fieldError("commodities")}
              />
            ) : (
              <CustomProductInput
                products={customProducts}
                onChange={(products) => {
                  clearBackendError("commodities");
                  setCustomProducts(products);
                }}
                idPrefix="reg-product"
                invalid={!!fieldError("commodities")}
              />
            )}

            {(selectedCommodities.length > 0 || customProducts.length > 0) && (
              <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Your selections
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedCommodities.map((id) => {
                    const name =
                      categories
                        .flatMap((c) => c.commodities ?? [])
                        .find((c) => c.id === id)?.name ?? `Commodity #${id}`;
                    return (
                      <span
                        key={`catalog-${id}`}
                        className="rounded-full border border-brand-200 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-800"
                      >
                        {name}
                      </span>
                    );
                  })}
                  {customProducts.map((product, index) => (
                    <span
                      key={`custom-${product}-${index}`}
                      className="rounded-full border border-brand-200 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-800"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <FieldErrorMessage message={fieldError("commodities")} />

            <div className="auth-nav">
              <button
                type="button"
                onClick={() => {
                  setShowValidation(false);
                  setStep(2);
                }}
                className="btn-outline auth-nav-btn"
              >
                Back
              </button>
              <RegisterActionButton
                blocked={!stepProceed[3]}
                blockingItems={blockingMessages(step3Errors)}
                loading={loading}
                onBlocked={revealValidation}
                onClick={handleSubmit}
              >
                {loading ? "Creating..." : "Create Account"}
              </RegisterActionButton>
            </div>
          </div>
        )}

          <p className="auth-switch !mt-6">
            Have an account?{" "}
            <Link href="/login" className="auth-switch-link">
              Sign in
            </Link>
          </p>
        </div>
      </ScrollReveal>
    </AuthHeroPanel>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
