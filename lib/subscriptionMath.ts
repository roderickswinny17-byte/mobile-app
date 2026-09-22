import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";

export function monthlyEquivalent(sub: Pick<TrackedSubscription, "monthly_cost" | "billing_cycle">) {
  return sub.billing_cycle === "yearly" ? sub.monthly_cost / 12 : sub.monthly_cost;
}

export function totalMonthlySpend(subs: TrackedSubscription[]) {
  return subs.reduce((sum, sub) => sum + monthlyEquivalent(sub), 0);
}
