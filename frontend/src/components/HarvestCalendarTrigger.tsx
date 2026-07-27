"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { HarvestCalendarModal } from "@/components/HarvestCalendarModal";

interface HarvestCalendarTriggerProps {
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
  harvestLabel?: string | null;
  commodityName?: string | null;
  productTitle?: string;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
  /** When true, always show the trigger even without harvest dates. */
  alwaysShow?: boolean;
}

export function HarvestCalendarTrigger({
  harvestStartDate,
  harvestEndDate,
  harvestLabel,
  commodityName,
  productTitle,
  className = "inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs text-brand-700 hover:bg-brand-50",
  iconClassName = "h-3.5 w-3.5 shrink-0",
  showLabel = true,
  alwaysShow = false,
}: HarvestCalendarTriggerProps) {
  const [open, setOpen] = useState(false);
  const hasHarvestInfo =
    Boolean(harvestStartDate || harvestEndDate || harvestLabel) || alwaysShow;

  if (!hasHarvestInfo) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={className}
        aria-label="View harvest calendar"
      >
        <Icon name="calendar" className={iconClassName} />
        {showLabel && harvestLabel ? (
          <span className="line-clamp-1 text-left">{harvestLabel}</span>
        ) : null}
      </button>

      <HarvestCalendarModal
        open={open}
        onClose={() => setOpen(false)}
        harvestStartDate={harvestStartDate}
        harvestEndDate={harvestEndDate}
        harvestLabel={harvestLabel}
        commodityName={commodityName}
        productTitle={productTitle}
      />
    </>
  );
}
