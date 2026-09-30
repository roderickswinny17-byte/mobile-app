export type BleedTier = "healthy" | "leaking" | "bleeding";

const DAY_MS = 24 * 60 * 60 * 1000;

// "Bleed": how much a subscription looks forgotten. Combines days since you
// last opened its detail screen -- the only honest "did you still care
// about this" signal available, since there's no way to know whether the
// underlying service itself (Netflix, Spotify, ...) was actually used, on
// any device -- with what it costs, since a forgotten $2/mo trial matters
// far less than a forgotten $50/mo plan.
export function computeBleedScore(params: {
  lastViewedAt: string | null;
  createdAt: string;
  monthlyCost: number;
  now?: Date;
}): { score: number; tier: BleedTier; daysSinceLastViewed: number } {
  const now = params.now ?? new Date();
  const reference = params.lastViewedAt ?? params.createdAt;
  const daysSinceLastViewed = Math.max(
    0,
    Math.floor((now.getTime() - new Date(reference).getTime()) / DAY_MS)
  );

  const neglectFactor = Math.min(1, daysSinceLastViewed / 60); // maxes out at 60 days untouched
  const costFactor = Math.min(1, Math.log10(params.monthlyCost + 1) / Math.log10(101)); // log-scaled up to ~100

  const score = Math.round(neglectFactor * 70 + costFactor * 30);
  const tier: BleedTier = score >= 60 ? "bleeding" : score >= 30 ? "leaking" : "healthy";

  return { score, tier, daysSinceLastViewed };
}
