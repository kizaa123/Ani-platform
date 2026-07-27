"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isStudent } from "@/lib/types";
import { CountrySelect } from "@/components/CountrySelect";
import { ProfileIdentityHeader } from "@/components/ProfileIdentityHeader";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";
import { isValidPhone, normalizePhone, PHONE_VALIDATION_MESSAGE } from "@/lib/phone";

export default function StudentSettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      await api.upload.profilePicture(file);
      await refreshUser();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
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
      setMessage("Profile updated");
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
      <ProfileIdentityHeader user={user} />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
      />
      <button
        type="button"
        className="btn-outline mb-8"
        disabled={uploading}
        onClick={() => photoRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Change profile photo"}
      </button>

      <div className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
