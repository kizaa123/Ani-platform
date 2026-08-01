"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  RESEARCHER_QUALIFICATION_GROUPS,
  RESEARCHER_QUALIFICATIONS,
  isCatalogQualification,
} from "@/lib/qualifications";

interface QualificationSelectorProps {
  value: string[];
  onChange: (qualifications: string[]) => void;
  idPrefix?: string;
}

export function QualificationSelector({
  value,
  onChange,
  idPrefix = "qualification",
}: QualificationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [inputError, setInputError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => new Set(value.map((item) => item.toLowerCase())), [value]);

  const query = search.trim().toLowerCase();
  const filteredGroups = useMemo(
    () =>
      RESEARCHER_QUALIFICATION_GROUPS.map((group) => ({
        ...group,
        options: group.options.filter((option) => {
          if (selected.has(option.toLowerCase())) return false;
          if (!query) return true;
          return option.toLowerCase().includes(query);
        }),
      })).filter((group) => group.options.length > 0),
    [query, selected]
  );

  const availableCount = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.options.length, 0),
    [filteredGroups]
  );

  const trimmedCustom = customInput.trim();
  const trimmedSearch = search.trim();
  const canAddFromSearch =
    trimmedSearch.length >= 2 &&
    !selected.has(trimmedSearch.toLowerCase()) &&
    !isCatalogQualification(trimmedSearch);

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

  const addQualification = (qualification: string, closeAfterAdd = false) => {
    const trimmed = qualification.trim();
    if (trimmed.length < 2) {
      setInputError("Qualification must be at least 2 characters");
      return false;
    }
    if (trimmed.length > 100) {
      setInputError("Qualification must be 100 characters or fewer");
      return false;
    }
    const key = trimmed.toLowerCase();
    if (selected.has(key)) {
      setInputError("This qualification is already added");
      return false;
    }
    const catalogMatch = RESEARCHER_QUALIFICATIONS.find(
      (item) => item.toLowerCase() === key
    );
    setInputError("");
    onChange([...value, catalogMatch ?? trimmed]);
    if (closeAfterAdd) {
      closeDropdown();
    }
    return true;
  };

  const addCustomQualification = () => {
    if (addQualification(trimmedCustom)) {
      setCustomInput("");
    }
  };

  const addFromSearch = () => {
    if (addQualification(trimmedSearch, true)) {
      setCustomInput("");
    }
  };

  const removeQualification = (qualification: string) => {
    onChange(value.filter((item) => item !== qualification));
  };

  const searchId = `${idPrefix}-search`;
  const customInputId = `${idPrefix}-custom`;
  const triggerText =
    value.length > 0
      ? `${value.length} selected — click to add more`
      : "Search and add a qualification…";

  return (
    <div className="space-y-3">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => (open ? closeDropdown() : openDropdown())}
          className="flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3 text-left shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <Icon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
          <span
            className={`flex-1 text-sm ${
              value.length > 0 ? "font-medium text-brand-900" : "text-gray-500"
            }`}
          >
            {triggerText}
          </span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-brand-100 bg-white shadow-lg">
            <div className="border-b border-brand-100 p-2">
              <input
                ref={searchInputRef}
                id={searchId}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAddFromSearch) {
                    e.preventDefault();
                    addFromSearch();
                  }
                }}
                placeholder="Search qualifications…"
                aria-label="Search qualifications"
                autoComplete="off"
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {canAddFromSearch && (
                <li role="option">
                  <button
                    type="button"
                    onClick={addFromSearch}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-brand-800 hover:bg-brand-50"
                  >
                    Add custom: &ldquo;{trimmedSearch}&rdquo;
                  </button>
                </li>
              )}
              {availableCount === 0 && !canAddFromSearch ? (
                <li className="px-4 py-3 text-sm text-gray-500">
                  {query ? "No matching qualifications found" : "All qualifications selected"}
                </li>
              ) : (
                filteredGroups.map((group) => (
                  <li key={group.label}>
                    <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {group.label}
                    </p>
                    <ul>
                      {group.options.map((option) => (
                        <li key={option} role="option">
                          <button
                            type="button"
                            onClick={() => addQualification(option, true)}
                            className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-brand-50"
                          >
                            {option}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      <div>
        <label htmlFor={customInputId} className="mb-1.5 block text-sm font-medium text-brand-900">
          Or type a custom qualification
        </label>
        <div className="flex gap-2">
          <input
            id={customInputId}
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              setInputError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomQualification();
              }
            }}
            placeholder="e.g. Certified Agronomist, Fulbright Scholar…"
            maxLength={100}
            className="min-w-0 flex-1 rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="button"
            onClick={addCustomQualification}
            disabled={!trimmedCustom}
            className="shrink-0 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {inputError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {inputError}
          </p>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((qualification) => (
            <span
              key={qualification}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                isCatalogQualification(qualification)
                  ? "border-brand-200 bg-brand-50 text-brand-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {qualification}
              <button
                type="button"
                onClick={() => removeQualification(qualification)}
                className="text-brand-500 transition hover:text-brand-700"
                aria-label={`Remove ${qualification}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="auth-hint">
        Select from the list or type your own. You can add multiple qualifications.
      </p>
    </div>
  );
}
