"use client";

import { HandlerProfile } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { RolePrefixedName } from "@/components/RolePrefixedName";
import { Icon } from "@/components/icons";

interface HandlerSelectProps {
  handlers: HandlerProfile[];
  value: string;
  onChange: (handlerId: string) => void;
  label: string;
  emptyMessage: string;
  variant?: "default" | "compact";
  handlerRoleId?: number;
}

function formatHandlerLocation(handler: HandlerProfile): string {
  return [handler.city, handler.region, handler.country].filter(Boolean).join(", ");
}

export function HandlerSelect({
  handlers,
  value,
  onChange,
  label,
  emptyMessage,
  variant = "default",
  handlerRoleId,
}: HandlerSelectProps) {
  if (handlers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-700">
        {emptyMessage}
      </div>
    );
  }

  const compact = variant === "compact";

  return (
    <div>
      <label className="auth-label mb-2 block">{label}</label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {handlers.map((handler) => {
          const selected = value === handler.id;
          const name = `${handler.firstName} ${handler.lastName}`;
          const location = formatHandlerLocation(handler);
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
              <FarmerAvatar
                src={handler.profilePicture}
                name={name}
                size={compact ? "sm" : "md"}
                cacheBust={
                  handler.updatedAt ? new Date(handler.updatedAt).getTime() : undefined
                }
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                {compact && handlerRoleId ? (
                  <RolePrefixedName
                    user={{
                      roleId: handlerRoleId,
                      firstName: handler.firstName,
                      lastName: handler.lastName,
                    }}
                    className="block max-w-full truncate text-sm font-semibold"
                    nameClassName="text-brand-900"
                  />
                ) : (
                  <p className="truncate font-semibold text-brand-900">{name}</p>
                )}
                {compact ? (
                  location ? (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{location}</p>
                  ) : null
                ) : (
                  <>
                    <p className="truncate text-xs text-gray-500">{handler.email}</p>
                    {handler.phone && (
                      <p className="truncate text-xs text-gray-500">{handler.phone}</p>
                    )}
                    <CountryBadge
                      country={handler.country}
                      region={handler.region}
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
    </div>
  );
}
