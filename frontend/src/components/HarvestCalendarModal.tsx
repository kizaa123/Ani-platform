"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { getCommodityEmoji } from "@/lib/commodityEmoji";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  buildMonthGrid,
  getHarvestCalendarTitle,
  getHarvestRangePosition,
  getInitialCalendarMonth,
  isSameDay,
  parseHarvestDate,
  toDateKey,
} from "@/lib/harvestCalendar";

export interface HarvestCalendarModalProps {
  open: boolean;
  onClose: () => void;
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
  harvestLabel?: string | null;
  commodityName?: string | null;
  productTitle?: string;
}

function rangeCellClasses(position: ReturnType<typeof getHarvestRangePosition>): string {
  if (!position) return "";
  switch (position) {
    case "single":
      return "rounded-lg bg-orange-200 text-orange-950";
    case "start":
      return "rounded-l-lg bg-orange-200 text-orange-950";
    case "end":
      return "rounded-r-lg bg-orange-200 text-orange-950";
    case "middle":
      return "rounded-none bg-orange-200 text-orange-950";
    default:
      return "";
  }
}

export function HarvestCalendarModal({
  open,
  onClose,
  harvestStartDate,
  harvestEndDate,
  harvestLabel,
  commodityName,
  productTitle,
}: HarvestCalendarModalProps) {
  const start = parseHarvestDate(harvestStartDate);
  const end = parseHarvestDate(harvestEndDate);
  const hasPeriod = Boolean(start || end);
  const emoji = getCommodityEmoji(commodityName);
  const title = getHarvestCalendarTitle(productTitle, commodityName);

  const initial = getInitialCalendarMonth(start, end);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useEffect(() => {
    if (!open) return;
    const next = getInitialCalendarMonth(start, end);
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [open, harvestStartDate, harvestEndDate, start, end]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  if (!open) return null;

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
      return;
    }
    setViewMonth((m) => m - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
      return;
    }
    setViewMonth((m) => m + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="harvest-calendar-title"
      >
        <div className="border-b border-brand-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="harvest-calendar-title"
              className="min-w-0 pr-2 text-lg font-bold leading-snug text-brand-900"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-700"
              aria-label="Close calendar"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!hasPeriod && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No delivery dates have been set for this listing yet.
              {harvestLabel ? (
                <p className="mt-1 font-medium">{harvestLabel}</p>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-200 text-brand-800 hover:bg-brand-50"
              aria-label="Previous month"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-brand-900">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-200 text-brand-800 hover:bg-brand-50"
              aria-label="Next month"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-0">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500"
              >
                {label}
              </div>
            ))}

            {grid.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${viewYear}-${viewMonth}-${index}`}
                    className="aspect-square"
                    aria-hidden
                  />
                );
              }

              const rangePosition = hasPeriod
                ? getHarvestRangePosition(day, start, end)
                : null;
              const isStart = start ? isSameDay(day, start) : false;
              const isEnd = end ? isSameDay(day, end) : false;
              const showEmoji = isStart || isEnd;
              const key = toDateKey(day);

              return (
                <div
                  key={key}
                  className={`relative flex aspect-square flex-col items-center justify-center text-sm font-medium ${
                    rangePosition ? rangeCellClasses(rangePosition) : "text-brand-900"
                  }`}
                >
                  {showEmoji && (
                    <span
                      className="mb-0.5 text-xs leading-none"
                      aria-hidden
                    >
                      {emoji}
                    </span>
                  )}
                  <span>{day.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
