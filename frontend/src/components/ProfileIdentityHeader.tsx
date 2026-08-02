"use client";

import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { RolePrefixedName, getRoleNamePrefix } from "@/components/RolePrefixedName";
import { QualificationBadges } from "@/components/QualificationBadges";
import { EmailText } from "@/components/EmailText";
import {
  isFarmer,
  isHandler,
  isBuyerHandler,
  isBuyer,
  isResearcher,
  isStudent,
  ROLES,
  hasAssignedHandlerRole,
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
        <AvatarWithVerification
          src={user.profilePicture}
          name={user.firstName}
          size={144}
          cacheBust={cacheBust}
          verificationStatus={user.verificationStatus}
          verificationTags={user.verificationTags}
          tagPlacement="none"
        />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold">
            <RolePrefixedName
              user={user}
              verificationTags={user.verificationTags}
              prefixClassName="text-brand-600 font-bold"
              nameClassName="text-brand-900 font-bold"
              tagSize="md"
            />
          </h2>
          {!getRoleNamePrefix(user.roleId) && (
            <p className="mt-0.5 text-gray-500">{user.role}</p>
          )}
          <CountryBadge
            country={user.country}
            region={user.region}
            className="mt-2 justify-center sm:justify-start"
          />
          {isHandler(user.roleId) && (
            <p className="mt-2 text-sm text-brand-700">
              {isBuyerHandler(user.roleId)
                ? "Client liaison - full visibility into your clients"
                : "Fellow liaison - manage your assigned fellows"}
            </p>
          )}
          {hasAssignedHandlerRole(user.roleId) && user.assignedHandler && (
            <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
              <AvatarWithVerification
                src={user.assignedHandler.profilePicture}
                name={user.assignedHandler.firstName}
                size={52}
                cacheBust={
                  user.assignedHandler.updatedAt
                    ? new Date(user.assignedHandler.updatedAt).getTime()
                    : undefined
                }
                verificationStatus={user.assignedHandler.verificationStatus}
                verificationTags={user.assignedHandler.verificationTags}
                tagPlacement="none"
              />
              <p className="text-sm text-brand-700">
                Handler:{" "}
                <RolePrefixedName
                  user={{
                    roleId: isFarmer(user.roleId) ? ROLES.FARMER_HANDLER : ROLES.BUYER_HANDLER,
                    firstName: user.assignedHandler.firstName,
                    lastName: user.assignedHandler.lastName,
                    verificationStatus: user.assignedHandler.verificationStatus,
                  }}
                  verificationTags={user.assignedHandler.verificationTags}
                  nameClassName="text-brand-700"
                  prefixClassName="text-brand-600"
                />
              </p>
            </div>
          )}
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

export function formatProfileLocation(
  country?: string,
  region?: string,
  city?: string,
  address?: string
): string | null {
  const parts = [country?.trim(), region?.trim(), city?.trim(), address?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function ProfileInfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-500">{label}</h2>
      <div className="mt-1 text-brand-900">{children}</div>
    </div>
  );
}

export interface ProfileInfoSectionProps {
  user: UserProfile;
  /** Fellow commodities for view mode */
  commodities?: { id: string; name: string }[];
  experienceYears?: number;
  className?: string;
}

export function ProfileInfoSection({
  user,
  commodities,
  experienceYears,
  className = "",
}: ProfileInfoSectionProps) {
  const location = formatProfileLocation(user.country, user.region, user.city, user.address);
  const resolvedExperienceYears = experienceYears ?? user.farmerProfile?.experienceYears;

  return (
    <section
      className={`space-y-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm ${className}`}
    >
      <ProfileInfoField label="Name">
        <RolePrefixedName
          user={user}
          hideVerificationTags
          nameClassName="text-brand-900 font-medium"
          prefixClassName="text-brand-600 font-medium"
        />
      </ProfileInfoField>

      {user.email && (
        <ProfileInfoField label="Email">
          <EmailText email={user.email} />
        </ProfileInfoField>
      )}

      {user.phone && (
        <ProfileInfoField label="Phone">
          <span>{user.phone}</span>
        </ProfileInfoField>
      )}

      {location && (
        <ProfileInfoField label="Location">
          <span>{location}</span>
        </ProfileInfoField>
      )}

      {isFarmer(user.roleId) && (
        <>
          {user.farmerProfile?.farmName && (
            <ProfileInfoField label="Farm name">
              <span>{user.farmerProfile.farmName}</span>
            </ProfileInfoField>
          )}
          {resolvedExperienceYears != null && resolvedExperienceYears > 0 && (
            <ProfileInfoField label="Experience">
              <span>
                {resolvedExperienceYears} year{resolvedExperienceYears === 1 ? "" : "s"}
              </span>
            </ProfileInfoField>
          )}
          <ProfileInfoField label="Commodities">
            {commodities?.length ? (
              <div className="flex flex-wrap gap-2">
                {commodities.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-900"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            ) : (
              <span>No commodities registered yet.</span>
            )}
          </ProfileInfoField>
        </>
      )}

      {isBuyer(user.roleId) && (
        <>
          {user.buyerProfile?.company && (
            <ProfileInfoField label="Company">
              <span>{user.buyerProfile.company}</span>
            </ProfileInfoField>
          )}
          {user.buyerProfile?.industry && (
            <ProfileInfoField label="Industry">
              <span>{user.buyerProfile.industry}</span>
            </ProfileInfoField>
          )}
        </>
      )}

      {isResearcher(user.roleId) && (
        <>
          <ProfileInfoField label="Institution">
            <span>{user.researcherProfile?.institution?.trim() || "Not specified."}</span>
          </ProfileInfoField>
          <ProfileInfoField label="Area of expertise">
            <span>{user.researcherProfile?.expertise?.trim() || "Not specified."}</span>
          </ProfileInfoField>
          <ProfileInfoField label="Qualifications">
            {user.researcherProfile?.qualifications?.length ? (
              <QualificationBadges
                qualifications={user.researcherProfile.qualifications}
                className="mt-0.5"
                size="md"
              />
            ) : (
              <span>No qualifications added yet.</span>
            )}
          </ProfileInfoField>
          <ProfileInfoField label="Bio">
            <p className="whitespace-pre-wrap">
              {user.researcherProfile?.bio?.trim() || "No bio added yet."}
            </p>
          </ProfileInfoField>
        </>
      )}

      {isHandler(user.roleId) && user.agentProfile?.agentType && (
        <ProfileInfoField label="Handler type">
          <span>{user.agentProfile.agentType}</span>
        </ProfileInfoField>
      )}

      {!isFarmer(user.roleId) &&
        !isBuyer(user.roleId) &&
        !isResearcher(user.roleId) &&
        !isHandler(user.roleId) &&
        !isStudent(user.roleId) && (
          <ProfileInfoField label="Role">
            <span>{user.role}</span>
          </ProfileInfoField>
        )}
    </section>
  );
}
