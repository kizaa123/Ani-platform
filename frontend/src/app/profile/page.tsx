"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { fullName, isBuyer, isHandler, isStaff } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (isBuyer(user.roleId)) router.replace("/settings");
      else if (isHandler(user.roleId)) router.replace("/agents/settings");
    }
  }, [user?.id, loading, router]);

  if (loading || !user) return <div className="p-12 text-center">Loading...</div>;
  if (isBuyer(user.roleId) || isHandler(user.roleId)) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-brand-900">Profile</h1>
      <div className="rounded-2xl border border-brand-100 bg-white p-8">
        <div className="mb-6 flex items-center gap-6">
          <FarmerAvatar
            src={user.profilePicture}
            name={user.firstName}
            size="lg"
            cacheBust={user.updatedAt ? new Date(user.updatedAt).getTime() : undefined}
          />
        </div>
        <h2 className="text-2xl font-bold text-brand-900">{fullName(user)}</h2>
        <p className="text-brand-600">{user.role}</p>
        <div className="mt-6 space-y-3 text-sm">
          <p>
            <span className="text-gray-500">Email:</span>{" "}
            <a href={`mailto:${user.email}`} className="font-medium text-brand-700 hover:underline">
              {user.email}
            </a>
          </p>
          <p>
            <span className="text-gray-500">Phone:</span> {user.phone}
          </p>
          <p>
            <span className="text-gray-500">Location:</span> {user.city}, {user.region}, {user.country}
          </p>
          {user.address && (
            <p>
              <span className="text-gray-500">Address:</span> {user.address}
            </p>
          )}
          <p>
            <span className="text-gray-500">Verification:</span> {user.verificationStatus}
          </p>
        </div>
        {isStaff(user.roleId) && (
          <p className="mt-6 text-sm text-gray-500">
            Staff profile editing coming soon. Contact admin for account changes.
          </p>
        )}
      </div>
    </div>
  );
}
