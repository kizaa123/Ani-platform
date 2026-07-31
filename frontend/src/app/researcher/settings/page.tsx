"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { HandlerProfile, isResearcher, ROLES } from "@/lib/types";
import { isValidPhone, normalizePhone, PHONE_VALIDATION_MESSAGE } from "@/lib/phone";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountrySelect } from "@/components/CountrySelect";
import { HandlerSelect } from "@/components/HandlerSelect";
import { SpinnerLabel, PageContentSkeleton } from "@/components/LoadingPrimitives";
import {
  ProfileIdentityHeader,
  ProfileEditSection,
  ProfileEditActions,
} from "@/components/ProfileIdentityHeader";
import { QualificationSelector } from "@/components/QualificationSelector";
import { QualificationBadges } from "@/components/QualificationBadges";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";

function formatLocation(
  country?: string,
  region?: string,
  city?: string,
  address?: string
): string | null {
  const parts = [country?.trim(), region?.trim(), city?.trim(), address?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

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
      phone: user.phone || "",
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
    if (!isValidPhone(personal.phone)) {
      setError(PHONE_VALIDATION_MESSAGE);
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await Promise.all([
        api.auth.updateProfile({ ...personal, phone: normalizePhone(personal.phone) }),
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

  const location = formatLocation(user.country, user.region, user.city, user.address);
  const bioText = user.researcherProfile?.bio?.trim();
  const institutionText = user.researcherProfile?.institution?.trim();
  const expertiseText = user.researcherProfile?.expertise?.trim();

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

      {!editing && (
        <section className="space-y-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          {user.phone && (
            <div>
              <h2 className="text-sm font-medium text-gray-500">Phone</h2>
              <p className="mt-1 text-brand-900">{user.phone}</p>
            </div>
          )}
          {location && (
            <div>
              <h2 className="text-sm font-medium text-gray-500">Location</h2>
              <p className="mt-1 text-brand-900">{location}</p>
            </div>
          )}
          <div>
            <h2 className="text-sm font-medium text-gray-500">Institution</h2>
            <p className="mt-1 text-brand-900">{institutionText || "Not specified."}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Area of expertise</h2>
            <p className="mt-1 text-brand-900">{expertiseText || "Not specified."}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Qualifications</h2>
            {user.researcherProfile?.qualifications?.length ? (
              <QualificationBadges
                qualifications={user.researcherProfile.qualifications}
                className="mt-2"
                size="md"
              />
            ) : (
              <p className="mt-1 text-brand-900">No qualifications added yet.</p>
            )}
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Bio</h2>
            <p className="mt-1 whitespace-pre-wrap text-brand-900">
              {bioText || "No bio added yet."}
            </p>
          </div>
        </section>
      )}

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
              <div>
                <label className="auth-label">Phone</label>
                <input
                  className="auth-input"
                  value={personal.phone}
                  onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
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
                  onChange={(country) => setPersonal({ ...personal, country })}
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
