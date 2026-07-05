"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { fullName, isBuyer, isHandler } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountrySelect } from "@/components/CountrySelect";
import { DEFAULT_COUNTRY } from "@/lib/africanCountries";
import {
  ProfileIdentityHeader,
  ProfileEditSection,
  ProfileEditActions,
} from "@/components/ProfileIdentityHeader";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const profilePicRef = useRef<HTMLInputElement>(null);

  const [photoCacheBust, setPhotoCacheBust] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    phone: "",
    country: "",
    region: "",
    city: "",
    address: "",
  });

  useEffect(() => {
    if (!loading && user) {
      if (isBuyer(user.roleId)) router.replace("/settings");
      else if (isHandler(user.roleId)) router.replace("/agents/settings");
    }
  }, [user?.id, loading, router]);

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || "",
        country: user.country || DEFAULT_COUNTRY,
        region: user.region || "",
        city: user.city || "",
        address: user.address || "",
      });
      setPhotoCacheBust(user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now());
    }
  }, [user?.id]);

  const resetForm = () => {
    if (!user) return;
    setForm({
      phone: user.phone || "",
      country: user.country || DEFAULT_COUNTRY,
      region: user.region || "",
      city: user.city || "",
      address: user.address || "",
    });
    setMessage("");
    setError("");
    setEditing(false);
  };

  const uploadPhoto = async (file: File) => {
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

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.auth.updateProfile(form);
      await refreshUser();
      setPhotoCacheBust(Date.now());
      setMessage("Profile saved successfully.");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="p-12 text-center">Loading...</div>;
  if (isBuyer(user.roleId) || isHandler(user.roleId)) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Profile</h1>
        <p className="text-gray-500">Your staff account details</p>
      </div>

      <ProfileIdentityHeader
        user={user}
        photoCacheBust={photoCacheBust}
        onEditClick={!editing ? () => setEditing(true) : undefined}
      />

      {message && (
        <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {editing && (
        <ProfileEditSection>
          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-brand-900">Profile photo</h2>
            <div className="flex flex-wrap items-center gap-4">
              <ProfilePhoto
                src={user.profilePicture}
                name={user.firstName}
                size={112}
                cacheBust={photoCacheBust}
              />
              <div>
                <input
                  ref={profilePicRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => profilePicRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Change photo"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-brand-700">
              {fullName(user)} · {user.email}
            </p>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-brand-900">Contact & location</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Phone number</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Country</label>
                <CountrySelect
                  value={form.country}
                  onChange={(country) => setForm({ ...form, country })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Region / State</label>
                  <input
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Address (optional)</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <ProfileEditActions onCancel={resetForm} onSave={saveSettings} saving={saving} />
        </ProfileEditSection>
      )}
    </div>
  );
}
