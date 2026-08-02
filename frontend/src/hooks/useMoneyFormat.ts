"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import {
  formatFarmAccessFeeForCountry,
  formatForViewer,
  formatOrderAmountForRecipient,
  formatPricePerUnit,
  getCurrencyForCountry,
  convertGhcToCurrency,
} from "@/lib/currency";

export function useMoneyFormat() {
  const { user } = useAuth();
  const country = user?.country ?? "Ghana";

  return useMemo(
    () => ({
      country,
      currency: getCurrencyForCountry(country),
      format: (amountGhc: number) => formatForViewer(amountGhc, country),
      formatUnitPrice: (amountGhc: number, unit: string) =>
        formatPricePerUnit(amountGhc, unit, country),
      formatFarmAccessFee: (feeGhc = 1) => formatFarmAccessFeeForCountry(country, feeGhc),
      formatOrderForViewer: (amountGhc: number, buyerCountry: string) =>
        formatOrderAmountForRecipient(amountGhc, buyerCountry, country),
      convert: (amountGhc: number) => convertGhcToCurrency(amountGhc, getCurrencyForCountry(country)),
    }),
    [country]
  );
}

export type MoneyFormat = ReturnType<typeof useMoneyFormat>;
