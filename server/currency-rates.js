const CACHE_TTL_MS = 10 * 60 * 1000;
const rateCache = new Map();

export const SUPPORTED_COST_CURRENCIES = [
  { code: "IDR", label: "IDR — Rupiah" },
  { code: "USD", label: "USD — Dolar AS" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — Pound Sterling" },
  { code: "SGD", label: "SGD — Dolar Singapura" },
  { code: "MYR", label: "MYR — Ringgit Malaysia" },
  { code: "JPY", label: "JPY — Yen Jepang" },
  { code: "AUD", label: "AUD — Dolar Australia" },
  { code: "CNY", label: "CNY — Yuan China" },
  { code: "HKD", label: "HKD — Dolar Hong Kong" },
  { code: "THB", label: "THB — Baht Thailand" },
  { code: "PHP", label: "PHP — Peso Filipina" },
  { code: "VND", label: "VND — Dong Vietnam" },
  { code: "KRW", label: "KRW — Won Korea" },
  { code: "TWD", label: "TWD — Dolar Taiwan" },
  { code: "SAR", label: "SAR — Riyal Saudi" },
  { code: "AED", label: "AED — Dirham UAE" },
];

const SUPPORTED_CODES = new Set(SUPPORTED_COST_CURRENCIES.map((item) => item.code));

const FX_PROVIDERS = [
  {
    id: "market-api",
    weight: 0.65,
    async fetch(currency) {
      const code = currency.toLowerCase();
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`market-api ${response.status}`);
      const payload = await response.json();
      const rate = Number(payload?.[code]?.idr);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("market-api missing IDR");
      return {
        rate,
        source: "market-api",
        rateDate: String(payload?.date || ""),
      };
    },
  },
  {
    id: "open-er-api",
    weight: 0.35,
    async fetch(currency) {
      const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(currency)}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`open-er-api ${response.status}`);
      const payload = await response.json();
      const rate = Number(payload?.rates?.IDR || 0);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("open-er-api missing IDR");
      return {
        rate,
        source: "open-er-api",
        rateDate: String(payload?.time_last_update_utc || ""),
      };
    },
  },
];

export function normalizeCostCurrency(value) {
  const code = String(value || "IDR").trim().toUpperCase();
  if (!SUPPORTED_CODES.has(code)) {
    throw new Error(`Mata uang ${code} belum didukung. Pilih dari daftar yang tersedia.`);
  }
  return code;
}

function combineFxQuotes(quotes) {
  if (!quotes.length) {
    throw new Error("Kurs tidak tersedia dari provider FX.");
  }

  const marketQuote = quotes.find((item) => item.source === "market-api");
  if (marketQuote) {
    return {
      rate: marketQuote.rate,
      source: marketQuote.source,
      rateDate: marketQuote.rateDate || "",
      providerCount: quotes.length,
    };
  }

  if (quotes.length === 1) {
    return {
      rate: quotes[0].rate,
      source: quotes[0].source,
      rateDate: quotes[0].rateDate || "",
      providerCount: 1,
    };
  }

  const weightTotal = quotes.reduce((sum, item) => sum + item.weight, 0);
  const rate = quotes.reduce((sum, item) => sum + (item.rate * item.weight), 0) / weightTotal;
  const sources = [...new Set(quotes.map((item) => item.source))];
  const rateDates = quotes.map((item) => item.rateDate).filter(Boolean);

  return {
    rate,
    source: sources.join("+"),
    rateDate: rateDates[0] || "",
    providerCount: quotes.length,
  };
}

async function fetchIdrRate(fromCurrency) {
  const currency = normalizeCostCurrency(fromCurrency);
  if (currency === "IDR") {
    return {
      currency,
      rate: 1,
      fetchedAt: new Date().toISOString(),
      source: "identity",
      rateDate: "",
      providerCount: 0,
    };
  }

  const cacheKey = `${currency}->IDR`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const results = await Promise.allSettled(
    FX_PROVIDERS.map(async (provider) => {
      const quote = await provider.fetch(currency);
      return {
        ...quote,
        weight: provider.weight,
      };
    }),
  );

  const quotes = results
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value);

  if (!quotes.length) {
    const reasons = results
      .filter((item) => item.status === "rejected")
      .map((item) => item.reason?.message || "unknown")
      .join("; ");
    throw new Error(`Gagal mengambil kurs ${currency}/IDR. ${reasons || "Coba lagi nanti."}`);
  }

  const combined = combineFxQuotes(quotes);
  const value = {
    currency,
    rate: combined.rate,
    fetchedAt: new Date().toISOString(),
    source: combined.source,
    rateDate: combined.rateDate,
    providerCount: combined.providerCount,
  };
  rateCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function convertCurrencyToIdr(amount, currencyCode) {
  const currency = normalizeCostCurrency(currencyCode);
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Nominal harga modal tidak valid.");
  }
  if (currency === "IDR") {
    return {
      currency,
      amountOriginal: numericAmount,
      idrAmount: Math.max(0, Math.round(numericAmount)),
      fxRate: 1,
      fxFetchedAt: new Date().toISOString(),
      fxSource: "identity",
      rateDate: "",
      providerCount: 0,
    };
  }

  const rateInfo = await fetchIdrRate(currency);
  const idrAmount = Math.max(0, Math.round(numericAmount * rateInfo.rate));
  return {
    currency,
    amountOriginal: numericAmount,
    idrAmount,
    fxRate: rateInfo.rate,
    fxFetchedAt: rateInfo.fetchedAt,
    fxSource: rateInfo.source,
    rateDate: rateInfo.rateDate || "",
    providerCount: rateInfo.providerCount || 0,
  };
}

export function listSupportedCostCurrencies() {
  return SUPPORTED_COST_CURRENCIES.slice();
}
