"use client";

import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { VerificationBadge } from "@/components/VerificationBadge";
import {
  fullName,
  isFarmer,
  isBuyer,
  isHandler,
  isBuyerHandler,
  type UserProfile,
} from "@/lib/types";

interface ProfileIdentityHeaderProps {
  user: UserProfile;
  photoCacheBust?: number;
  onEditClick?: () => void;
}

export function ProfileIdentityHeader({ user, photoCacheBust, onEditClick }: ProfileIdentityHeaderProps) {
  const cacheBust =
    photoCacheBust ??
    (user.updatedAt
      ? new Date(user.updatedAt).getTime()
      : user.profilePicture
        ? 1
        : 0);

  return (
    <section className="mb-8 rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/30 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <ProfilePhoto
          src={user.profilePicture}
          name={user.firstName}
          size={120}
          cacheBust={cacheBust}
        />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-brand-900">{fullName(user)}</h2>
          <p className="mt-0.5 text-gray-500">{user.role}</p>
          <CountryBadge
            country={user.country}
            region={user.region}
            className="mt-2 justify-center sm:justify-start"
          />
          {isFarmer(user.roleId) && user.farmerProfile?.farmName && (
            <p className="mt-2 text-sm font-medium text-brand-700">{user.farmerProfile.farmName}</p>
          )}
          {isBuyer(user.roleId) && user.buyerProfile?.company && (
            <p className="mt-2 text-sm font-medium text-brand-700">{user.buyerProfile.company}</p>
          )}
          {isHandler(user.roleId) && (
            <p className="mt-2 text-sm text-brand-700">
              {isBuyerHandler(user.roleId)
                ? "Buyer representative — full visibility into your clients"
                : "Farmer representative"}
            </p>
          )}
          {(isFarmer(user.roleId) || isBuyer(user.roleId)) && user.assignedHandler && (
            <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
              <ProfilePhoto
                src={user.assignedHandler.profilePicture}
                name={user.assignedHandler.firstName}
                size={36}
                cacheBust={
                  user.assignedHandler.updatedAt
                    ? new Date(user.assignedHandler.updatedAt).getTime()
                    : undefined
                }
              />
              <p className="text-sm text-brand-700">
                Handler: {user.assignedHandler.firstName} {user.assignedHandler.lastName}
              </p>
            </div>
          )}
          <VerificationBadge status={user.verificationStatus} className="mt-3" />
        </div>
      </div>
      {onEditClick && (
        <div className="mt-6 flex justify-end border-t border-brand-100 pt-5">
          <button type="button" onClick={onEditClick} className="btn-primary">
            Edit profile
          </button>
        </div>
      )}
    </section>
  );
}

export function ProfileEditSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="border-t border-brand-100 pt-6">
        <h2 className="text-lg font-bold text-brand-900">Manage your profile</h2>
        <p className="mt-1 text-sm text-gray-500">Update your details below</p>
      </div>
      {children}
    </div>
  );
}

interface ProfileEditActionsProps {
  onCancel: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
}

export function ProfileEditActions({
  onCancel,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = "Save profile",
}: ProfileEditActionsProps) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} className="btn-outline flex-1 py-3">
        Cancel
      </button>
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saveDisabled}
          className="btn-primary flex-1 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : saveLabel}
        </button>
      )}
    </div>
  );
}
