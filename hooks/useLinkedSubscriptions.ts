import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";

type LinkedSubscriptionRow = {
  profile_id: string;
  profile_name: string;
  profile_email: string;
  subscription_id: string;
  service_name: string;
  monthly_cost: number;
  currency: string;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  category: string | null;
  icon_key: string | null;
  hex: string;
};

export type LinkedProfileSubscriptions = {
  profileId: string;
  name: string;
  email: string;
  subscriptions: Omit<LinkedSubscriptionRow, "profile_id" | "profile_name" | "profile_email">[];
};

// One row per (linked profile, subscription) from get_linked_subscriptions()
// (see schema.sql), grouped client-side into one entry per profile so the
// summary screen can render "this email has these subscriptions" sections.
export function useLinkedSubscriptions() {
  const [profiles, setProfiles] = useState<LinkedProfileSubscriptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.rpc("get_linked_subscriptions");
    if (fetchError) {
      console.error("useLinkedSubscriptions: fetch failed", fetchError.message);
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setError(null);
    const rows: LinkedSubscriptionRow[] = data ?? [];

    const byProfile = new Map<string, LinkedProfileSubscriptions>();
    for (const row of rows) {
      if (!byProfile.has(row.profile_id)) {
        byProfile.set(row.profile_id, {
          profileId: row.profile_id,
          name: row.profile_name,
          email: row.profile_email,
          subscriptions: [],
        });
      }
      byProfile.get(row.profile_id)!.subscriptions.push({
        subscription_id: row.subscription_id,
        service_name: row.service_name,
        monthly_cost: row.monthly_cost,
        currency: row.currency,
        billing_cycle: row.billing_cycle,
        category: row.category,
        icon_key: row.icon_key,
        hex: row.hex,
      });
    }

    setProfiles([...byProfile.values()]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { profiles, loading, error, reload: load };
}
