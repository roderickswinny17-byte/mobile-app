import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";

export type TrackedSubscription = {
  id: string;
  service_name: string;
  monthly_cost: number;
  currency: string;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  next_renewal_date: string | null;
  category: string | null;
  icon_key: string | null;
  hex: string;
  billing_url: string | null;
};

const COLUMNS =
  "id, service_name, monthly_cost, currency, billing_cycle, next_renewal_date, category, icon_key, hex, billing_url";

export function useTrackedSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<TrackedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("tracked_subscriptions")
      .select(COLUMNS)
      .order("created_at", { ascending: false });
    if (fetchError) {
      // A schema mismatch (missing column after a skipped migration, etc.)
      // fails the whole query -- without this, subscriptions silently
      // becomes [] and every screen just looks empty, with no clue why.
      console.error("useTrackedSubscriptions: fetch failed", fetchError.message);
      setError(fetchError.message);
    } else {
      setError(null);
      setSubscriptions(data ?? []);
    }
    setLoading(false);
  }, []);

  // useFocusEffect, not mount-only useEffect: Home/Subscriptions/Insights
  // stay mounted in the tab navigator, so approving a Gmail candidate or
  // editing a record on another tab would otherwise never be reflected
  // here without a full app reload.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addSubscription = async (input: Omit<TrackedSubscription, "id">) => {
    // getSession() reads the already-validated local session (no network
    // round trip); getUser() re-verifies the JWT against Supabase's Auth
    // server on every call, which is unnecessary here since RLS
    // (auth.uid() = user_id, see supabase/schema.sql) is what actually
    // enforces this insert belongs to the right user -- this id is just
    // the value being written, not the security boundary.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return { error: "Not signed in" };
    const { error } = await supabase
      .from("tracked_subscriptions")
      .insert({ ...input, user_id: session.user.id });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const updateSubscription = async (id: string, patch: Partial<Omit<TrackedSubscription, "id">>) => {
    const { error } = await supabase.from("tracked_subscriptions").update(patch).eq("id", id);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const removeSubscription = async (id: string) => {
    await supabase.from("tracked_subscriptions").delete().eq("id", id);
    await load();
  };

  return { subscriptions, loading, error, addSubscription, updateSubscription, removeSubscription, reload: load };
}
