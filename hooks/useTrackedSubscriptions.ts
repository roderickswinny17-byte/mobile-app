import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type TrackedSubscription = {
  id: string;
  service_name: string;
  monthly_cost: number;
  billing_cycle: "monthly" | "yearly";
  next_renewal_date: string | null;
  category: string | null;
};

export function useTrackedSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<TrackedSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tracked_subscriptions")
      .select("id, service_name, monthly_cost, billing_cycle, next_renewal_date, category")
      .order("next_renewal_date", { ascending: true, nullsFirst: false });
    setSubscriptions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addSubscription = async (input: Omit<TrackedSubscription, "id">) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not signed in" };
    const { error } = await supabase
      .from("tracked_subscriptions")
      .insert({ ...input, user_id: user.id });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const removeSubscription = async (id: string) => {
    await supabase.from("tracked_subscriptions").delete().eq("id", id);
    await load();
  };

  return { subscriptions, loading, addSubscription, removeSubscription, reload: load };
}
