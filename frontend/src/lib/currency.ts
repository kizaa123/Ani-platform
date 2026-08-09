/**
 * Multi-currency support — GHC (Ghana Cedi) is the internal ledger base.
 * Static exchange rates for pragmatic cross-border display (not live FX).
 */

export type CurrencyCode =
  | 'GHS'
  | 'USD'
  | 'NGN'
  | 'KES'
  | 'ZAR'
  | 'EGP'
  | 'TZS'
  | 'UGX'
  | 'RWF'
  | 'ETB'
  | 'MAD'
  | 'TND'
  | 'DZD'
  | 'XOF'
  | 'XAF'
  | 'BWP'
  | 'MWK'
  | 'ZMW'
  | 'MZN'
  | 'GMD'
  | 'SLE'
  | 'LRD'
  | 'GNF'
  | 'AOA'
  | 'MUR'
  | 'SCR'
  | 'SZL'
  | 'LSL'
  | 'NAD'
  | 'BIF'
  | 'DJF'
  | 'ERN'
  | 'SOS'
  | 'SSP'
  | 'SDG'
  | 'LYD'
  | 'MRU'
  | 'CVE'
  | 'STN'
  | 'KMF'
  | 'MGA';

export const BASE_CURRENCY: CurrencyCode = 'GHS';

/** Units of target currency per 1 GHC */
const GHC_TO_CURRENCY: Record<CurrencyCode, number> = {
  GHS: 1,
  USD: 0.0645,
  NGN: 98.5,
  KES: 8.25,
  ZAR: 1.18,
  EGP: 2.05,
  TZS: 165,
  UGX: 245,
  RWF: 85,
  ETB: 3.65,
  MAD: 0.64,
  TND: 0.2,
  DZD: 8.7,
  XOF: 39.5,
  XAF: 39.5,
  BWP: 0.87,
  MWK: 110,
  ZMW: 1.65,
  MZN: 4.1,
  GMD: 4.35,
  SLE: 1.45,
  LRD: 12.5,
  GNF: 555,
  AOA: 52,
  MUR: 2.95,
  SCR: 0.92,
  SZL: 1.18,
  LSL: 1.18,
  NAD: 1.18,
  BIF: 185,
  DJF: 11.5,
  ERN: 0.97,
  SOS: 36.5,
  SSP: 85,
  SDG: 38,
  LYD: 0.31,
  MRU: 2.55,
  CVE: 6.45,
  STN: 1.42,
  KMF: 29,
  MGA: 290,
};

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  Ghana: 'GHS',
  Nigeria: 'NGN',
  Kenya: 'KES',
  'South Africa': 'ZAR',
  Egypt: 'EGP',
  Tanzania: 'TZS',
  Uganda: 'UGX',
  Rwanda: 'RWF',
  Ethiopia: 'ETB',
  Morocco: 'MAD',
  Tunisia: 'TND',
  Algeria: 'DZD',
  Senegal: 'XOF',
  Benin: 'XOF',
  'Burkina Faso': 'XOF',
  "Côte d'Ivoire": 'XOF',
  "Cote d'Ivoire": 'XOF',
  'Guinea-Bissau': 'XOF',
  Mali: 'XOF',
  Niger: 'XOF',
  Togo: 'XOF',
  Cameroon: 'XAF',
  Chad: 'XAF',
  Congo: 'XAF',
  'Central African Republic': 'XAF',
  'Equatorial Guinea': 'XAF',
  Gabon: 'XAF',
  'Democratic Republic of the Congo': 'XAF',
  Botswana: 'BWP',
  Malawi: 'MWK',
  Zambia: 'ZMW',
  Mozambique: 'MZN',
  Gambia: 'GMD',
  'Sierra Leone': 'SLE',
  Liberia: 'LRD',
  Guinea: 'GNF',
  Angola: 'AOA',
  Mauritius: 'MUR',
  Seychelles: 'SCR',
  Eswatini: 'SZL',
  Lesotho: 'LSL',
  Namibia: 'NAD',
  Burundi: 'BIF',
  Djibouti: 'DJF',
  Eritrea: 'ERN',
  Somalia: 'SOS',
  'South Sudan': 'SSP',
  Sudan: 'SDG',
  Libya: 'LYD',
  Mauritania: 'MRU',
  'Cabo Verde': 'CVE',
  'São Tomé and Príncipe': 'STN',
  Comoros: 'KMF',
  Madagascar: 'MGA',
};

const DEFAULT_CURRENCY: CurrencyCode = 'USD';

function normalizeCountry(country?: string | null): string {
  return (country ?? '').trim().toLowerCase();
}

