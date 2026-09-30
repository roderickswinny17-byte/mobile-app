import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { isWithinBusinessDaysBefore } from "@/lib/businessDays";

export const REMINDER_WINDOW_DAYS = 2;

// Shared by the Home banner and the bell icon so both agree on exactly
// which subscriptions count as "renewing soon" -- sorted nearest-first so
// callers that only want the single nearest one can just take index 0.
export function getUpcomingRenewals(subscriptions: TrackedSubscription[]): TrackedSubscription[] {
  return subscriptions
    .filter(
      (sub) => sub.next_renewal_date && isWithinBusinessDaysBefore(sub.next_renewal_date, REMINDER_WINDOW_DAYS)
    )
    .sort((a, b) => (a.next_renewal_date! < b.next_renewal_date! ? -1 : 1));
}
