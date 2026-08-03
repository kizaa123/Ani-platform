import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// ISO 3166-1 alpha-2 country names (English short names) + ITU dial codes
const COUNTRY_DATA = [
  ["Afghanistan", "AF", "+93"],
  ["Albania", "AL", "+355"],
  ["Algeria", "DZ", "+213"],
  ["American Samoa", "AS", "+1"],
  ["Andorra", "AD", "+376"],
  ["Angola", "AO", "+244"],
  ["Anguilla", "AI", "+1"],
  ["Antarctica", "AQ", "+672"],
  ["Antigua and Barbuda", "AG", "+1"],
  ["Argentina", "AR", "+54"],
  ["Armenia", "AM", "+374"],
  ["Aruba", "AW", "+297"],
  ["Australia", "AU", "+61"],
  ["Austria", "AT", "+43"],
  ["Azerbaijan", "AZ", "+994"],
  ["Bahamas", "BS", "+1"],
  ["Bahrain", "BH", "+973"],
  ["Bangladesh", "BD", "+880"],
  ["Barbados", "BB", "+1"],
  ["Belarus", "BY", "+375"],
  ["Belgium", "BE", "+32"],
  ["Belize", "BZ", "+501"],
  ["Benin", "BJ", "+229"],
  ["Bermuda", "BM", "+1"],
  ["Bhutan", "BT", "+975"],
  ["Bolivia", "BO", "+591"],
  ["Bonaire, Sint Eustatius and Saba", "BQ", "+599"],
  ["Bosnia and Herzegovina", "BA", "+387"],
  ["Botswana", "BW", "+267"],
  ["Bouvet Island", "BV", "+47"],
  ["Brazil", "BR", "+55"],
  ["British Indian Ocean Territory", "IO", "+246"],
  ["Brunei Darussalam", "BN", "+673"],
  ["Bulgaria", "BG", "+359"],
  ["Burkina Faso", "BF", "+226"],
  ["Burundi", "BI", "+257"],
  ["Cabo Verde", "CV", "+238"],
  ["Cambodia", "KH", "+855"],
  ["Cameroon", "CM", "+237"],
  ["Canada", "CA", "+1"],
  ["Cayman Islands", "KY", "+1"],
  ["Central African Republic", "CF", "+236"],
  ["Chad", "TD", "+235"],
  ["Chile", "CL", "+56"],
  ["China", "CN", "+86"],
  ["Christmas Island", "CX", "+61"],
  ["Cocos (Keeling) Islands", "CC", "+61"],
  ["Colombia", "CO", "+57"],
  ["Comoros", "KM", "+269"],
  ["Congo", "CG", "+242"],
  ["Cook Islands", "CK", "+682"],
  ["Costa Rica", "CR", "+506"],
  ["Côte d'Ivoire", "CI", "+225"],
  ["Croatia", "HR", "+385"],
  ["Cuba", "CU", "+53"],
  ["Curaçao", "CW", "+599"],
  ["Cyprus", "CY", "+357"],
  ["Czechia", "CZ", "+420"],
  ["Democratic Republic of the Congo", "CD", "+243"],
  ["Denmark", "DK", "+45"],
  ["Djibouti", "DJ", "+253"],
  ["Dominica", "DM", "+1"],
  ["Dominican Republic", "DO", "+1"],
  ["Ecuador", "EC", "+593"],
  ["Egypt", "EG", "+20"],
  ["El Salvador", "SV", "+503"],
  ["Equatorial Guinea", "GQ", "+240"],
  ["Eritrea", "ER", "+291"],
  ["Estonia", "EE", "+372"],
  ["Eswatini", "SZ", "+268"],
  ["Ethiopia", "ET", "+251"],
  ["Falkland Islands", "FK", "+500"],
  ["Faroe Islands", "FO", "+298"],
  ["Fiji", "FJ", "+679"],
  ["Finland", "FI", "+358"],
  ["France", "FR", "+33"],
  ["French Guiana", "GF", "+594"],
  ["French Polynesia", "PF", "+689"],
  ["French Southern Territories", "TF", "+262"],
  ["Gabon", "GA", "+241"],
  ["Gambia", "GM", "+220"],
  ["Georgia", "GE", "+995"],
  ["Germany", "DE", "+49"],
  ["Ghana", "GH", "+233"],
  ["Gibraltar", "GI", "+350"],
  ["Greece", "GR", "+30"],
  ["Greenland", "GL", "+299"],
  ["Grenada", "GD", "+1"],
  ["Guadeloupe", "GP", "+590"],
  ["Guam", "GU", "+1"],
  ["Guatemala", "GT", "+502"],
  ["Guernsey", "GG", "+44"],
  ["Guinea", "GN", "+224"],
  ["Guinea-Bissau", "GW", "+245"],
  ["Guyana", "GY", "+592"],
  ["Haiti", "HT", "+509"],
  ["Heard Island and McDonald Islands", "HM", "+672"],
  ["Holy See", "VA", "+39"],
  ["Honduras", "HN", "+504"],
  ["Hong Kong", "HK", "+852"],
  ["Hungary", "HU", "+36"],
  ["Iceland", "IS", "+354"],
  ["India", "IN", "+91"],
  ["Indonesia", "ID", "+62"],
  ["Iran", "IR", "+98"],
  ["Iraq", "IQ", "+964"],
  ["Ireland", "IE", "+353"],
  ["Isle of Man", "IM", "+44"],
  ["Israel", "IL", "+972"],
  ["Italy", "IT", "+39"],
  ["Jamaica", "JM", "+1"],
  ["Japan", "JP", "+81"],
  ["Jersey", "JE", "+44"],
  ["Jordan", "JO", "+962"],
  ["Kazakhstan", "KZ", "+7"],
  ["Kenya", "KE", "+254"],
  ["Kiribati", "KI", "+686"],
  ["Kuwait", "KW", "+965"],
  ["Kyrgyzstan", "KG", "+996"],
  ["Laos", "LA", "+856"],
  ["Latvia", "LV", "+371"],
  ["Lebanon", "LB", "+961"],
  ["Lesotho", "LS", "+266"],
  ["Liberia", "LR", "+231"],
  ["Libya", "LY", "+218"],
  ["Liechtenstein", "LI", "+423"],
  ["Lithuania", "LT", "+370"],
  ["Luxembourg", "LU", "+352"],
  ["Macao", "MO", "+853"],
  ["Madagascar", "MG", "+261"],
  ["Malawi", "MW", "+265"],
  ["Malaysia", "MY", "+60"],
  ["Maldives", "MV", "+960"],
  ["Mali", "ML", "+223"],
  ["Malta", "MT", "+356"],
  ["Marshall Islands", "MH", "+692"],
  ["Martinique", "MQ", "+596"],
  ["Mauritania", "MR", "+222"],
  ["Mauritius", "MU", "+230"],
  ["Mayotte", "YT", "+262"],
  ["Mexico", "MX", "+52"],
  ["Micronesia", "FM", "+691"],
  ["Moldova", "MD", "+373"],
  ["Monaco", "MC", "+377"],
  ["Mongolia", "MN", "+976"],
  ["Montenegro", "ME", "+382"],
  ["Montserrat", "MS", "+1"],
  ["Morocco", "MA", "+212"],
  ["Mozambique", "MZ", "+258"],
  ["Myanmar", "MM", "+95"],
  ["Namibia", "NA", "+264"],
  ["Nauru", "NR", "+674"],
  ["Nepal", "NP", "+977"],
  ["Netherlands", "NL", "+31"],
  ["New Caledonia", "NC", "+687"],
  ["New Zealand", "NZ", "+64"],
  ["Nicaragua", "NI", "+505"],
  ["Niger", "NE", "+227"],
  ["Nigeria", "NG", "+234"],
  ["Niue", "NU", "+683"],
  ["Norfolk Island", "NF", "+672"],
  ["North Korea", "KP", "+850"],
  ["North Macedonia", "MK", "+389"],
  ["Northern Mariana Islands", "MP", "+1"],
  ["Norway", "NO", "+47"],
  ["Oman", "OM", "+968"],
  ["Pakistan", "PK", "+92"],
  ["Palau", "PW", "+680"],
  ["Palestine", "PS", "+970"],
  ["Panama", "PA", "+507"],
  ["Papua New Guinea", "PG", "+675"],
  ["Paraguay", "PY", "+595"],
  ["Peru", "PE", "+51"],
  ["Philippines", "PH", "+63"],
  ["Pitcairn", "PN", "+64"],
  ["Poland", "PL", "+48"],
  ["Portugal", "PT", "+351"],
  ["Puerto Rico", "PR", "+1"],
  ["Qatar", "QA", "+974"],
  ["Réunion", "RE", "+262"],
  ["Romania", "RO", "+40"],
  ["Russia", "RU", "+7"],
  ["Rwanda", "RW", "+250"],
  ["Saint Barthélemy", "BL", "+590"],
  ["Saint Helena, Ascension and Tristan da Cunha", "SH", "+290"],
  ["Saint Kitts and Nevis", "KN", "+1"],
  ["Saint Lucia", "LC", "+1"],
  ["Saint Martin", "MF", "+590"],
  ["Saint Pierre and Miquelon", "PM", "+508"],
  ["Saint Vincent and the Grenadines", "VC", "+1"],
  ["Samoa", "WS", "+685"],
  ["San Marino", "SM", "+378"],
  ["São Tomé and Príncipe", "ST", "+239"],
  ["Saudi Arabia", "SA", "+966"],
  ["Senegal", "SN", "+221"],
  ["Serbia", "RS", "+381"],
  ["Seychelles", "SC", "+248"],
  ["Sierra Leone", "SL", "+232"],
  ["Singapore", "SG", "+65"],
  ["Sint Maarten", "SX", "+1"],
  ["Slovakia", "SK", "+421"],
  ["Slovenia", "SI", "+386"],
  ["Solomon Islands", "SB", "+677"],
  ["Somalia", "SO", "+252"],
  ["South Africa", "ZA", "+27"],
  ["South Georgia and the South Sandwich Islands", "GS", "+500"],
  ["South Korea", "KR", "+82"],
  ["South Sudan", "SS", "+211"],
  ["Spain", "ES", "+34"],
  ["Sri Lanka", "LK", "+94"],
  ["Sudan", "SD", "+249"],
  ["Suriname", "SR", "+597"],
  ["Svalbard and Jan Mayen", "SJ", "+47"],
  ["Sweden", "SE", "+46"],
  ["Switzerland", "CH", "+41"],
  ["Syria", "SY", "+963"],
  ["Taiwan", "TW", "+886"],
  ["Tajikistan", "TJ", "+992"],
  ["Tanzania", "TZ", "+255"],
  ["Thailand", "TH", "+66"],
  ["Timor-Leste", "TL", "+670"],
  ["Togo", "TG", "+228"],
  ["Tokelau", "TK", "+690"],
  ["Tonga", "TO", "+676"],
  ["Trinidad and Tobago", "TT", "+1"],
  ["Tunisia", "TN", "+216"],
  ["Turkey", "TR", "+90"],
  ["Turkmenistan", "TM", "+993"],
  ["Turks and Caicos Islands", "TC", "+1"],
  ["Tuvalu", "TV", "+688"],
  ["Uganda", "UG", "+256"],
  ["Ukraine", "UA", "+380"],
  ["United Arab Emirates", "AE", "+971"],
  ["United Kingdom", "GB", "+44"],
  ["United States", "US", "+1"],
  ["United States Minor Outlying Islands", "UM", "+1"],
  ["Uruguay", "UY", "+598"],
  ["Uzbekistan", "UZ", "+998"],
  ["Vanuatu", "VU", "+678"],
  ["Venezuela", "VE", "+58"],
  ["Vietnam", "VN", "+84"],
  ["Virgin Islands (British)", "VG", "+1"],
  ["Virgin Islands (U.S.)", "VI", "+1"],
  ["Wallis and Futuna", "WF", "+681"],
  ["Western Sahara", "EH", "+212"],
  ["Yemen", "YE", "+967"],
  ["Zambia", "ZM", "+260"],
  ["Zimbabwe", "ZW", "+263"],
];