export function countriesMatch(a?: string | null, b?: string | null): boolean {
  const na = normalizeCountry(a);
  const nb = normalizeCountry(b);
  if (!na || !nb) return true;
  return na === nb;
}

export function getCurrencyForCountry(country?: string | null): CurrencyCode {
  if (!country?.trim()) return 'GHS';
  const direct = COUNTRY_CURRENCY[country.trim()];
  if (direct) return direct;
  const lower = country.trim().toLowerCase();
  const match = Object.entries(COUNTRY_CURRENCY).find(
    ([name]) => name.toLowerCase() === lower
  );
  return match?.[1] ?? DEFAULT_CURRENCY;
}

export function currencyDisplayCode(code: CurrencyCode): string {
  return code === 'GHS' ? 'GHC' : code;
}

export function convertGhcToCurrency(amountGhc: number, currencyCode: CurrencyCode): number {
  const rate = GHC_TO_CURRENCY[currencyCode] ?? GHC_TO_CURRENCY.USD;
  return roundMoney(amountGhc * rate);
}

export function convertCurrencyToGhc(amount: number, currencyCode: CurrencyCode): number {
  const rate = GHC_TO_CURRENCY[currencyCode] ?? GHC_TO_CURRENCY.USD;
  if (rate === 0) return 0;
  return roundMoney(amount / rate);
}

export function convertBetweenCurrencies(
  from: CurrencyCode,
  to: CurrencyCode,
  amount: number
): number {
  const ghc = convertCurrencyToGhc(amount, from);
  return convertGhcToCurrency(ghc, to);
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatMoneyLocalized(
  amount: number,
  currencyCode: CurrencyCode,
  _countryCode?: string
): string {
  const code = currencyDisplayCode(currencyCode);
  return `${code} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatGhcAmount(amountGhc: number): string {
  return formatMoneyLocalized(amountGhc, 'GHS');
}

export function formatAmountForCountry(amountGhc: number, country?: string | null): string {
  const currency = getCurrencyForCountry(country);
  const converted = convertGhcToCurrency(amountGhc, currency);
  return formatMoneyLocalized(converted, currency);
}

/** Number only, no currency code — for table cells whose header carries the code, e.g. "Amount (GHC)". */
export function formatAmountNumberForCountry(amountGhc: number, country?: string | null): string {
  const currency = getCurrencyForCountry(country);
  const converted = convertGhcToCurrency(amountGhc, currency);
  return converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPricePerUnit(amountGhc: number, unit: string, country?: string | null): string {
  return `${formatAmountForCountry(amountGhc, country)}/${unit}`;
}

export function formatCrossBorderAmount(
  amountGhc: number,
  buyerCountry: string,
  recipientCountry: string
): string {
  const buyerCurrency = getCurrencyForCountry(buyerCountry);
  const recipientCurrency = getCurrencyForCountry(recipientCountry);
  const buyerAmount = convertGhcToCurrency(amountGhc, buyerCurrency);
  const recipientAmount = convertGhcToCurrency(amountGhc, recipientCurrency);
  return `${formatMoneyLocalized(buyerAmount, buyerCurrency)} (${formatMoneyLocalized(recipientAmount, recipientCurrency)})`;
}

export function formatOrderAmountForRecipient(
  amountGhc: number,
  buyerCountry: string,
  recipientCountry: string
): string {
  if (countriesMatch(buyerCountry, recipientCountry)) {
    return formatAmountForCountry(amountGhc, recipientCountry);
  }
  return formatCrossBorderAmount(amountGhc, buyerCountry, recipientCountry);
}

export function formatOrderAmountForStatement(
  amountGhc: number,
  buyerCountry: string,
  farmerCountry: string,
  perspective: 'sender' | 'receiver' | 'admin'
): string {
  const crossBorder = !countriesMatch(buyerCountry, farmerCountry);
  if (perspective === 'sender') {
    return formatAmountForCountry(amountGhc, buyerCountry);
  }
  if (perspective === 'receiver') {
    if (crossBorder) {
      return formatCrossBorderAmount(amountGhc, buyerCountry, farmerCountry);
    }
    return formatAmountForCountry(amountGhc, farmerCountry);
  }
  if (crossBorder) {
    return formatCrossBorderAmount(amountGhc, buyerCountry, farmerCountry);
  }
  return formatAmountForCountry(amountGhc, farmerCountry);
}

export function formatFarmAccessFeeForCountry(country?: string | null, feeGhc = 1): string {
  return formatAmountForCountry(feeGhc, country);
}

/** Convert a GHC-stored amount for display in the viewer's country. */
export function formatForViewer(amountGhc: number, viewerCountry?: string | null): string {
  return formatAmountForCountry(amountGhc, viewerCountry);
}
