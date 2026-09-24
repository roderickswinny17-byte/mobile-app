import "@/global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PostHogProvider } from "posthog-react-native";
import StripeRootProvider from "@/components/StripeRootProvider";
import { useThemePreference } from "@/hooks/useThemePreference";
import {
  useFonts,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from "@expo-google-fonts/baloo-2";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";

SplashScreen.preventAutoHideAsync();

// Left unset (or still the .env.example placeholder) means analytics is
// simply skipped -- posthog.com is optional, not required for the app to
// run, so this never blocks startup the way a missing Supabase key does.
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const posthogEnabled = !!posthogApiKey && posthogApiKey !== "phc_your_actual_key";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  // Applies the persisted Dark Mode preference (see Settings) on every cold
  // start, before the first paint uses it.
  useThemePreference();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const app = (
    <StripeRootProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </StripeRootProvider>
  );

  if (!posthogEnabled) {
    return app;
  }

  return (
    <PostHogProvider
      apiKey={posthogApiKey}
      options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com" }}
    >
      {app}
    </PostHogProvider>
  );
}
