import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";

// Landing screen for mobileapp://oauth-callback. The real handling of this
// redirect happens inside useEmailConnection's WebBrowser.openAuthSessionAsync
// call, which intercepts it before the OS actually navigates the app here --
// but that interception isn't guaranteed on every platform/timing, and
// without a real route here expo-router shows an "Unmatched Route" 404 if it
// ever does land. This just bounces back to Profile either way.
export default function OAuthCallback() {
  useEffect(() => {
    const timeout = setTimeout(() => router.replace("/settings"), 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <ActivityIndicator />
      <Text className="font-sans text-sm text-on-surface-variant">Finishing up...</Text>
    </View>
  );
}
