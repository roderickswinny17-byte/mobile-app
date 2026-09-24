import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { listCachedAccounts, removeCachedAccount, type CachedAccount } from "@/lib/accountSessions";

// Instant switching between accounts you've already signed into on this
// device (see lib/accountSessions.ts + lib/supabase.ts's onAuthStateChange
// listener that keeps the cache fresh). An account not yet cached still
// needs its password once, the same way switching always worked before --
// see the fallback in Settings' handleSwitchProfile.
export function useAccountSwitcher() {
  const [cachedAccounts, setCachedAccounts] = useState<CachedAccount[]>([]);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setCachedAccounts(await listCachedAccounts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const switchTo = useCallback(async (account: CachedAccount) => {
    setSwitching(true);
    try {
      const { error } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });
      if (error) return { error: "That account's sign-in expired -- sign in again to refresh it." };
      return { error: null };
    } catch {
      return { error: "Couldn't switch accounts." };
    } finally {
      setSwitching(false);
    }
  }, []);

  const forgetAccount = useCallback(
    async (userId: string) => {
      await removeCachedAccount(userId);
      await load();
    },
    [load]
  );

  return { cachedAccounts, switching, switchTo, forgetAccount, reload: load };
}
