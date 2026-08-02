"use client";

import Link from "next/link";
import { AgentAssignment, AgentClientOwner, fullName, isResearcher } from "@/lib/types";
import { formatUserLocation } from "@/lib/formatUserLocation";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { EmailText } from "@/components/EmailText";
import { Icon, type IconName } from "@/components/icons";

/** Clickable phone link for handler client contact - logistics backchannel */
export function HandlerPhoneLink({
  phone,
  className,
}: {
  phone?: string | null;
  className?: string;
}) {
  if (!phone) {
    return <span className="text-gray-400">Not provided</span>;
  }
  return (
    <a
      href={`tel:${phone}`}
      className={className ?? "font-semibold text-brand-800 hover:underline"}
    >
      {phone}
    </a>
  );
}

/** Compact identity row - dashboard preview & card headers */
export function HandlerAssignmentIdentity({
  owner,
  subtitle,
  stat,
  avatarSize = "md",
  showPhone = false,
}: {
  owner: AgentClientOwner;
  subtitle?: string;
  stat?: string;
  avatarSize?: "sm" | "md";
  showPhone?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <AvatarWithVerification
        src={owner.profilePicture}
        name={owner.firstName}
        size={avatarSize}
        cacheBust={owner.updatedAt ? new Date(owner.updatedAt).getTime() : undefined}
        verificationStatus={owner.verificationStatus}
        verificationTags={owner.verificationTags}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-brand-900">
          {fullName(owner)}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>
        )}
        {showPhone && (
          <p className="mt-0.5 text-xs">
            <HandlerPhoneLink phone={owner.phone} />
          </p>
        )}
      </div>
      {stat && (
        <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
          {stat}
        </span>
      )}
    </div>
  );
}

function DetailChip({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2.5 py-2 text-xs ${
        highlight ? "border border-brand-100 bg-brand-50/60" : "bg-gray-50"
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-0.5 leading-snug">{children}</div>
    </div>
  );
}

/** Dashboard preview card listing assigned clients/farmers */
export function HandlerAssignmentsPreviewCard({
  href,
  title,
  icon,
  assignments,
  loading,
  emptyMessage,
  getSubtitle,
  getStat,
  clientType,
}: {
  href: string;
  title: string;
  icon: IconName;
  assignments: AgentAssignment[];
  loading: boolean;
  emptyMessage: string;
  getSubtitle: (owner: AgentClientOwner) => string;
  getStat?: (owner: AgentClientOwner) => string | undefined;
  clientType: "farmer" | "buyer";
}) {
  const preview = assignments.slice(0, 3);
  const remaining = assignments.length - preview.length;

  return (
    <Link
      href={href}
      className="group card-elevated card-elevated-hover flex flex-col overflow-hidden rounded-xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-brand-100 bg-brand-50/50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-100 transition-colors group-hover:bg-brand-700 group-hover:text-white">
            <Icon name={icon} className="h-3.5 w-3.5" />
          </span>
          <h3 className="truncate text-sm font-bold text-brand-900 group-hover:text-brand-700">
            {title}
          </h3>
        </div>
        {!loading && (
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-brand-900">
            {assignments.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))
        ) : assignments.length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-500">{emptyMessage}</p>
        ) : (
          preview.map((a) => (
            <HandlerAssignmentIdentity
              key={a.id}
              owner={a.owner}
              subtitle={getSubtitle(a.owner)}
              stat={getStat?.(a.owner)}
              showPhone
            />
          ))
        )}
      </div>

      {!loading && remaining > 0 && (
        <div className="border-t border-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-600">
          +{remaining} more - view all
        </div>
      )}

      {!loading && assignments.length > 0 && remaining === 0 && (
        <div className="border-t border-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-600">
          View all {clientType === "farmer" ? "fellows" : "clients"}
        </div>
      )}
    </Link>
  );
}

