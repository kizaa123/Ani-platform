/** Format harvest window for display (e.g. "15 Jan 2026 – 30 Mar 2026"). */
export function formatHarvestLabel(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string | null {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s && !e) return null;

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (s && e) {
    if (s.toDateString() === e.toDateString()) return fmt(s);
    return `${fmt(s)} – ${fmt(e)}`;
  }
  if (s) return `From ${fmt(s)}`;
  return `Until ${fmt(e!)}`;
}

/** YYYY-MM-DD for HTML date inputs and API responses. */
export function toHarvestDateInput(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseHarvestDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
