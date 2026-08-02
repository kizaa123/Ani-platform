/** African Union member states + ISO codes */
export const AFRICAN_COUNTRIES = [
  { name: "Algeria", code: "DZ" },
  { name: "Angola", code: "AO" },
  { name: "Benin", code: "BJ" },
  { name: "Botswana", code: "BW" },
  { name: "Burkina Faso", code: "BF" },
  { name: "Burundi", code: "BI" },
  { name: "Cabo Verde", code: "CV" },
  { name: "Cameroon", code: "CM" },
  { name: "Central African Republic", code: "CF" },
  { name: "Chad", code: "TD" },
  { name: "Comoros", code: "KM" },
  { name: "Congo", code: "CG" },
  { name: "Côte d'Ivoire", code: "CI" },
  { name: "Democratic Republic of the Congo", code: "CD" },
  { name: "Djibouti", code: "DJ" },
  { name: "Egypt", code: "EG" },
  { name: "Equatorial Guinea", code: "GQ" },
  { name: "Eritrea", code: "ER" },
  { name: "Eswatini", code: "SZ" },
  { name: "Ethiopia", code: "ET" },
  { name: "Gabon", code: "GA" },
  { name: "Gambia", code: "GM" },
  { name: "Ghana", code: "GH" },
  { name: "Guinea", code: "GN" },
  { name: "Guinea-Bissau", code: "GW" },
  { name: "Kenya", code: "KE" },
  { name: "Lesotho", code: "LS" },
  { name: "Liberia", code: "LR" },
  { name: "Libya", code: "LY" },
  { name: "Madagascar", code: "MG" },
  { name: "Malawi", code: "MW" },
  { name: "Mali", code: "ML" },
  { name: "Mauritania", code: "MR" },
  { name: "Mauritius", code: "MU" },
  { name: "Morocco", code: "MA" },
  { name: "Mozambique", code: "MZ" },
  { name: "Namibia", code: "NA" },
  { name: "Niger", code: "NE" },
  { name: "Nigeria", code: "NG" },
  { name: "Rwanda", code: "RW" },
  { name: "São Tomé and Príncipe", code: "ST" },
  { name: "Senegal", code: "SN" },
  { name: "Seychelles", code: "SC" },
  { name: "Sierra Leone", code: "SL" },
  { name: "Somalia", code: "SO" },
  { name: "South Africa", code: "ZA" },
  { name: "South Sudan", code: "SS" },
  { name: "Sudan", code: "SD" },
  { name: "Tanzania", code: "TZ" },
  { name: "Togo", code: "TG" },
  { name: "Tunisia", code: "TN" },
  { name: "Uganda", code: "UG" },
  { name: "Zambia", code: "ZM" },
  { name: "Zimbabwe", code: "ZW" },
] as const;

export type AfricanCountryName = (typeof AFRICAN_COUNTRIES)[number]["name"];

type AfricanCountry = (typeof AFRICAN_COUNTRIES)[number];

const byName = new Map(AFRICAN_COUNTRIES.map((c) => [c.name, c]));
const byCode = new Map<string, AfricanCountry>(AFRICAN_COUNTRIES.map((c) => [c.code, c]));

/** PNG flag URL (works on Windows - emoji flags often do not) */
export function getCountryFlagUrl(code: string, width = 40): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export function getCountryByName(name?: string | null) {
  if (!name) return undefined;
  return (
    byName.get(name as AfricanCountryName) ??
    AFRICAN_COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase())
  );
}

export function getCountryByCode(code?: string | null) {
  if (!code) return undefined;
  return byCode.get(code.toUpperCase());
}

export function getCountryFlagUrlByName(name?: string | null, width = 40): string | null {
  const country = getCountryByName(name);
  return country ? getCountryFlagUrl(country.code, width) : null;
}

/** Regional indicator emoji flag from ISO country code or country name */
export function getCountryFlagEmoji(nameOrCode?: string | null): string {
  if (!nameOrCode) return "🌍";
  const country =
    getCountryByName(nameOrCode) ?? getCountryByCode(nameOrCode);
  if (!country) return "🌍";
  return country.code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** @deprecated Use getCountryFlagEmoji - PNG flags removed in favour of emoji */
export function getCountryFlag(name?: string | null): string {
  return getCountryFlagEmoji(name);
}

export const DEFAULT_COUNTRY: AfricanCountryName = "Ghana";

/** ITU dial codes keyed by ISO 3166-1 alpha-2 */
export const COUNTRY_DIAL_CODES: Record<AfricanCountry["code"], string> = {
  DZ: "+213",
  AO: "+244",
  BJ: "+229",
  BW: "+267",
  BF: "+226",
  BI: "+257",
  CV: "+238",
  CM: "+237",
  CF: "+236",
  TD: "+235",
  KM: "+269",
  CG: "+242",
  CI: "+225",
  CD: "+243",
  DJ: "+253",
  EG: "+20",
  GQ: "+240",
  ER: "+291",
  SZ: "+268",
  ET: "+251",
  GA: "+241",
  GM: "+220",
  GH: "+233",
  GN: "+224",
  GW: "+245",
  KE: "+254",
  LS: "+266",
  LR: "+231",
  LY: "+218",
  MG: "+261",
  MW: "+265",
  ML: "+223",
  MR: "+222",
  MU: "+230",
  MA: "+212",
  MZ: "+258",
  NA: "+264",
  NE: "+227",
  NG: "+234",
  RW: "+250",
  ST: "+239",
  SN: "+221",
  SC: "+248",
  SL: "+232",
  SO: "+252",
  ZA: "+27",
  SS: "+211",
  SD: "+249",
  TZ: "+255",
  TG: "+228",
  TN: "+216",
  UG: "+256",
  ZM: "+260",
  ZW: "+263",
};

export function getDialCodeForCountry(countryName?: string | null): string | undefined {
  const country = getCountryByName(countryName);
  return country ? COUNTRY_DIAL_CODES[country.code] : undefined;
}