/** Compact stat card for dashboard order alerts */
export function HandlerOrderAlertsCard({
  href,
  count,
  loading,
  entityLabel,
}: {
  href: string;
  count: number | null;
  loading: boolean;
  entityLabel: string;
}) {
  const desc =
    count === null
      ? "Loading order alerts..."
      : count === 0
        ? "No unread order notifications"
        : `${count} unread notification${count === 1 ? "" : "s"} for your ${entityLabel}`;

  return (
    <Link
      href={href}
      className="group card-elevated card-elevated-hover flex flex-col overflow-hidden rounded-xl"
    >
      <div className="flex items-start gap-3 p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-700 group-hover:text-white">
          <Icon name="package" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-brand-900 group-hover:text-brand-700">
              Order Notifications
            </h3>
            {!loading && count !== null && count > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">
                {count}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-snug text-gray-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

/** Compact farmer client card for /agents list */
export function HandlerFarmerClientCard({ assignment }: { assignment: AgentAssignment }) {
  const { owner } = assignment;
  const farmName = owner.farmerProfile?.farmName ?? "Farm";
  const location = formatUserLocation(owner);

  return (
    <article className="card-elevated flex flex-col overflow-hidden rounded-xl transition hover:shadow-md">
      <div className="border-b border-brand-50 bg-brand-50/40 px-3 py-2.5">
        <HandlerAssignmentIdentity
          owner={owner}
          subtitle={[farmName, location].filter(Boolean).join(" · ")}
          stat={owner.farmerProfile?.farmSize ?? undefined}
          avatarSize="md"
        />
        <CountryBadge country={owner.country} region={owner.region} city={owner.city} className="mt-2" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="grid grid-cols-2 gap-2">
          <DetailChip label="Phone" highlight>
            <HandlerPhoneLink phone={owner.phone} />
          </DetailChip>
          <DetailChip label="Email">
            <EmailText email={owner.email} className="text-gray-800" />
          </DetailChip>
          {owner.farmerProfile?.farmSize && (
            <DetailChip label="Farm size">
              <span className="font-medium text-brand-900">{owner.farmerProfile.farmSize}</span>
            </DetailChip>
          )}
        </div>

        {(owner.commodities?.length ?? 0) > 0 && (
          <div className="mt-2.5">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              Commodities
            </p>
            <div className="flex flex-wrap gap-1">
              {owner.commodities!.slice(0, 4).map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800"
                >
                  {c.name}
                </span>
              ))}
              {(owner.commodities!.length ?? 0) > 4 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                  +{owner.commodities!.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto pt-3">
          <Link
            href={`/agents/farm/${owner.id}/orders`}
            className="btn-outline block py-2 text-center text-[11px]"
          >
            Client orders
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Compact buyer client card for /agents list */
function clientOrganization(owner: AgentClientOwner): string | undefined {
  if (isResearcher(owner.roleId ?? 0)) {
    return owner.researcherProfile?.institution?.trim() || undefined;
  }
  return owner.buyerProfile?.company?.trim() || undefined;
}

export function HandlerBuyerClientCard({ assignment }: { assignment: AgentAssignment }) {
  const { owner } = assignment;
  const organization = clientOrganization(owner);
  const location = formatUserLocation(owner);
  const subtitle = [organization, location].filter(Boolean).join(" · ");

  return (
    <article className="card-elevated flex flex-col overflow-hidden rounded-xl transition hover:shadow-md">
      <div className="border-b border-brand-50 bg-brand-50/40 px-3 py-2.5">
        <HandlerAssignmentIdentity
          owner={owner}
          subtitle={subtitle || undefined}
          avatarSize="md"
        />
        <CountryBadge country={owner.country} region={owner.region} city={owner.city} className="mt-2" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="grid grid-cols-2 gap-2">
          <DetailChip label="Phone" highlight>
            <HandlerPhoneLink phone={owner.phone} />
          </DetailChip>
          <DetailChip label="Email">
            <EmailText email={owner.email} className="text-gray-800" />
          </DetailChip>
        </div>

        <div className="mt-auto pt-3">
          <Link
            href={`/agents/buyer/${owner.id}/orders`}
            className="btn-outline block py-2 text-center text-[11px]"
          >
            Orders placed
          </Link>
        </div>
      </div>
    </article>
  );
}
