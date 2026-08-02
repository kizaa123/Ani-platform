"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isStudent } from "@/lib/types";
import { CountrySelect } from "@/components/CountrySelect";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import {
  ProfileIdentityHeader,
  ProfileEditSection,
  ProfileEditActions,
  ProfileInfoSection,
} from "@/components/ProfileIdentityHeader";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";
import { isValidPhone, normalizePhone, PHONE_VALIDATION_MESSAGE } from "@/lib/phone";

export default function StudentSettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    phone: "",
    country: "",
    region: "",
    city: "",
  });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isStudent(user.roleId)) router.push("/dashboard");
    if (user) {
      setForm({
        phone: user.phone || "",
        country: user.country || DEFAULT_COUNTRY,
        region: user.region || "",
        city: user.city || "",
      });
    }
  }, [user, loading, router]);

  const resetForm = () => {
    if (!user) return;
    setForm({
      phone: user.phone || "",
      country: user.country || DEFAULT_COUNTRY,
      region: user.region || "",
      city: user.city || "",
    });
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
      setMessage("Profile photo updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!isValidPhone(form.phone)) {
      setError(PHONE_VALIDATION_MESSAGE);
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.auth.updateProfile({
        phone: normalizePhone(form.phone),
        country: form.country.trim(),
        region: form.region.trim(),
        city: form.city.trim(),
      });
      await refreshUser();
      setMessage("Profile updated.");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-900">Student Profile</h1>

      <ProfileIdentityHeader
        user={user}
        onEditClick={!editing ? () => setEditing(true) : undefined}
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
              <ProfilePhoto src={user.profilePicture} name={user.firstName} size={128} />
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
                  {uploading ? "Uploading..." : "Change profile photo"}
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-brand-900">Contact & location</h2>
            <div>
              <label className="auth-label">Phone</label>
              <input
                className="auth-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit phone number"
              />
            </div>
            <div>
              <label className="auth-label">Country</label>
              <CountrySelect
                value={form.country}
                onChange={(country) => setForm({ ...form, country })}
              />
            </div>
            <div>
              <label className="auth-label">Region</label>
              <input
                className="auth-input"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
            <div>
              <label className="auth-label">City</label>
              <input
                className="auth-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </section>

          <ProfileEditActions onCancel={resetForm} onSave={save} saving={saving} />
        </ProfileEditSection>
      )}
    </div>
  );
}
