import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";

// The real entry point: send a signed-in device straight to the app, and
// everyone else to Sign In. Replaces the old dev-nav scratch screen (manual
// "Go to Sign In" / "Enter App" links), which is how the app used to end up
// on /home without a session and hit "Auth session missing!".
export default function Index() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={signedIn ? "/home" : "/(auth)/sign-in"} />;
}
