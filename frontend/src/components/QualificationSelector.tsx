"use client";

import { RESEARCHER_QUALIFICATION_GROUPS } from "@/lib/qualifications";

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
  const selected = new Set(value);

  const toggle = (qualification: string) => {
    if (selected.has(qualification)) {
      onChange(value.filter((item) => item !== qualification));
      return;
    }
    onChange([...value, qualification]);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((qualification) => (
            <button
              key={qualification}
              type="button"
              onClick={() => toggle(qualification)}
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 transition hover:border-brand-300 hover:bg-brand-100"
              aria-label={`Remove ${qualification}`}
            >
              {qualification}
              <span aria-hidden="true" className="text-brand-500">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      <select
        id={`${idPrefix}-select`}
        value=""
        onChange={(e) => {
          const next = e.target.value;
          if (next) toggle(next);
        }}
        className="auth-input"
        aria-label="Add qualification"
      >
        <option value="">Add a qualification (optional)</option>
        {RESEARCHER_QUALIFICATION_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option} value={option} disabled={selected.has(option)}>
                {option}
                {selected.has(option) ? " (selected)" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="auth-hint">Select all that apply. You can add multiple qualifications.</p>
    </div>
  );
}
