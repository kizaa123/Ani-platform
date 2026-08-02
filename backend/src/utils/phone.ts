const COUNTRY_DIAL_CODES: Record<string, string> = {
  DZ: '+213', AO: '+244', BJ: '+229', BW: '+267', BF: '+226', BI: '+257', CV: '+238',
  CM: '+237', CF: '+236', TD: '+235', KM: '+269', CG: '+242', CI: '+225', CD: '+243',
  DJ: '+253', EG: '+20', GQ: '+240', ER: '+291', SZ: '+268', ET: '+251', GA: '+241',
  GM: '+220', GH: '+233', GN: '+224', GW: '+245', KE: '+254', LS: '+266', LR: '+231',
  LY: '+218', MG: '+261', MW: '+265', ML: '+223', MR: '+222', MU: '+230', MA: '+212',
  MZ: '+258', NA: '+264', NE: '+227', NG: '+234', RW: '+250', ST: '+239', SN: '+221',
  SC: '+248', SL: '+232', SO: '+252', ZA: '+27', SS: '+211', SD: '+249', TZ: '+255',
  TG: '+228', TN: '+216', UG: '+256', ZM: '+260', ZW: '+263',
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Algeria: 'DZ', Angola: 'AO', Benin: 'BJ', Botswana: 'BW', 'Burkina Faso': 'BF',
  Burundi: 'BI', 'Cabo Verde': 'CV', Cameroon: 'CM', 'Central African Republic': 'CF',
  Chad: 'TD', Comoros: 'KM', Congo: 'CG', 'Côte d\'Ivoire': 'CI',
  'Democratic Republic of the Congo': 'CD', Djibouti: 'DJ', Egypt: 'EG',
  'Equatorial Guinea': 'GQ', Eritrea: 'ER', Eswatini: 'SZ', Ethiopia: 'ET', Gabon: 'GA',
  Gambia: 'GM', Ghana: 'GH', Guinea: 'GN', 'Guinea-Bissau': 'GW', Kenya: 'KE',
  Lesotho: 'LS', Liberia: 'LR', Libya: 'LY', Madagascar: 'MG', Malawi: 'MW', Mali: 'ML',
  Mauritania: 'MR', Mauritius: 'MU', Morocco: 'MA', Mozambique: 'MZ', Namibia: 'NA',
  Niger: 'NE', Nigeria: 'NG', Rwanda: 'RW', 'São Tomé and Príncipe': 'ST', Senegal: 'SN',
  Seychelles: 'SC', 'Sierra Leone': 'SL', Somalia: 'SO', 'South Africa': 'ZA',
  'South Sudan': 'SS', Sudan: 'SD', Tanzania: 'TZ', Togo: 'TG', Tunisia: 'TN',
  Uganda: 'UG', Zambia: 'ZM', Zimbabwe: 'ZW',
};

const NATIONAL_LENGTH_BY_ISO: Partial<Record<string, number>> = {
  NG: 10,
  EG: 10,
};

const DEFAULT_NATIONAL_LENGTH = 9;
const DEFAULT_COUNTRY = 'Ghana';

export const PHONE_VALIDATION_MESSAGE =
  'Enter a valid mobile number for your country (e.g. 0241234567 or +233241234567)';

export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s-]/g, '').trim();
}

function resolveCountryCode(countryName?: string | null): string | undefined {
  if (!countryName?.trim()) return undefined;
  const exact = COUNTRY_NAME_TO_CODE[countryName.trim()];
  if (exact) return exact;
  const lower = countryName.trim().toLowerCase();
  const match = Object.entries(COUNTRY_NAME_TO_CODE).find(
    ([name]) => name.toLowerCase() === lower
  );
  return match?.[1];
}

export function getDialCodeForCountryName(countryName?: string | null): string {
  const code = resolveCountryCode(countryName);
  return code ? (COUNTRY_DIAL_CODES[code] ?? '') : '';
}

export function getNationalLength(countryName?: string | null): number {
  const code = resolveCountryCode(countryName ?? DEFAULT_COUNTRY);
  if (!code) return DEFAULT_NATIONAL_LENGTH;
  return NATIONAL_LENGTH_BY_ISO[code] ?? DEFAULT_NATIONAL_LENGTH;
}

export function extractNationalDigits(
  value: string,
  countryName?: string | null
): string {
  let digits = typeof normalizePhone(value) === 'string' ? (normalizePhone(value) as string) : '';
  if (!digits) return '';

  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);

  const dialCode = getDialCodeForCountryName(countryName).replace('+', '');
  if (dialCode && digits.startsWith(dialCode)) {
    digits = digits.slice(dialCode.length);
  }

  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidPhoneNumber(value: string, countryName?: string | null): boolean {
  const national = extractNationalDigits(value, countryName ?? DEFAULT_COUNTRY);
  if (!national || !/^\d+$/.test(national)) return false;
  return national.length === getNationalLength(countryName ?? DEFAULT_COUNTRY);
}

export function normalizePhoneForStorage(
  value: string,
  countryName?: string | null
): string {
  const country = countryName?.trim() || DEFAULT_COUNTRY;
  const national = extractNationalDigits(value, country);
  const dialCode = getDialCodeForCountryName(country);
  if (!national || !dialCode) {
    return typeof normalizePhone(value) === 'string' ? (normalizePhone(value) as string) : '';
  }
  return `${dialCode}${national}`;
}
