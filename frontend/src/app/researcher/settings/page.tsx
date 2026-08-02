"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { HandlerProfile, isResearcher, ROLES } from "@/lib/types";
import {
  isValidPhone,
  normalizePhoneForStorage,
  onCountryChangePhone,
  PHONE_VALIDATION_MESSAGE,
  phoneToFormValue,
} from "@/lib/phone";
import { PhoneInput } from "@/components/PhoneInput";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { SpinnerLabel, PageContentSkeleton } from "@/components/LoadingPrimitives";
import {
  ProfileIdentityHeader,
  ProfileEditSection,
  ProfileEditActions,
  ProfileInfoSection,
} from "@/components/ProfileIdentityHeader";
import { QualificationSelector } from "@/components/QualificationSelector";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";

export default function ResearcherSettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);

  const [buyerHandlers, setBuyerHandlers] = useState<HandlerProfile[]>([]);
  const [handlerId, setHandlerId] = useState("");
  const [editing, setEditing] = useState(false);
  const [photoCacheBust, setPhotoCacheBust] = useState(0);
  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    region: "",
    city: "",
    address: "",
  });
  const [institution, setInstitution] = useState("");
  const [expertise, setExpertise] = useState("");
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isResearcher(user.roleId)) router.push("/dashboard");
    if (user) {
      setHandlerId(user.assignedHandler?.id || "");
      setPhotoCacheBust(Date.now());
    }
  }, [user?.id, loading, router]);

  useEffect(() => {
    api.auth.handlers("buyer").then(setBuyerHandlers).catch(console.error);
  }, []);

  const populateFormFromUser = () => {
    if (!user) return;
    setPersonal({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: phoneToFormValue(user.phone || "", user.country || DEFAULT_COUNTRY),
      country: user.country || DEFAULT_COUNTRY,
      region: user.region || "",
      city: user.city || "",
      address: user.address || "",
    });
    setInstitution(user.researcherProfile?.institution || "");
    setExpertise(user.researcherProfile?.expertise || "");
    setQualifications(user.researcherProfile?.qualifications || []);
    setBio(user.researcherProfile?.bio || "");
    setHandlerId(user.assignedHandler?.id || "");
  };

  const startEditing = () => {
    populateFormFromUser();
    setMessage("");
    setError("");
    setEditing(true);
  };

  const resetForm = () => {
    populateFormFromUser();
    setMessage("");
    setError("");
    setEditing(false);
  };

  const handlePhoto = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      await api.upload.profilePicture(file);
      await refreshUser();
      setPhotoCacheBust(Date.now());
      setMessage("Profile photo updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!isValidPhone(personal.phone, personal.country)) {
      setError(PHONE_VALIDATION_MESSAGE);
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await Promise.all([
        api.auth.updateProfile({
          ...personal,
          phone: normalizePhoneForStorage(personal.phone, personal.country),
        }),
        api.research.updateProfile({ institution, expertise, qualifications, bio }),
      ]);
      if (handlerId && handlerId !== user?.assignedHandler?.id) {
        await api.auth.updateHandler(handlerId);
      }
      await refreshUser();
      await api.auth.handlers("buyer").then(setBuyerHandlers);
      setMessage("Profile updated.");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <PageContentSkeleton variant="form" maxWidth="max-w-2xl" />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-900">Researcher Profile</h1>

      <ProfileIdentityHeader
        user={user}
        photoCacheBust={photoCacheBust}
        onEditClick={!editing ? startEditing : undefined}
      />

      {message && (
        <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!editing && <ProfileInfoSection user={user} className="mb-6" />}

      {editing && (
        <ProfileEditSection>
          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-brand-900">Profile photo</h2>
            <div className="flex flex-wrap items-center gap-4">
              <ProfilePhoto
                src={user.profilePicture}
                name={user.firstName}
                size={128}
                cacheBust={photoCacheBust}
                uploading={uploading}
              />
              <div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                />
                <button
                  type="button"
                  className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                  disabled={uploading}
                  onClick={() => photoRef.current?.click()}
                >
                  {uploading ? (
                    <SpinnerLabel label="Uploading..." className="h-4 w-4" />
                  ) : (
                    "Change profile photo"
                  )}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-brand-900">Personal information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="auth-label">First name</label>
                <input
                  className="auth-input"
                  value={personal.firstName}
                  onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="auth-label">Last name</label>
                <input
                  className="auth-input"
                  value={personal.lastName}
                  onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="auth-label">Phone</label>
                <PhoneInput
                  value={personal.phone}
                  country={personal.country}
                  onChange={(phone) => setPersonal({ ...personal, phone })}
                />
              </div>
              <div>
                <label className="auth-label">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="auth-input bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="auth-label">Country</label>
                <CountrySelect
                  value={personal.country}
                  onChange={(country) =>
                    setPersonal((prev) => ({
                      ...prev,
                      country,
                      phone: onCountryChangePhone(prev.phone, prev.country, country),
                    }))
                  }
                />
              </div>
              <div>
                <label className="auth-label">Region / State</label>
                <input
                  className="auth-input"
                  value={personal.region}
                  onChange={(e) => setPersonal({ ...personal, region: e.target.value })}
                />
              </div>
              <div>
                <label className="auth-label">City</label>
                <input
                  className="auth-input"
                  value={personal.city}
                  onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="auth-label">Address (optional)</label>
                <input
                  className="auth-input"
                  value={personal.address}
                  onChange={(e) => setPersonal({ ...personal, address: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-brand-900">Research profile</h2>
            <div>
              <label className="auth-label">Institution</label>
              <input
                className="auth-input"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div>
              <label className="auth-label">Area of expertise</label>
              <input
                className="auth-input"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
              />
            </div>
            <div>
              <label className="auth-label">Qualifications</label>
              <QualificationSelector
                idPrefix="settings"
                value={qualifications}
                onChange={setQualifications}
              />
            </div>
            <div>
              <label className="auth-label">Bio</label>
              <textarea
                className="auth-input min-h-[100px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <HandlerSelect
              handlers={buyerHandlers}
              value={handlerId}
              onChange={setHandlerId}
              label="Your Client Liaison Officer"
              emptyMessage="No client liaison officers registered yet."
              handlerRoleId={ROLES.BUYER_HANDLER}
            />
            <p className="mt-2 text-xs text-gray-500">
              Choose the liaison officer who represents you on the platform, same as buyer clients.
            </p>
          </section>

          <ProfileEditActions
            onCancel={resetForm}
            onSave={save}
            saving={saving}
            saveDisabled={!handlerId}
          />
        </ProfileEditSection>
      )}
    </div>
  );
}
