"use client";

import { getDialCodeForCountryName, parsePhoneInput } from "@/lib/phone";

interface PhoneInputProps {
  id?: string;
  value: string;
  country: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  hint?: string;
  invalid?: boolean;
}

export function PhoneInput({
  id,
  value,
  country,
  onChange,
  required,
  placeholder,
  className,
  inputClassName,
  hint,
  invalid,
}: PhoneInputProps) {
  const dialCode = getDialCodeForCountryName(country);

  return (
    <div className={className}>
      <div
        className={`flex overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-2 ${
          invalid
            ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-100"
            : "border-brand-200 focus-within:border-brand-500 focus-within:ring-brand-200"
        }`}
      >
        <span className="flex shrink-0 items-center border-r border-brand-200 bg-brand-50/80 px-3 text-sm font-semibold text-brand-800">
          {dialCode || "-"}
        </span>
        <input
          id={id}
          required={required}
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(parsePhoneInput(e.target.value, country))}
          placeholder={placeholder ?? "0241234567"}
          aria-invalid={invalid || undefined}
          className={
            inputClassName ??
            "min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0"
          }
        />
      </div>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
