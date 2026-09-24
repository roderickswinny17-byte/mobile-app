export type BillingCycle = "monthly" | "quarterly" | "yearly";

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateYMD(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  date.setHours(0, 0, 0, 0);
  return date;
}

// The earliest valid "next payment" for a given billing cycle -- a plan
// billed monthly can't have its next charge still fall within the current
// month (you'd already be overdue), and likewise a full cycle out for
// quarterly/yearly. Never earlier than today either way.
export function minNextPaymentDate(cycle: BillingCycle): Date {
  return addMonths(todayMidnight(), CYCLE_MONTHS[cycle]);
}

export function cycleLabel(cycle: BillingCycle): string {
  return cycle === "monthly" ? "monthly" : cycle === "quarterly" ? "quarterly" : "yearly";
}
