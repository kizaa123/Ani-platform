"use client";



import { useEffect, useRef, useState } from "react";

import {

  AFRICAN_COUNTRIES,

  getCountryByName,

  getCountryFlagEmoji,

} from "@/lib/africanCountries";



interface CountryFlagProps {

  code?: string;

  countryName?: string | null;

  size?: number;

  className?: string;

}



export function CountryFlag({ code, countryName, size = 24, className = "" }: CountryFlagProps) {

  const emoji = code

    ? getCountryFlagEmoji(code)

    : getCountryFlagEmoji(countryName);



  return (

    <span

      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}

      style={{ fontSize: Math.max(14, size * 0.85), width: size, height: size }}

      role="img"

      aria-label={countryName ? `${countryName} flag` : "Country flag"}

    >

      {emoji}

    </span>

  );

}



interface CountrySelectProps {

  value: string;

  onChange: (country: string) => void;

  required?: boolean;

  className?: string;

  invalid?: boolean;

}



export function CountrySelect({ value, onChange, required, className = "", invalid = false }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = getCountryByName(value);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? AFRICAN_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
      )
    : AFRICAN_COUNTRIES;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openDropdown = () => {
    setOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
  };

  const handleSelect = (countryName: string) => {
    onChange(countryName);
    closeDropdown();
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm focus:outline-none focus:ring-2 ${
          invalid
            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
            : "border-brand-200 focus:border-brand-500 focus:ring-brand-200"
        }`}
      >
        {selected ? (
          <>
            <CountryFlag code={selected.code} countryName={selected.name} size={28} />
            <span className="flex-1 font-medium text-brand-900">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-500">Select country</span>
        )}
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-brand-100 bg-white shadow-lg">
          <div className="border-b border-brand-100 p-2">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries…"
              aria-label="Search countries"
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500">No countries found</li>
            ) : (
              filtered.map((c) => (
                <li key={c.code} role="option" aria-selected={value === c.name}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.name)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-50 ${
                      value === c.name
                        ? "bg-brand-100 font-semibold text-brand-900"
                        : "text-gray-800"
                    }`}
                  >
                    <CountryFlag code={c.code} countryName={c.name} size={24} />
                    {c.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}



interface CountryBadgeProps {

  country?: string | null;

  region?: string | null;

  city?: string | null;

  className?: string;

  stacked?: boolean;

}



export function CountryBadge({
  country,
  region,
  city,
  className = "",
  stacked = false,
}: CountryBadgeProps) {

  if (!country && !region && !city) return null;



  if (stacked) {

    return (

      <div className={`flex flex-col gap-0.5 ${className}`}>

        {country && (

          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">

            <CountryFlag countryName={country} size={18} />

            <span>{country}</span>

          </span>

        )}

        {region && <span className="text-sm text-gray-600">{region}</span>}

        {city && <span className="text-sm text-gray-600">{city}</span>}

      </div>

    );

  }



  return (

    <p className={`inline-flex max-w-full flex-wrap items-center gap-1.5 text-xs text-gray-500 ${className}`}>

      {country && (

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 font-medium text-brand-900">

          <CountryFlag countryName={country} size={18} />

          {country}

        </span>

      )}

      {region && <span className="shrink-0">{region}</span>}

      {city && <span className="shrink-0">{city}</span>}

    </p>

  );

}


