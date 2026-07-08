import { convertCurrencyToIdr, normalizeCostCurrency } from "./currency-rates.js";

export async function resolveVoucherProductCostInput(input = {}) {
  const hasExplicitCurrency = input.costCurrency !== undefined && input.costCurrency !== null && input.costCurrency !== "";
  const hasExplicitAmount = input.costAmount !== undefined && input.costAmount !== null && input.costAmount !== "";

  if (!hasExplicitCurrency && !hasExplicitAmount) {
    const legacyCost = Math.max(0, Math.round(Number(input.costPrice || 0)));
    return {
      costPrice: legacyCost,
      costCurrency: "IDR",
      costAmountOriginal: legacyCost,
      costFxRate: 1,
      costFxFetchedAt: new Date().toISOString(),
    };
  }

  const currency = normalizeCostCurrency(input.costCurrency || "IDR");
  const amount = Number(input.costAmount ?? input.costPrice ?? 0);
  const converted = await convertCurrencyToIdr(amount, currency);
  return {
    costPrice: converted.idrAmount,
    costCurrency: converted.currency,
    costAmountOriginal: converted.amountOriginal,
    costFxRate: converted.fxRate,
    costFxFetchedAt: converted.fxFetchedAt,
  };
}

export function getVoucherProductProfit(product) {
  const sellPrice = Math.max(0, Number(product?.price || 0));
  const costPrice = Math.max(0, Number(product?.costPrice || 0));
  return sellPrice - costPrice;
}

export function formatVoucherCostSummary(product) {
  const costPrice = Math.max(0, Number(product?.costPrice || 0));
  const currency = String(product?.costCurrency || "IDR").toUpperCase();
  const original = Number(product?.costAmountOriginal ?? costPrice);
  if (currency !== "IDR" && original > 0) {
    const formattedOriginal = Number.isInteger(original) ? String(original) : original.toFixed(2);
    return `${formattedOriginal} ${currency}`;
  }
  return null;
}
