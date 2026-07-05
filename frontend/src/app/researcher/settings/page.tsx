"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isResearcher } from "@/lib/types";
import { ProfileIdentityHeader } from "@/components/ProfileIdentityHeader";

export default function ResearcherSettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [institution, setInstitution] = useState("");
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isResearcher(user.roleId)) router.push("/dashboard");
    if (user?.researcherProfile) {
      setInstitution(user.researcherProfile.institution || "");
      setExpertise(user.researcherProfile.expertise || "");
      setBio(user.researcherProfile.bio || "");
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
    setSaving(true);
    setMessage("");
    try {
      await api.research.updateProfile({ institution, expertise, bio });
      await refreshUser();
      setMessage("Profile updated");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-900">Researcher Profile</h1>
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
          <label className="auth-label">Institution</label>
          <input className="auth-input" value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </div>
        <div>
          <label className="auth-label">Area of expertise</label>
          <input className="auth-input" value={expertise} onChange={(e) => setExpertise(e.target.value)} />
        </div>
        <div>
          <label className="auth-label">Bio</label>
          <textarea className="auth-input min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        {message && <p className="text-sm text-brand-700">{message}</p>}
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );
}
