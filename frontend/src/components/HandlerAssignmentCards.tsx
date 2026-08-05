"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentAssignment, AgentClientOwner, AppNotification, isResearcher, ROLES } from "@/lib/types";
import { formatUserLocation } from "@/lib/formatUserLocation";
import { assetUrl, assetUrlFallback } from "@/lib/assetUrl";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { RolePrefixedName } from "@/components/RolePrefixedName";
import { CountryBadge } from "@/components/CountrySelect";
import { EmailText } from "@/components/EmailText";
import { Icon, type IconName } from "@/components/icons";

import { formatDate } from "@/lib/format";
import { formatPhoneDisplay, phoneToTelHref } from "@/lib/phone";

/** Clickable phone link for handler client contact - logistics backchannel */
export function HandlerPhoneLink({
  phone,
  country,
  className,
}: {
  phone?: string | null;
  country?: string | null;
  className?: string;
}) {
  if (!phone) {
    return <span className="text-gray-400">Not provided</span>;
  }
  const display = formatPhoneDisplay(phone, country);
  const tel = phoneToTelHref(phone, country);
  return (
    <a
      href={`tel:${tel}`}
      className={className ?? "font-semibold text-brand-800 hover:underline"}
    >
      {display}
    </a>
  );
}

function renderSubtitleLines(subtitle: string | string[]) {
  const lines = (Array.isArray(subtitle) ? subtitle : [subtitle]).filter(Boolean);
  if (lines.length === 0) return null;

  return lines.map((line, i) => (
    <p key={i} className="mt-0.5 truncate text-xs text-gray-500">
      {line}
    </p>
  ));
}

