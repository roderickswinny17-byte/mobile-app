import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { resolveBillingUrl } from "@/lib/subscriptionCatalog";

export type DetectedSubscription = {
  id: string;
  service_name: string;
  icon_key: string | null;
  guessed_amount: number | null;
  guessed_currency: string;
  guessed_billing_cycle: "monthly" | "quarterly" | "yearly";
  guessed_next_renewal_date: string | null;
  source_snippet: string | null;
  detected_at: string;
  // 1 (best) to 4 (weakest) -- see classifyEvidenceTier in
  // gmail-scan-subscriptions. 1 = an actual receipt with a real amount/charge
  // date, 2 = a redeem/claim/trial-ending nudge, 3 = a subscribe/upgrade
  // invitation, 4 = anything else that still cleared the detection gates.
  evidence_tier: number;
};

// Candidates gmail-scan-subscriptions found, awaiting a yes/no from the
// user -- never written straight into tracked_subscriptions, since a
// receipt-email guess (sender name + first $ amount in the snippet) will
// sometimes be wrong.
// One review card per service, not per email -- multiple receipt/notice
// emails for the same service (e.g. a login-code email plus the real
// receipt) used to show up as separate duplicate cards. group[0] is always
// the best representative to show on the card (see the sort below).
export type DetectedGroup = DetectedSubscription[];

export function useDetectedSubscriptions() {
  const [groups, setGroups] = useState<DetectedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("detected_subscriptions")
      .select("id, service_name, icon_key, guessed_amount, guessed_currency, guessed_billing_cycle, guessed_next_renewal_date, source_snippet, detected_at, evidence_tier")
      .eq("status", "pending")
      .order("detected_at", { ascending: false });
    if (fetchError) {
      console.error("useDetectedSubscriptions: fetch failed", fetchError.message);
      setError(fetchError.message);
    } else {
      setError(null);
      // Best evidence first: a real receipt (tier 1) before a redeem/claim
      // nudge (tier 2) before a bare subscribe invitation (tier 3/4) -- see
      // evidence_tier's definition. A found price is the tiebreaker within a
      // tier, then newest first (the query above already ordered by
      // detected_at, and JS sort is stable, so ties just keep that order).
      const sorted = [...(data ?? [])].sort((a, b) => {
        if (a.evidence_tier !== b.evidence_tier) return a.evidence_tier - b.evidence_tier;
        const aHasAmount = a.guessed_amount != null ? 0 : 1;
        const bHasAmount = b.guessed_amount != null ? 0 : 1;
        return aHasAmount - bHasAmount;
      });
      // Group by service name (case-insensitive) -- Map preserves insertion
      // order, so groups inherit the same tier-then-priced ordering as items.
      const byService = new Map<string, DetectedGroup>();
      for (const item of sorted) {
        const key = item.service_name.trim().toLowerCase();
        const existingGroup = byService.get(key);
        if (existingGroup) existingGroup.push(item);
        else byService.set(key, [item]);
      }
      // The single best-tier email rarely has every field on its own (e.g.
      // the clearest receipt has the amount but an older email for the same
      // service has the renewal date) -- fill group[0]'s gaps from the rest
      // of the group so the one card shown actually carries the fullest
      // picture, not just whatever happened to be on the top-ranked email.
      const merged = [...byService.values()].map((group) => {
        const best = group[0];
        const primary: DetectedSubscription = {
          ...best,
          guessed_amount: best.guessed_amount ?? group.find((g) => g.guessed_amount != null)?.guessed_amount ?? null,
          guessed_next_renewal_date:
            best.guessed_next_renewal_date ??
            group.find((g) => g.guessed_next_renewal_date != null)?.guessed_next_renewal_date ??
            null,
          icon_key: best.icon_key ?? group.find((g) => g.icon_key != null)?.icon_key ?? null,
        };
        return [primary, ...group.slice(1)];
      });
      setGroups(merged);
    }
    setLoading(false);
  }, []);

  // useFocusEffect, not a plain mount-only useEffect: this screen stays
  // mounted in the navigation stack while you go tap "Scan Now" elsewhere
  // and come back, so a mount-only fetch would keep showing the exact same
  // stale snapshot from before the scan ran no matter how many times you
  // rescan -- refetching on every focus is what actually picks up new data.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const approve = useCallback(
    async (
      group: DetectedGroup,
      price: number,
      currency: string,
      billingCycle: "monthly" | "quarterly" | "yearly"
    ) => {
      const primary = group[0];
      const groupIds = group.map((item) => item.id);

      // Same requirement as addSubscription in useTrackedSubscriptions:
      // user_id is required by both the NOT NULL constraint and the RLS
      // policy (auth.uid() = user_id) -- without it this insert always
      // fails, silently, since RLS rejection isn't a loud error either.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return { error: "Not signed in" };

      // Duplicate guard: nothing else stops the same service being tracked
      // twice (manual add, catalog add, and Gmail approval all write to the
      // same table with no uniqueness check) -- this is what produced two
      // separate "Spotify" rows after a rescan matched a different email
      // than the first scan did.
      const { data: existing } = await supabase
        .from("tracked_subscriptions")
        .select("id")
        .ilike("service_name", primary.service_name)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("detected_subscriptions").update({ status: "approved" }).in("id", groupIds);
        await load();
        return { error: null, skipped: true };
      }

      // Real billing/account URL, same source as the manual-add flow --
      // was missing here entirely before, so Pause/Change Plan/Cancel fell
      // back to a Google search instead of the provider's actual page.
      // resolveBillingUrl also covers services whose real domain/path a
      // blind name guess gets wrong (Google One -> one.google.com, not
      // "googleone.com"; ElevenLabs -> elevenlabs.io, not .com).
      const billingUrl = resolveBillingUrl(primary.service_name);

      const { error } = await supabase.from("tracked_subscriptions").insert({
        user_id: session.user.id,
        service_name: primary.service_name,
        monthly_cost: price, // confirmed/entered on the review card, not the raw guess
        currency, // confirmed/entered on the review card, not just the raw guess
        billing_cycle: billingCycle, // confirmed/entered on the review card, not just the raw guess
        // Best-guess from the receipt's own charge date, rolled forward to
        // the next occurrence -- was unconditionally null before, which is
        // why the renewal reminder had nothing to work with for any
        // Gmail-approved subscription.
        next_renewal_date: primary.guessed_next_renewal_date,
        category: null,
        icon_key: primary.icon_key,
        hex: "#DCD3F3",
        billing_url: billingUrl,
      });
      if (error) return { error: error.message };

      // Every email in the group is resolved together -- otherwise the
      // other N-1 emails for this same service would still be sitting
      // "pending" and show right back up as duplicate cards next scan.
      await supabase.from("detected_subscriptions").update({ status: "approved" }).in("id", groupIds);
      await load();
      return { error: null, skipped: false };
    },
    [load]
  );

  const dismiss = useCallback(
    async (group: DetectedGroup) => {
      await supabase
        .from("detected_subscriptions")
        .update({ status: "dismissed" })
        .in("id", group.map((item) => item.id));
      await load();
    },
    [load]
  );

  return { groups, loading, error, approve, dismiss, reload: load };
}
