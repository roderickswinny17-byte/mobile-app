import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text className="text-7xl font-bold text-white">Home</Text>
      <Link
        href="/onboarding"
        className="rounded-lg bg-primary px-6 py-4 font-sans-medium text-on-primary"
      >
        Go to Onboarding
      </Link>
      <Link
        href="/(auth)/sign-in"
        className="rounded-lg border border-outline-variant bg-surface-container px-6 py-4 font-sans-medium text-on-surface"
      >
        Go to Sign In
      </Link>
      <Link
        href="/(auth)/sign-up"
        className="rounded-lg border border-outline-variant bg-surface-container px-6 py-4 font-sans-medium text-on-surface"
      >
        Go to Sign Up
      </Link>
      <Link
        href="/home"
        className="rounded-lg bg-primary px-6 py-4 font-sans-medium text-on-primary"
      >
        Enter App
      </Link>

      <Link href="/subscriptions/spotify" className="font-sans text-on-surface-variant">
        Spotify Subscription
      </Link>
      <Link
        href={{
          pathname: "/subscriptions/[id]",
          params: { id: "claude" },
        }}
        className="font-sans text-on-surface-variant"
      >
        Claude Max Subscription
      </Link>
    </View>
  );
}
