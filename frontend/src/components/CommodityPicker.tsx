"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CommodityCategory } from "@/lib/types";
import {
  filterCategoriesForRole,
  farmerCategoryFilter,
} from "@/lib/types";
import { getCommodityEmoji } from "@/lib/commodityEmoji";
import { Icon } from "@/components/icons";

export type CommodityPickerMode = "multi" | "select-add";

export interface CommodityPickerProps {
  categories: CommodityCategory[];
  roleId: number;
  mode: CommodityPickerMode;
  /** Selected commodity IDs (multi mode). */
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  /** IDs that cannot be selected (e.g. already on farm). */
  excludeIds?: Set<number>;
  /** Called when user picks from dropdown in select-add mode. */
  onSelectAdd?: (commodityId: number) => void;
  loading?: boolean;
  idPrefix?: string;
  invalid?: boolean;
}

export function CommodityPicker({
  categories,
  roleId,
  mode,
  selectedIds = [],
  onSelectionChange,
  excludeIds,
  onSelectAdd,
  loading = false,
  idPrefix = "commodity",
  invalid = false,
}: CommodityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categoryLabel = farmerCategoryFilter(roleId);
  const grouped = useMemo(
    () => filterCategoriesForRole(categories, roleId),
    [categories, roleId]
  );

  const allCommodities = useMemo(
    () =>
      grouped.flatMap((cat) =>
        (cat.commodities || []).map((c) => ({
          ...c,
          category: c.category ?? { id: cat.id, name: cat.name },
        }))
      ),
    [grouped]
  );

  const query = search.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    const excluded = excludeIds ?? new Set<number>();
    const selected = new Set(selectedIds);

    return grouped
      .map((cat) => ({
        ...cat,
        commodities: (cat.commodities || []).filter((c) => {
          if (excluded.has(c.id) || selected.has(c.id)) return false;
          if (!query) return true;
          return (
            c.name.toLowerCase().includes(query) ||
            cat.name.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((cat) => cat.commodities.length > 0);
  }, [grouped, query, excludeIds, selectedIds]);

  const selectedCommodities = useMemo(
    () => allCommodities.filter((c) => selectedIds.includes(c.id)),
    [allCommodities, selectedIds]
  );

  const availableCount = useMemo(
    () => filteredGroups.reduce((sum, cat) => sum + cat.commodities.length, 0),
    [filteredGroups]
  );

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

  const addCommodity = (id: number) => {
    if (mode === "select-add") {
      onSelectAdd?.(id);
      closeDropdown();
      return;
    }
    if (!selectedIds.includes(id)) {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  const removeCommodity = (id: number) => {
    onSelectionChange?.(selectedIds.filter((x) => x !== id));
  };

  if (loading || allCommodities.length === 0) {
    return <p className="text-sm text-gray-500">Loading commodities...</p>;
  }

  const searchId = `${idPrefix}-search`;
  const triggerLabel =
    mode === "select-add"
      ? "Add commodity"
      : categoryLabel === "All"
        ? "Select commodities"
        : `Select ${categoryLabel?.toLowerCase()} commodities`;

  const triggerText =
    mode === "multi" && selectedCommodities.length > 0
      ? `${selectedCommodities.length} selected — click to add more`
      : mode === "select-add"
        ? "Search and add a commodity…"
        : "Search and select commodities…";

  return (
    <div
      className={`space-y-4 ${invalid ? "rounded-xl border border-red-500 bg-red-50/30 p-4" : ""}`}
    >
      <div ref={rootRef} className="relative">
        <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium text-brand-900">
          {triggerLabel}
        </label>
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
          <Icon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
          <span
            className={`flex-1 text-sm ${
              mode === "multi" && selectedCommodities.length > 0
                ? "font-medium text-brand-900"
                : "text-gray-500"
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
                placeholder="Search by name or category…"
                aria-label="Search commodities"
                autoComplete="off"
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {availableCount === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-500">
                  {query ? "No matching commodities found" : "All commodities selected"}
                </li>
              ) : (
                filteredGroups.map((cat) => (
                  <li key={cat.id}>
                    <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {cat.name}
                    </p>
                    <ul>
                      {cat.commodities.map((c) => (
                        <li key={c.id} role="option">
                          <button
                            type="button"
                            onClick={() => addCommodity(c.id)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-brand-50"
                          >
                            <span
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-base leading-none"
                              aria-hidden
                            >
                              {getCommodityEmoji(c.name)}
                            </span>
                            <span className="font-medium">{c.name}</span>
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

      {mode === "multi" && selectedCommodities.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-brand-800">
            Selected ({selectedCommodities.length})
          </p>
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selectedCommodities.map((c) => (
              <span
                key={c.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900"
              >
                <span aria-hidden>{getCommodityEmoji(c.name)}</span>
                <span className="whitespace-nowrap">{c.name}</span>
                <span className="text-xs font-normal text-gray-500 whitespace-nowrap">
                  ({c.category?.name ?? "—"})
                </span>
                <button
                  type="button"
                  onClick={() => removeCommodity(c.id)}
                  className="ml-0.5 shrink-0 text-red-500 hover:text-red-700"
                  aria-label={`Remove ${c.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {mode === "multi" && selectedCommodities.length === 0 && (
        <p className="text-sm text-gray-500">
          Select at least one{" "}
          {categoryLabel === "All" ? "commodity" : `${categoryLabel?.toLowerCase()} commodity`} using
          the search above.
        </p>
      )}
    </div>
  );
}
