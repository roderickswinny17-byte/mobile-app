// Multi-currency support: each tracked subscription keeps whatever currency
// it's actually billed in; a profile's home_currency (see useProfile) is
// only the unit totals get converted into for aggregate views like Insights.
// Rates come from a free, no-key FX API, with a static fallback if that
// fetch fails (offline, API down) so conversion still works approximately
// instead of the app breaking.

export const CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "INR", label: "Indian Rupee" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "AED", label: "UAE Dirham" },
  { code: "ZAR", label: "South African Rand" },
  { code: "BRL", label: "Brazilian Real" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.3, JPY: 149, AUD: 1.52,
  CAD: 1.36, CHF: 0.88, CNY: 7.1, SGD: 1.34, AED: 3.67, ZAR: 18.4, BRL: 5.4,
};

let rates: Record<string, number> = { ...FALLBACK_RATES };
let ratesPromise: Promise<Record<string, number>> | null = null;

async function loadRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data?.rates) rates = data.rates;
  } catch {
    // Keep the static fallback already assigned above.
  }
  return rates;
}

// Fetches live rates once per app session (subsequent calls reuse the same
// in-flight/resolved promise) and returns the best rates available so far.
export function ensureRates(): Promise<Record<string, number>> {
  if (!ratesPromise) ratesPromise = loadRates();
  return ratesPromise;
}

export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
