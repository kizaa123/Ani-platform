export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s-]/g, '').trim();
}

export const PHONE_VALIDATION_MESSAGE = 'Phone must be exactly 10 digits';
