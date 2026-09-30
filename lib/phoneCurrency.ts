export type CountryCode = { dialCode: string; iso2: string; name: string; currency: string };

// One entry per (dial code, country) -- backs the phone-number country
// picker (components/PhoneNumberField.tsx). Covers every currency this app
// supports (see CURRENCIES in lib/currency.ts). Where two countries share a
// dial code (+1: US/Canada), both are listed since the picker resolves the
// ambiguity explicitly by which one the person actually taps;
// currencyFromPhoneNumber below (for a phone number that predates the
// picker, with no way to ask which country was meant) just takes the first
// match for a given dial code.
export const COUNTRY_CODES: CountryCode[] = [
  { dialCode: "1", iso2: "US", name: "United States", currency: "USD" },
  { dialCode: "1", iso2: "CA", name: "Canada", currency: "CAD" },
  { dialCode: "44", iso2: "GB", name: "United Kingdom", currency: "GBP" },
  { dialCode: "91", iso2: "IN", name: "India", currency: "INR" },
  { dialCode: "971", iso2: "AE", name: "United Arab Emirates", currency: "AED" },
  { dialCode: "27", iso2: "ZA", name: "South Africa", currency: "ZAR" },
  { dialCode: "86", iso2: "CN", name: "China", currency: "CNY" },
  { dialCode: "65", iso2: "SG", name: "Singapore", currency: "SGD" },
  { dialCode: "81", iso2: "JP", name: "Japan", currency: "JPY" },
  { dialCode: "61", iso2: "AU", name: "Australia", currency: "AUD" },
  { dialCode: "55", iso2: "BR", name: "Brazil", currency: "BRL" },
  { dialCode: "49", iso2: "DE", name: "Germany", currency: "EUR" },
  { dialCode: "41", iso2: "CH", name: "Switzerland", currency: "CHF" },
  { dialCode: "39", iso2: "IT", name: "Italy", currency: "EUR" },
  { dialCode: "34", iso2: "ES", name: "Spain", currency: "EUR" },
  { dialCode: "33", iso2: "FR", name: "France", currency: "EUR" },
  { dialCode: "31", iso2: "NL", name: "Netherlands", currency: "EUR" },
];

// Longest dial codes first so a shorter one can't falsely match a prefix of
// a longer one (not actually possible with this specific set today, but the
// safer general pattern for future additions).
const SORTED_DIAL_CODES = [...new Set(COUNTRY_CODES.map((c) => c.dialCode))].sort(
  (a, b) => b.length - a.length
);

// Best-effort inference of a currency from a phone number's leading
// international calling code -- used to pick a sensible default home
// currency (see useProfile) instead of always defaulting to USD. Only
// authoritative for a number that actually starts with "+"/a calling code;
// PhoneNumberField now collects that going forward via an explicit country
// picker, but older phone numbers saved before it existed may still be a
// bare local number with no code at all, which correctly returns null here
// rather than guessing.
export function currencyFromPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.trim().replace(/^\+/, "").replace(/\D/g, "");
  if (!digits) return null;
  for (const dialCode of SORTED_DIAL_CODES) {
    if (digits.startsWith(dialCode)) {
      return COUNTRY_CODES.find((c) => c.dialCode === dialCode)?.currency ?? null;
    }
  }
  return null;
}
