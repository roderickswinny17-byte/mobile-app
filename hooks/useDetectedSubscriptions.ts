import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { CATALOG_APPS } from "@/lib/subscriptionCatalog";

export type DetectedSubscription = {
  id: string;
  service_name: string;
  icon_key: string | null;
  guessed_amount: number | null;
  guessed_currency: string;
  guessed_billing_cycle: "monthly" | "quarterly" | "yearly";
  source_snippet: string | null;
  detected_at: string;
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
      .select("id, service_name, icon_key, guessed_amount, guessed_currency, guessed_billing_cycle, source_snippet, detected_at")
      .eq("status", "pending")
      .order("detected_at", { ascending: false });
    if (fetchError) {
      console.error("useDetectedSubscriptions: fetch failed", fetchError.message);
      setError(fetchError.message);
    } else {
      setError(null);
      // A found price means "we can see you're actually being charged for
      // this" -- those sort first so you review the confident detections
      // before the ones that need you to fill in a price manually. Newest
      // first within each group.
      const sorted = [...(data ?? [])].sort((a, b) => {
        const aHasAmount = a.guessed_amount != null ? 0 : 1;
        const bHasAmount = b.guessed_amount != null ? 0 : 1;
        return aHasAmount - bHasAmount;
      });
      // Group by service name (case-insensitive) -- Map preserves insertion
      // order, so groups inherit the same "priced first" ordering as items.
      const byService = new Map<string, DetectedGroup>();
      for (const item of sorted) {
        const key = item.service_name.trim().toLowerCase();
        const existingGroup = byService.get(key);
        if (existingGroup) existingGroup.push(item);
        else byService.set(key, [item]);
      }
      setGroups([...byService.values()]);
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
      const known = CATALOG_APPS.find((a) => a.name.toLowerCase() === primary.service_name.toLowerCase());
      const billingUrl =
        known?.billingUrl ?? `https://${primary.service_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

      const { error } = await supabase.from("tracked_subscriptions").insert({
        user_id: session.user.id,
        service_name: primary.service_name,
        monthly_cost: price, // confirmed/entered on the review card, not the raw guess
        currency, // confirmed/entered on the review card, not just the raw guess
        billing_cycle: billingCycle, // confirmed/entered on the review card, not just the raw guess
        next_renewal_date: null,
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
