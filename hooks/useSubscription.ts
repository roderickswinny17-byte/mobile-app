import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Subscription = {
  plan: string;
  billing_cycle: "monthly" | "yearly";
  status: string;
  current_period_end: string | null;
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("plan, billing_cycle, status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSubscription(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { subscription, loading, reload: load };
}
