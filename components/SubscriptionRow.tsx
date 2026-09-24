import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/AppIcon";
import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { formatMoney } from "@/lib/currency";
import { billingCycleLabel } from "@/lib/subscriptionMath";

// Matches design-preview/subscriptions-reference.html's colored rows
// (sub.hex) exactly. That background is always a light pastel regardless of
// the app's light/dark mode -- unlike surrounding UI, its text stays a
// fixed dark color (not the on-surface token, which flips to light in dark
// mode and would go nearly invisible on these tiles) so it reads correctly
// in both themes.
export function SubscriptionRow({ sub }: { sub: TrackedSubscription }) {
  return (
    <Pressable
      onPress={() => router.push(`/subscriptions/${sub.id}`)}
      className="flex-row items-center justify-between rounded-xl p-4"
      style={{ backgroundColor: sub.hex }}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-white p-2">
          <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={26} />
        </View>
        <View>
          <Text className="font-sans-bold text-sm" style={{ color: "#1E1B16" }}>
            {sub.service_name}
          </Text>
          <Text className="font-sans text-xs" style={{ color: "#1E1B1699" }}>
            {sub.category ? `${sub.category} · ` : ""}
            {sub.billing_cycle}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="font-display-medium text-sm" style={{ color: "#1E1B16" }}>
          {formatMoney(sub.monthly_cost, sub.currency)}
        </Text>
        <Text className="font-sans text-xs" style={{ color: "#1E1B1699" }}>
          {billingCycleLabel(sub.billing_cycle)}
        </Text>
      </View>
    </Pressable>
  );
}
