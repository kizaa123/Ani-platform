"use client";

import { useMemo, useState } from "react";
import { HandlerProfile } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { EmailText } from "@/components/EmailText";
import { CountryBadge } from "@/components/CountrySelect";
import { RolePrefixedName } from "@/components/RolePrefixedName";
import { InlineNameWithVerificationTags } from "@/components/VerificationTagBadge";
import { Icon } from "@/components/icons";
import { formatUserLocation } from "@/lib/formatUserLocation";
import { formatPhoneDisplay } from "@/lib/phone";

interface HandlerSelectProps {
  handlers: HandlerProfile[];
  value: string;
  onChange: (handlerId: string) => void;
  label: string;
  emptyMessage: string;
  variant?: "default" | "compact";
  handlerRoleId?: number;
  invalid?: boolean;
}

function handlerMatchesQuery(handler: HandlerProfile, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    handler.firstName,
    handler.lastName,
    `${handler.firstName} ${handler.lastName}`,
    handler.country,
    handler.region,
    handler.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function HandlerSelect({
  handlers,
  value,
  onChange,
  label,
  emptyMessage,
  variant = "default",
  handlerRoleId,
  invalid = false,
}: HandlerSelectProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => handlers.filter((handler) => handlerMatchesQuery(handler, search)),
    [handlers, search]
  );

  if (handlers.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed p-4 text-sm ${
          invalid
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-brand-200 bg-brand-50/50 text-brand-700"
        }`}
      >
        {emptyMessage}
      </div>
    );
  }

  const compact = variant === "compact";

  return (
    <div className={invalid ? "rounded-xl ring-2 ring-red-200" : undefined}>
      <label className="auth-label mb-2 block">{label}</label>

      <div className="relative mb-3">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, country, region, or district"
          className="auth-input w-full pl-9"
          aria-label={`Search ${label}`}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4 text-sm text-brand-700">
          No liaison officers match “{search.trim()}”. Try another name, country, region, or
          district.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((handler) => {
            const selected = value === handler.id;
            const name = `${handler.firstName} ${handler.lastName}`;
            const location = formatUserLocation(handler);
            return (
              <button
                key={handler.id}
                type="button"
                onClick={() => onChange(handler.id)}
                className={`flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border text-left transition-all duration-150 focus:outline-none ${
                  compact ? "p-3" : "items-start p-4"
                } ${
                  selected
                    ? compact
                      ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-400"
                      : "border-brand-600 bg-brand-100 ring-2 ring-brand-500"
                    : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
                }`}
              >
                <AvatarWithVerification
                  src={handler.profilePicture}
                  name={name}
                  size={compact ? "sm" : "md"}
                  cacheBust={
                    handler.updatedAt ? new Date(handler.updatedAt).getTime() : undefined
                  }
                  verificationStatus={handler.verificationStatus}
                  verificationTags={handler.verificationTags}
                  tagPlacement="none"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  {compact && handlerRoleId ? (
                    <RolePrefixedName
                      user={{
                        roleId: handlerRoleId,
                        firstName: handler.firstName,
                        lastName: handler.lastName,
                        verificationStatus: handler.verificationStatus,
                      }}
                      verificationTags={handler.verificationTags}
                      className="max-w-full text-sm font-semibold"
                      nameClassName="text-brand-900"
                    />
                  ) : (
                    <InlineNameWithVerificationTags
                      name={name}
                      verificationTags={handler.verificationTags}
                      verificationStatus={handler.verificationStatus}
                      nameClassName="line-clamp-2 break-words text-sm font-semibold leading-snug text-brand-900"
                      className="max-w-full"
                    />
                  )}
                  {compact ? (
                    location ? (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{location}</p>
                    ) : null
                  ) : (
                    <>
                      <EmailText email={handler.email} truncate className="text-gray-500" as="p" />
                      {handler.phone && (
                        <p className="truncate text-xs text-gray-500">
                          {formatPhoneDisplay(handler.phone, handler.country)}
                        </p>
                      )}
                      <CountryBadge
                        country={handler.country}
                        region={handler.region}
                        city={handler.city}
                        className="mt-1"
                      />
                    </>
                  )}
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    compact ? "" : "mt-1"
                  } ${
                    selected
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {selected && <Icon name="check" className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
