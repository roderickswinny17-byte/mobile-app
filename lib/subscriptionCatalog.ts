import type { IconKey } from "@/assets/constants/icons";

export type CatalogApp = {
  name: string;
  category: string;
  icon: IconKey | null; // null => freely-typed app, no bundled logo
  price: number; // USD reference price plan tiers are derived from
  cycle: "monthly" | "yearly";
  trialDays: number;
  hex: string; // row/legend background -- exact values from design-preview/subscriptions-reference.html
  // Where Pause/Change Plan/Cancel actually send the user -- we have no API
  // access to any of these providers' real billing, so those buttons open
  // the provider's own account page instead of pretending to control it.
  // Best-effort: providers change these paths occasionally.
  billingUrl: string;
  // This provider's REAL plan tiers. `verifiedPrices` is optional per tier
  // and per currency -- only ever filled in from a real, dated source (a
  // screenshot of the provider's own pricing page, or a live fetch), NEVER
  // guessed or estimated. A tier/currency combination with no verified
  // price falls back to derivePlans's illustrative multiplier instead of
  // pretending to be exact. See derivePlans's own comment for why.
  planTiers?: { name: string; verifiedPrices?: Record<string, number> }[];
};

// Suggested matches for the "+" search -- typing anything not found here
// still works (see the Add Subscription screen's "Add it anyway" option),
// this is just what comes with a known logo/category pre-filled.
export const CATALOG_APPS: CatalogApp[] = [
  {
    name: "Netflix", category: "Entertainment", icon: "netflix", price: 15.99, cycle: "monthly", trialDays: 0,
    hex: "#F2879A", billingUrl: "https://www.netflix.com/account",
    // Verified directly from a screenshot of netflix.com's own India
    // pricing/signup page, provided by the user -- real numbers, not an
    // estimate. Only INR is verified; every other currency still falls back
    // to the illustrative multiplier in derivePlans until verified too.
    planTiers: [
      { name: "Mobile", verifiedPrices: { INR: 149 } },
      { name: "Basic", verifiedPrices: { INR: 199 } },
      { name: "Standard", verifiedPrices: { INR: 499 } },
      { name: "Premium", verifiedPrices: { INR: 649 } },
    ],
  },
  { name: "Spotify", category: "Music", icon: "spotify", price: 11.99, cycle: "monthly", trialDays: 30, hex: "#CBE9D3", billingUrl: "https://www.spotify.com/account/subscription/" },
  { name: "Adobe Creative Cloud", category: "Design", icon: "adobe", price: 77.49, cycle: "monthly", trialDays: 7, hex: "#E9C24C", billingUrl: "https://account.adobe.com/plans" },
  { name: "GitHub Pro", category: "Developer Tools", icon: "github", price: 9.99, cycle: "monthly", trialDays: 0, hex: "#DCD3F3", billingUrl: "https://github.com/settings/billing" },
  { name: "Claude Pro", category: "AI Tools", icon: "claude", price: 20.0, cycle: "monthly", trialDays: 0, hex: "#BEDDEC", billingUrl: "https://claude.ai/settings/billing" },
  { name: "ChatGPT Plus", category: "AI Tools", icon: "openai", price: 20.0, cycle: "monthly", trialDays: 0, hex: "#BEDDEC", billingUrl: "https://chatgpt.com/#settings/Subscription" },
  { name: "Canva Pro", category: "Design", icon: "canva", price: 119.99, cycle: "yearly", trialDays: 30, hex: "#CBE9D3", billingUrl: "https://www.canva.com/settings/billing" },
  { name: "Amazon Prime", category: "Shopping", icon: "amazon", price: 14.99, cycle: "monthly", trialDays: 30, hex: "#F4C9A0", billingUrl: "https://www.amazon.com/amazonprime" },
  { name: "YouTube Premium", category: "Entertainment", icon: "youtube", price: 13.99, cycle: "monthly", trialDays: 30, hex: "#F2879A", billingUrl: "https://www.youtube.com/paid_memberships" },
  { name: "Dropbox", category: "Cloud Storage", icon: "dropbox", price: 11.99, cycle: "monthly", trialDays: 30, hex: "#BEDDEC", billingUrl: "https://www.dropbox.com/account/billing" },
  { name: "Figma", category: "Design", icon: "figma", price: 15.0, cycle: "monthly", trialDays: 0, hex: "#E9C24C", billingUrl: "https://www.figma.com/settings" },
  { name: "Apple Music", category: "Music", icon: "applemusic", price: 10.99, cycle: "monthly", trialDays: 30, hex: "#CBE9D3", billingUrl: "https://apps.apple.com/account/subscriptions" },
  { name: "iCloud+", category: "Cloud Storage", icon: "icloud", price: 2.99, cycle: "monthly", trialDays: 0, hex: "#DCD3F3", billingUrl: "https://apps.apple.com/account/subscriptions" },
  { name: "Notion", category: "Productivity", icon: "notion", price: 12.0, cycle: "monthly", trialDays: 0, hex: "#F4C9A0", billingUrl: "https://www.notion.so/settings" },
];

export function makeFreeformApp(query: string): CatalogApp {
  const name = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    name,
    category: "Other",
    icon: null,
    price: hashPrice(name),
    cycle: "monthly",
    trialDays: 7,
    hex: "#DCD3F3",
    // Best guess only -- we don't know this company's real account-page
    // path, just their likely homepage domain.
    billingUrl: `https://${guessDomainForBilling(name)}`,
  };
}

function guessDomainForBilling(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

// Deterministic-but-varied placeholder price for a freely-typed app name --
// same name always gives the same price, different names differ, so plans
// don't all look identical for anything outside the curated catalog.
function hashPrice(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (Math.imul(hash, 31) + name.charCodeAt(i)) >>> 0;
  return Math.round((3.99 + (hash % 2200) / 100) * 100) / 100;
}

// Plan tiers for the App Info screen. Where a CatalogApp has a verified
// real price for the requested currency (see planTiers on Netflix),
// THAT gets used directly -- exact, not converted, not estimated. For
// every tier/currency combination that isn't verified, falls back to an
// illustrative multiplier of the app's single USD reference price. No
// free/legal API exists that returns real, current plan pricing for
// arbitrary companies (and even if there were, a provider's real prices
// often differ by country independently, not just by currency-converting
// one number) -- so the fallback stays a clearly-separate, honestly
// unverified estimate rather than pretending to be exact. "Your Price" on
// the App Info screen is still what actually gets saved either way, and
// that screen's "Check live price" link is the real way to confirm a
// tier/currency combination this function doesn't have verified data for.
const DEFAULT_TIER_NAMES = ["Basic", "Standard", "Premium"];
const THREE_TIER_MULTIPLIERS = [0.6, 1.0, 1.4];

export function derivePlans(
  basePrice: number,
  tiers: { name: string; verifiedPrices?: Record<string, number> }[] = DEFAULT_TIER_NAMES.map((name) => ({ name })),
  currency: string = "USD"
) {
  const n = tiers.length;
  const multipliers =
    n === 3
      ? THREE_TIER_MULTIPLIERS
      : Array.from({ length: n }, (_, i) => (n <= 1 ? 1 : 0.5 + (i / (n - 1)) * 1.1));
  return tiers.map((tier, i) => {
    const verified = tier.verifiedPrices?.[currency];
    return {
      name: tier.name,
      price: verified ?? Math.round(basePrice * multipliers[i] * 100) / 100,
      verified: verified !== undefined,
    };
  });
}
