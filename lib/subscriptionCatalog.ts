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
};

// Suggested matches for the "+" search -- typing anything not found here
// still works (see the Add Subscription screen's "Add it anyway" option),
// this is just what comes with a known logo/category pre-filled.
export const CATALOG_APPS: CatalogApp[] = [
  { name: "Netflix", category: "Entertainment", icon: "netflix", price: 15.99, cycle: "monthly", trialDays: 0, hex: "#F2879A", billingUrl: "https://www.netflix.com/account" },
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

// Sample plan tiers derived from an app's base price -- illustrative only.
// No free/legal API exists that returns real, current plan pricing for
// arbitrary companies, so this is a deliberate, clearly-labeled placeholder;
// "Your Price" on the App Info screen is what actually gets saved.
export function derivePlans(basePrice: number) {
  return [
    { name: "Basic", price: Math.round(basePrice * 0.6 * 100) / 100 },
    { name: "Standard", price: Math.round(basePrice * 1.0 * 100) / 100 },
    { name: "Premium", price: Math.round(basePrice * 1.4 * 100) / 100 },
  ];
}
