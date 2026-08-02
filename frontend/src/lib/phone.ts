import { getCountryByName, getDialCodeForCountry } from "./africanCountries";

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

/** Expected national number length (without country code or leading 0). */
const NATIONAL_LENGTH_BY_ISO: Partial<Record<string, number>> = {
  NG: 10,
  EG: 10,
};

const DEFAULT_NATIONAL_LENGTH = 9;

export function getNationalLength(countryName?: string | null): number {
  const country = getCountryByName(countryName);
  if (!country) return DEFAULT_NATIONAL_LENGTH;
  return NATIONAL_LENGTH_BY_ISO[country.code] ?? DEFAULT_NATIONAL_LENGTH;
}

/** Extract national digits: strips dial code and leading 0. */
export function extractNationalDigits(
  value: string,
  countryName?: string | null
): string {
  let digits = stripDialCode(value, getDialCodeForCountryName(countryName) || undefined);
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidPhone(value: string, countryName?: string | null): boolean {
  const national = extractNationalDigits(value, countryName);
  if (!national || !/^\d+$/.test(national)) return false;
  return national.length === getNationalLength(countryName);
}

export const PHONE_VALIDATION_MESSAGE =
  "Enter a valid mobile number for your country (e.g. 0241234567 or +233241234567)";

/** Store as E.164 (+233241234567). */
export function normalizePhoneForStorage(
  value: string,
  countryName?: string | null
): string {
  const national = extractNationalDigits(value, countryName);
  const dialCode = getDialCodeForCountryName(countryName);
  if (!national || !dialCode) return normalizePhone(value);
  return `${dialCode}${national}`;
}

/** Format for display with country dial code context. */
export function formatPhoneDisplay(
  value: string,
  countryName?: string | null
): string {
  if (!value?.trim()) return "";

  const dialCode =
    getDialCodeForCountryName(countryName) ||
    (value.trim().startsWith("+") ? value.trim().match(/^\+\d{1,3}/)?.[0] : "");

  const national = extractNationalDigits(value, countryName);
  if (!national) return value.trim();

  const grouped = national.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  return dialCode ? `${dialCode} ${grouped}` : grouped;
}

/** Convert stored phone to form input (national digits for split UI). */
export function phoneToFormValue(
  storedPhone: string,
  countryName?: string | null
): string {
  return extractNationalDigits(storedPhone, countryName);
}

/** tel: href target in E.164. */
export function phoneToTelHref(
  value: string,
  countryName?: string | null
): string {
  const stored = normalizePhoneForStorage(value, countryName);
  return stored.startsWith("+") ? stored : value;
}

/** Parse pasted or typed input for split dial-code fields. */
export function parsePhoneInput(
  raw: string,
  countryName?: string | null
): string {
  const maxLen = getNationalLength(countryName);
  return extractNationalDigits(raw, countryName).slice(0, maxLen);
}

export function onCountryChangePhone(
  phone: string,
  previousCountry?: string | null,
  nextCountry?: string | null
): string {
  const previousDial = previousCountry
    ? getDialCodeForCountryName(previousCountry)
    : undefined;
  const national = stripDialCode(phone, previousDial);
  const cleaned = national.replace(/\D/g, "");
  const withoutLeadingZero = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
  return withoutLeadingZero.slice(0, getNationalLength(nextCountry));
}
