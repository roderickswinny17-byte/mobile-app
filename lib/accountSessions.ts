import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedAccount = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  refreshToken: string;
};

const STORAGE_KEY = "cached-accounts-v1";

async function readAll(): Promise<CachedAccount[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeAll(accounts: CachedAccount[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

// Called whenever a session is created or its tokens rotate (see
// lib/supabase.ts's onAuthStateChange) -- refresh tokens rotate on every
// use, so a stale cached one left over from an old sign-in would fail the
// next time you switch back to that account.
export async function upsertCachedAccount(account: CachedAccount) {
  const accounts = await readAll();
  await writeAll([...accounts.filter((a) => a.userId !== account.userId), account]);
}

export async function removeCachedAccount(userId: string) {
  const accounts = await readAll();
  await writeAll(accounts.filter((a) => a.userId !== userId));
}

export async function listCachedAccounts(): Promise<CachedAccount[]> {
  return readAll();
}
