import { getDialCodeForCountry } from "./africanCountries";

export function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "").trim();
}

/** Strip a leading international dial code, returning local digits only. */
export function stripDialCode(phone: string, dialCode?: string | null): string {
  let local = normalizePhone(phone);
  if (!local) return "";

  if (local.startsWith("+")) local = local.slice(1);
  else if (local.startsWith("00")) local = local.slice(2);

  if (dialCode) {
    const code = dialCode.replace("+", "");
    if (code && local.startsWith(code)) {
      local = local.slice(code.length);
    }
  }

  return local.replace(/\D/g, "");
}

export function getDialCodeForCountryName(countryName?: string | null): string {
  return getDialCodeForCountry(countryName) ?? "";
}

export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(normalizePhone(value));
}

export const PHONE_VALIDATION_MESSAGE = "Phone must be exactly 10 digits";