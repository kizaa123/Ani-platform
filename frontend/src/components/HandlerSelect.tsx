"use client";

import { HandlerProfile } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";

interface HandlerSelectProps {
  handlers: HandlerProfile[];
  value: string;
  onChange: (handlerId: string) => void;
  label: string;
  emptyMessage: string;
}

export function HandlerSelect({
  handlers,
  value,
  onChange,
  label,
  emptyMessage,
}: HandlerSelectProps) {
  if (handlers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-700">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-900">{label}</label>
      <div className="grid gap-2 sm:grid-cols-2">
        {handlers.map((handler) => {
          const selected = value === handler.id;
          const name = `${handler.firstName} ${handler.lastName}`;
          return (
            <button
              key={handler.id}
              type="button"
              onClick={() => onChange(handler.id)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-brand-600 bg-brand-100 ring-2 ring-brand-500"
                  : "border-gray-200 bg-white hover:border-brand-300"
              }`}
            >
              <FarmerAvatar
                src={handler.profilePicture}
                name={name}
                size="md"
                cacheBust={
                  handler.updatedAt ? new Date(handler.updatedAt).getTime() : undefined
                }
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-900">{name}</p>
                <p className="truncate text-xs text-gray-500">{handler.email}</p>
                {handler.phone && (
                  <p className="truncate text-xs text-gray-500">{handler.phone}</p>
                )}
                <CountryBadge
                  country={handler.country}
                  region={handler.region}
                  className="mt-1"
                />
              </div>
              <span
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  selected
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-gray-300 text-transparent"
                }`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
