import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { currencyFromPhoneNumber } from "@/lib/phoneCurrency";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  home_currency: string;
  home_currency_auto: boolean;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(userError?.message ?? "Not signed in.");
      setLoading(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone_number, home_currency, home_currency_auto")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Only ever auto-corrects home_currency while home_currency_auto is
    // still true -- flipped to false permanently the moment the user picks
    // a currency themselves in Settings (handleSetHomeCurrency), so this
    // can never silently override an explicit choice on a later reload.
    // Without this, every profile sits at the DB's literal 'USD' default
    // (home_currency is NOT NULL there) regardless of what currency the
    // person actually pays in.
    if (data.home_currency_auto) {
      const inferred = currencyFromPhoneNumber(data.phone_number);
      if (inferred && inferred !== data.home_currency) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ home_currency: inferred })
          .eq("id", user.id);
        if (!updateError) data.home_currency = inferred;
      }
    }

    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, error, reload: load };
}
