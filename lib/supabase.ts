import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { upsertCachedAccount } from "./accountSessions";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project's values."
  );
}

// expo-router's web static export ("output": "static" in app.json) renders
// every route once in Node before any browser exists, so `window` -- and
// therefore AsyncStorage's web/localStorage backing -- isn't available yet.
// Native (iOS/Android) and an actual browser both define `window`, so this
// only swaps in a no-op during that Node prerender pass.
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window === "undefined" ? noopStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keeps the local multi-account directory (see accountSessions.ts / the
// account switcher in Settings) up to date with whichever session is
// currently live -- including TOKEN_REFRESHED, since refresh tokens rotate
// on every use and a stale cached one would fail the next time you switch
// back to this account.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) return;
    if (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED" && event !== "INITIAL_SESSION") return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", session.user.id)
      .single();
    if (!profile) return;
    await upsertCachedAccount({
      userId: session.user.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  });
}
