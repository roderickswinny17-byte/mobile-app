// new Date("2026-09-30") is a classic JS trap: a bare YYYY-MM-DD string is
// parsed as UTC midnight, not local midnight, and can land on the wrong
// local calendar day depending on the runtime's timezone handling -- this
// parses the components explicitly and builds the Date with the local-time
// constructor instead, which is never ambiguous.
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Weekend-aware business-day counting for the renewal reminder (Bleed/etc.
// don't need this -- this is the first place "2 business days" actually
// matters). Deliberately simple: no public-holiday calendar, just
// Saturday/Sunday exclusion, since a full holiday list needs yearly upkeep
// and isn't worth the complexity for a soft reminder banner.
export function isWithinBusinessDaysBefore(
  targetDateStr: string,
  days: number,
  today: Date = new Date()
): boolean {
  const target = parseLocalDate(targetDateStr);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  if (target < todayMidnight) return false; // already passed

  let count = 0;
  const cursor = new Date(todayMidnight);
  while (cursor < target) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count <= days;
}
