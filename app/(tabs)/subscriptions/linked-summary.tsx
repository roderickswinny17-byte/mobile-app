import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import { useLinkedSubscriptions } from "@/hooks/useLinkedSubscriptions";
import { useProfile } from "@/hooks/useProfile";
import { useThemeColors } from "@/hooks/useThemeColors";
import { convert, formatMoney } from "@/lib/currency";
import { monthlyEquivalent } from "@/lib/subscriptionMath";

// Read-only: what each of the user's linked profiles (same phone number,
// see Settings -> Profiles) is subscribed to, without switching to that
// profile / re-authenticating. Rows aren't tappable -- they belong to a
// different account's session, so there's no detail screen to open here.
export default function LinkedSummary() {
  const { profiles, loading, error } = useLinkedSubscriptions();
  const { profile } = useProfile();
  const colors = useThemeColors();
  const homeCurrency = profile?.home_currency ?? "USD";

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
          <Text className="font-display text-lg text-on-background">All Linked Subscriptions</Text>
        </View>
        <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
          Every subscription across your linked emails, in one place.
        </Text>

        {error ? (
          <Text className="font-sans text-error">Couldn&apos;t load linked subscriptions: {error}</Text>
        ) : loading ? (
          <ActivityIndicator />
        ) : profiles.length === 0 ? (
          <Text className="font-sans text-on-surface-variant">
            No linked profiles with subscriptions yet.
          </Text>
        ) : (
          profiles.map((p) => {
            const total = p.subscriptions.reduce((sum, s) => sum + convert(monthlyEquivalent(s), s.currency, homeCurrency), 0);
            return (
              <View key={p.profileId} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-display-medium text-base text-on-background">
                      {p.name}
                    </Text>
                    <Text className="font-sans text-xs text-on-surface-variant">{p.email}</Text>
                  </View>
                  <Text className="font-display-medium text-sm text-on-surface-variant">
                    {formatMoney(total, homeCurrency)}/mo
                  </Text>
                </View>

                {p.subscriptions.length === 0 ? (
                  <Text className="font-sans text-xs text-on-surface-variant">
                    No subscriptions tracked.
                  </Text>
                ) : (
                  p.subscriptions.map((s) => (
                    <View
                      key={s.subscription_id}
                      className="flex-row items-center justify-between rounded-xl p-3"
                      style={{ backgroundColor: s.hex }}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5">
                          <AppIcon iconKey={s.icon_key} name={s.service_name} size={22} />
                        </View>
                        <Text className="font-sans-bold text-sm" style={{ color: "#1E1B16" }}>
                          {s.service_name}
                        </Text>
                      </View>
                      <Text className="font-display-medium text-sm" style={{ color: "#1E1B16" }}>
                        {formatMoney(s.monthly_cost, s.currency)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
