export function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "").trim();
}

export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(normalizePhone(value));
}

export const PHONE_VALIDATION_MESSAGE = "Phone must be exactly 10 digits";
