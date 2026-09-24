import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { convert } from "@/lib/currency";

export function monthlyEquivalent(sub: Pick<TrackedSubscription, "monthly_cost" | "billing_cycle">) {
  if (sub.billing_cycle === "yearly") return sub.monthly_cost / 12;
  if (sub.billing_cycle === "quarterly") return sub.monthly_cost / 3;
  return sub.monthly_cost;
}

const CYCLE_LABELS = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" } as const;
const CYCLE_UNITS = { monthly: "month", quarterly: "quarter", yearly: "year" } as const;

export function billingCycleLabel(cycle: TrackedSubscription["billing_cycle"]) {
  return CYCLE_LABELS[cycle];
}

export function billingCycleUnit(cycle: TrackedSubscription["billing_cycle"]) {
  return CYCLE_UNITS[cycle];
}

// Subscriptions can each be billed in a different currency, so a raw sum of
// monthly_cost across them is meaningless -- everything is converted into
// one target currency (the profile's home_currency) before adding up.
export function totalMonthlySpend(subs: TrackedSubscription[], targetCurrency: string) {
  return subs.reduce(
    (sum, sub) => sum + convert(monthlyEquivalent(sub), sub.currency, targetCurrency),
    0
  );
}
