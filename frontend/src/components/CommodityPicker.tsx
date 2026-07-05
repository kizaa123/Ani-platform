"use client";

import { useMemo, useState } from "react";
import { CommodityCategory } from "@/lib/types";
import {
  filterCategoriesForRole,
  farmerCategoryFilter,
} from "@/lib/types";
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
}: CommodityPickerProps) {
  const [search, setSearch] = useState("");
  const [selectValue, setSelectValue] = useState("");

  const categoryLabel = farmerCategoryFilter(roleId);
  const grouped = useMemo(
    () => filterCategoriesForRole(categories, roleId),
    [categories, roleId]
  );

  const allCommodities = useMemo(
    () => grouped.flatMap((cat) =>
      (cat.commodities || []).map((c) => ({ ...c, category: c.category ?? { id: cat.id, name: cat.name } }))
    ),
    [grouped]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped
      .map((cat) => ({
        ...cat,
        commodities: (cat.commodities || []).filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.commodities.length > 0);
  }, [grouped, search]);

  const selectedCommodities = useMemo(
    () => allCommodities.filter((c) => selectedIds.includes(c.id)),
    [allCommodities, selectedIds]
  );

  const availableForSelect = useMemo(() => {
    const excluded = excludeIds ?? new Set<number>();
    const selected = new Set(selectedIds);
    return filteredGroups.map((cat) => ({
      ...cat,
      commodities: cat.commodities.filter(
        (c) => !excluded.has(c.id) && !selected.has(c.id)
      ),
    })).filter((cat) => cat.commodities.length > 0);
  }, [filteredGroups, excludeIds, selectedIds]);

  const addFromSelect = (value: string) => {
    const id = parseInt(value, 10);
    if (!id) return;
    if (mode === "select-add") {
      onSelectAdd?.(id);
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
    setSelectValue("");
  };

  const removeCommodity = (id: number) => {
    onSelectionChange?.(selectedIds.filter((x) => x !== id));
  };

  if (loading || allCommodities.length === 0) {
    return <p className="text-sm text-gray-500">Loading commodities...</p>;
  }

  const searchId = `${idPrefix}-search`;
  const selectId = `${idPrefix}-select`;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium text-brand-900">
          Search {categoryLabel?.toLowerCase()} commodities
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search by name or category…`}
            className="auth-input w-full pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div>
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-brand-900">
          {mode === "select-add" ? "Add commodity" : "Select commodities"}
        </label>
        <select
          id={selectId}
          value={selectValue}
          onChange={(e) => addFromSelect(e.target.value)}
          className="auth-input w-full"
        >
          <option value="">
            {mode === "select-add" ? "Choose a commodity to add…" : "Choose to add…"}
          </option>
          {availableForSelect.map((cat) => (
            <optgroup key={cat.id} label={cat.name}>
              {cat.commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {availableForSelect.length === 0 && search.trim() && (
          <p className="mt-1 text-xs text-gray-500">No matching commodities found.</p>
        )}
      </div>

      {mode === "multi" && selectedCommodities.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-brand-800">
            Selected ({selectedCommodities.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCommodities.map((c) => (
              <span
                key={c.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900"
              >
                <span className="truncate">{c.name}</span>
                <span className="text-xs font-normal text-gray-500">
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
          Select at least one {categoryLabel?.toLowerCase()} commodity using the dropdown above.
        </p>
      )}
    </div>
  );
}
