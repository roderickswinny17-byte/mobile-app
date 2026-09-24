import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";

export type LinkedProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

// Other profiles sharing the signed-in user's own phone number (set in
// Settings) -- see public.get_linked_profiles() in supabase/schema.sql for
// why this goes through a security-definer RPC instead of a direct select.
export function useLinkedProfiles() {
  const [profiles, setProfiles] = useState<LinkedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.rpc("get_linked_profiles");
    if (fetchError) {
      console.error("useLinkedProfiles: fetch failed", fetchError.message);
      setError(fetchError.message);
    } else {
      setError(null);
      setProfiles(data ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { profiles, loading, error, reload: load };
}
