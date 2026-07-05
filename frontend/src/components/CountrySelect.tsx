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

}



export function CountrySelect({ value, onChange, required, className = "" }: CountrySelectProps) {

  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const selected = getCountryByName(value);



  useEffect(() => {

    const close = (e: MouseEvent) => {

      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {

        setOpen(false);

      }

    };

    document.addEventListener("mousedown", close);

    return () => document.removeEventListener("mousedown", close);

  }, []);



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

        onClick={() => setOpen((o) => !o)}

        className="flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3 text-left shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"

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

        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-brand-100 bg-white py-1 shadow-lg">

          {AFRICAN_COUNTRIES.map((c) => (

            <li key={c.code}>

              <button

                type="button"

                onClick={() => {

                  onChange(c.name);

                  setOpen(false);

                }}

                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-50 ${

                  value === c.name ? "bg-brand-100 font-semibold text-brand-900" : "text-gray-800"

                }`}

              >

                <CountryFlag code={c.code} countryName={c.name} size={24} />

                {c.name}

              </button>

            </li>

          ))}

        </ul>

      )}

    </div>

  );

}



interface CountryBadgeProps {

  country?: string | null;

  region?: string | null;

  className?: string;

}



export function CountryBadge({ country, region, className = "" }: CountryBadgeProps) {

  if (!country && !region) return null;



  return (

    <p className={`flex flex-wrap items-center gap-1.5 text-xs text-gray-500 ${className}`}>

      {country && (

        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 font-medium text-brand-900">

          <CountryFlag countryName={country} size={18} />

          {country}

        </span>

      )}

      {region && <span>{region}</span>}

    </p>

  );

}


