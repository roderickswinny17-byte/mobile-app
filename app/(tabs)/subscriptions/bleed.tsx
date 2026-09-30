import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import { BleedIcon } from "@/components/BleedIcon";
import { useTrackedSubscriptions, type TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatMoney } from "@/lib/currency";
import { computeBleedScore } from "@/lib/bleedScore";

// Where BleedingSection (Home) and the Settings entry point lead: every subscription that's leaking or
// fully bleeding, worst first, with the same quick actions as the detail
// screen right at hand -- the point is making it trivially easy to act the
// moment you see the warning, not just inform you.
export default function Bleed() {
  const { subscriptions, loading, error } = useTrackedSubscriptions();
  const colors = useThemeColors();

  const scored = subscriptions
    .map((sub) => ({ sub, ...computeBleedScore({
      lastViewedAt: sub.last_viewed_at,
      createdAt: sub.created_at,
      monthlyCost: sub.monthly_cost,
    }) }))
    .filter((s) => s.tier !== "healthy")
    .sort((a, b) => b.score - a.score);

  const handleCancel = (sub: TrackedSubscription) => {
    const url =
      sub.billing_url ||
      `https://www.google.com/search?q=${encodeURIComponent(`${sub.service_name} manage subscription`)}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-6 pb-16 pt-16">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container"
          >
            <Ionicons name="arrow-back" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <BleedIcon size={22} />
            <Text className="font-display text-lg text-on-background">Bleed</Text>
          </View>
        </View>
        <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
          You&apos;re paying for things you forgot exist.
        </Text>

        {error ? (
          <Text className="font-sans text-error">Couldn&apos;t load your subscriptions: {error}</Text>
        ) : loading ? (
          <ActivityIndicator />
        ) : scored.length === 0 ? (
          <Text className="font-sans text-on-surface-variant">
            Nothing bleeding right now -- every subscription has been opened recently.
          </Text>
        ) : (
          scored.map(({ sub, tier, daysSinceLastViewed }) => (
            <View
              key={sub.id}
              className="gap-3 rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <Pressable
                onPress={() => router.push(`/subscriptions/${sub.id}`)}
                className="flex-row items-center gap-3"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-white p-2">
                  <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={26} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-sm text-on-surface">{sub.service_name}</Text>
                  <Text className="font-sans text-xs text-on-surface-variant">
                    Not opened in {daysSinceLastViewed} days
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="font-display-medium text-sm text-on-surface">
                    {formatMoney(sub.monthly_cost, sub.currency)}
                  </Text>
                  <View
                    className={
                      tier === "bleeding"
                        ? "rounded-full bg-error/15 px-2 py-0.5"
                        : "rounded-full bg-primary/15 px-2 py-0.5"
                    }
                  >
                    <Text
                      className={
                        tier === "bleeding"
                          ? "font-sans-bold text-[10px] text-error"
                          : "font-sans-bold text-[10px] text-primary"
                      }
                    >
                      {tier === "bleeding" ? "Bleeding" : "Leaking"}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => router.push(`/subscriptions/edit/${sub.id}`)}
                  className="flex-1 items-center rounded-lg border border-outline-variant py-2.5"
                >
                  <Text className="font-sans-semibold text-xs text-on-surface">Update My Records</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleCancel(sub)}
                  className="flex-1 items-center rounded-lg bg-on-background py-2.5"
                >
                  <Text className="font-sans-semibold text-xs text-background">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