const countries = COUNTRY_DATA.map(([name, code, dial]) => ({ name, code, dial }));
countries.sort((a, b) => a.name.localeCompare(b.name));

const countryLines = countries
  .map((c) => `  { name: ${JSON.stringify(c.name)}, code: ${JSON.stringify(c.code)} },`)
  .join("\n");

const dialLines = countries
  .map((c) => `  ${c.code}: ${JSON.stringify(c.dial)},`)
  .join("\n");

const nameToCodeLines = countries
  .map((c) => `  ${JSON.stringify(c.name)}: ${JSON.stringify(c.code)},`)
  .join("\n");

const frontendContent = `/** ISO 3166-1 alpha-2 countries worldwide */
export const COUNTRIES = [
${countryLines}
] as const;

/** @deprecated Use COUNTRIES — kept for backward compatibility */
export const AFRICAN_COUNTRIES = COUNTRIES;

export type CountryName = (typeof COUNTRIES)[number]["name"];
/** @deprecated Use CountryName */
export type AfricanCountryName = CountryName;

type Country = (typeof COUNTRIES)[number];

const byName = new Map(COUNTRIES.map((c) => [c.name, c]));
const byCode = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));

/** PNG flag URL (works on Windows - emoji flags often do not) */
export function getCountryFlagUrl(code: string, width = 40): string {
  return \`https://flagcdn.com/w\${width}/\${code.toLowerCase()}.png\`;
}

export function getCountryByName(name?: string | null) {
  if (!name) return undefined;
  return (
    byName.get(name as CountryName) ??
    COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase())
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

export const DEFAULT_COUNTRY: CountryName = "Ghana";

/** ITU dial codes keyed by ISO 3166-1 alpha-2 */
export const COUNTRY_DIAL_CODES: Record<Country["code"], string> = {
${dialLines}
};

export function getDialCodeForCountry(countryName?: string | null): string | undefined {
  const country = getCountryByName(countryName);
  return country ? COUNTRY_DIAL_CODES[country.code] : undefined;
}
`;

const backendPhoneContent = `const COUNTRY_DIAL_CODES: Record<string, string> = {
${dialLines}
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
${nameToCodeLines}
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
  return value.replace(/[\\s-]/g, '').trim();
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

  digits = digits.replace(/\\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidPhoneNumber(value: string, countryName?: string | null): boolean {
  const national = extractNationalDigits(value, countryName ?? DEFAULT_COUNTRY);
  if (!national || !/^\\d+$/.test(national)) return false;
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
  return \`\${dialCode}\${national}\`;
}
`;

fs.writeFileSync(
  path.join(root, "frontend/src/lib/africanCountries.ts"),
  frontendContent,
  "utf8"
);
fs.writeFileSync(
  path.join(root, "backend/src/utils/phone.ts"),
  backendPhoneContent,
  "utf8"
);

console.log(`Generated ${countries.length} countries`);