/** Compact identity row - dashboard preview & card headers */
export function HandlerAssignmentIdentity({
  owner,
  subtitle,
  stat,
  avatarSize = "md",
  showPhone = false,
  compact = false,
}: {
  owner: AgentClientOwner;
  subtitle?: string | string[];
  stat?: string;
  avatarSize?: "sm" | "md" | number;
  showPhone?: boolean;
  compact?: boolean;
}) {
  const resolvedAvatarSize = compact ? 48 : avatarSize;
  const gapClass = compact ? "gap-2" : "gap-2.5";
  const nameClass = compact
    ? "line-clamp-1 break-words text-xs font-semibold leading-snug text-brand-900"
    : "line-clamp-2 break-words text-sm font-semibold leading-snug text-brand-900";

  return (
    <div className={`flex min-w-0 items-start ${gapClass}`}>
      <AvatarWithVerification
        src={owner.profilePicture}
        name={owner.firstName}
        size={resolvedAvatarSize}
        cacheBust={owner.updatedAt ? new Date(owner.updatedAt).getTime() : undefined}
        verificationStatus={owner.verificationStatus}
        verificationTags={owner.verificationTags}
        tagPlacement="none"
      />
      <div className="min-w-0 flex-1">
        <RolePrefixedName
          user={{
            roleId: owner.roleId ?? (owner.isFarmer ? ROLES.CROP_FARMER : ROLES.BUYER),
            firstName: owner.firstName,
            lastName: owner.lastName,
            verificationStatus: owner.verificationStatus,
          }}
          verificationTags={owner.verificationTags}
          nameClassName={nameClass}
          className="max-w-full"
        />
        {subtitle && renderSubtitleLines(subtitle)}
        {showPhone && !compact && (
          <p className="mt-0.5 text-xs">
            <HandlerPhoneLink phone={owner.phone} country={owner.country} />
          </p>
        )}
      </div>
      {stat && (
        <span
          className={`shrink-0 rounded-md bg-brand-50 font-semibold text-brand-800 ${
            compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
          }`}
        >
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
  href?: string;
  title: string;
  icon: IconName;
  assignments: AgentAssignment[];
  loading: boolean;
  emptyMessage: string;
  getSubtitle: (owner: AgentClientOwner) => string | string[];
  getStat?: (owner: AgentClientOwner) => string | undefined;
  clientType: "farmer" | "buyer";
}) {
  const preview = assignments.slice(0, 3);
  const remaining = assignments.length - preview.length;
  const cardClassName =
    "group card-elevated flex flex-col overflow-hidden rounded-xl" +
    (href ? " card-elevated-hover" : "");

  const content = (
    <>
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

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
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
              compact
            />
          ))
        )}
      </div>

      {!loading && href && (
        <div className="border-t border-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-600">
          {remaining > 0
            ? `+${remaining} more - view all`
            : assignments.length > 0
              ? `View all ${clientType === "farmer" ? "fellows" : "clients"}`
              : `View all ${clientType === "farmer" ? "fellows" : "clients"}`}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

function orderAlertProductName(notification: AppNotification) {
  return (
    notification.metadata?.orderName ??
    notification.metadata?.actionLabel ??
    notification.title
  );
}

function orderAlertTotalLabel(notification: AppNotification) {
  if (notification.metadata?.priceLabel) return notification.metadata.priceLabel;
  if (notification.metadata?.price != null) {
    return `GHC ${notification.metadata.price.toFixed(2)}`;
  }
  return null;
}

function OrderAlertThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const primarySrc = assetUrl(imageUrl);
  const fallbackSrc = assetUrlFallback(imageUrl);
  const src =
    primarySrc && failedSrc !== primarySrc
      ? primarySrc
      : fallbackSrc && failedSrc !== fallbackSrc
        ? fallbackSrc
        : null;

  if (!src) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
        <Icon name="package" className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-9 w-9 shrink-0 rounded-lg border border-brand-100 object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

/** Single order notification row - matches assigned client/fellow preview style */
export function HandlerOrderAlertItem({ notification }: { notification: AppNotification }) {
  const productName = orderAlertProductName(notification);
  const totalLabel = orderAlertTotalLabel(notification);
  const quantity = notification.metadata?.quantity;
  const unit = notification.metadata?.unit;
  const imageUrl = notification.metadata?.imageUrl;

  return (
    <div className="flex min-w-0 items-start gap-2">
      <OrderAlertThumbnail imageUrl={imageUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1.5">
          <p className="line-clamp-1 text-xs font-semibold text-brand-900">{productName}</p>
          {!notification.read && (
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
          {quantity != null && unit && (
            <span>
              Qty: {quantity} {unit}
            </span>
          )}
          {totalLabel && <span className="font-semibold text-brand-700">{totalLabel}</span>}
        </div>
      </div>
    </div>
  );
}

/** Full-page order notification row for handler order notifications list */
export function HandlerOrderAlertListItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: () => void;
}) {
  const productName = orderAlertProductName(notification);
  const totalLabel = orderAlertTotalLabel(notification);
  const quantity = notification.metadata?.quantity;
  const unit = notification.metadata?.unit;
  const imageUrl = notification.metadata?.imageUrl;
  const actionLabel = notification.metadata?.actionLabel;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md ${
        notification.read ? "border-brand-100" : "border-amber-200 bg-amber-50/20"
      }`}
    >
      <OrderAlertThumbnail imageUrl={imageUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-brand-900">{notification.title}</p>
          {!notification.read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm font-medium text-brand-800">{productName}</p>
        {notification.body && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{notification.body}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {quantity != null && unit && (
            <span>
              Qty: {quantity} {unit}
            </span>
          )}
          {totalLabel && <span className="font-semibold text-brand-700">{totalLabel}</span>}
          <span>{formatDate(notification.createdAt)}</span>
        </div>
        {actionLabel && (
          <span className="mt-2 inline-flex rounded-lg bg-brand-700 px-2.5 py-1 text-[11px] font-semibold text-white">
            {actionLabel}
          </span>
        )}
      </div>
    </button>
  );
}

/** Dashboard preview card listing unread order notifications */
export function HandlerOrderAlertsCard({
  href,
  notifications,
  loading,
  entityLabel,
}: {
  href?: string;
  notifications: AppNotification[] | null;
  loading: boolean;
  entityLabel: string;
}) {
  const items = notifications ?? [];
  const preview = items.slice(0, 3);
  const remaining = items.length - preview.length;
  const count = items.length;
  const cardClassName =
    "group card-elevated flex flex-col overflow-hidden rounded-xl" +
    (href ? " card-elevated-hover" : "");

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-brand-100 bg-brand-50/50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-100 transition-colors group-hover:bg-brand-700 group-hover:text-white">
            <Icon name="package" className="h-3.5 w-3.5" />
          </span>
          <h3 className="truncate text-sm font-bold text-brand-900 group-hover:text-brand-700">
            Order Notifications
          </h3>
        </div>
        {!loading && count > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">
            {count}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))
        ) : count === 0 ? (
          <p className="py-2 text-center text-xs text-gray-500">
            No unread order notifications for your {entityLabel}
          </p>
        ) : (
          preview.map((n) => <HandlerOrderAlertItem key={n.id} notification={n} />)
        )}
      </div>

      {!loading && href && (
        <div className="border-t border-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-600">
          {remaining > 0 ? `+${remaining} more - view all` : "View all order notifications"}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
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
          subtitle={[location, farmName].filter((s): s is string => Boolean(s))}
          stat={owner.farmerProfile?.farmSize ?? undefined}
          avatarSize="md"
        />
        <CountryBadge country={owner.country} region={owner.region} city={owner.city} className="mt-2" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="grid grid-cols-2 gap-2">
          <DetailChip label="Phone" highlight>
            <HandlerPhoneLink phone={owner.phone} country={owner.country} />
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
  const subtitle = [location, organization].filter((s): s is string => Boolean(s));

  return (
    <article className="card-elevated flex flex-col overflow-hidden rounded-xl transition hover:shadow-md">
      <div className="border-b border-brand-50 bg-brand-50/40 px-3 py-2.5">
        <HandlerAssignmentIdentity
          owner={owner}
          subtitle={subtitle.length > 0 ? subtitle : undefined}
          avatarSize="md"
        />
        <CountryBadge country={owner.country} region={owner.region} city={owner.city} className="mt-2" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="grid grid-cols-2 gap-2">
          <DetailChip label="Phone" highlight>
            <HandlerPhoneLink phone={owner.phone} country={owner.country} />
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
