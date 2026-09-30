import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { formatMoney } from "@/lib/currency";
import { getUpcomingRenewals } from "@/lib/renewalReminders";
import { useThemeColors } from "@/hooks/useThemeColors";

// Sits on Home, above the subscription list. Only ever reads
// next_renewal_date/monthly_cost/currency that are already on the row --
// no separate price computation, so this always matches what the detail
// screen shows. Shares getUpcomingRenewals with the header bell icon, so
// both always agree on exactly which subscriptions count as "soon".
export function RenewalReminderBanner({ subscriptions }: { subscriptions: TrackedSubscription[] }) {
  const colors = useThemeColors();

  const upcoming = getUpcomingRenewals(subscriptions);
  const missingDate = subscriptions.filter((sub) => !sub.next_renewal_date);

  if (upcoming.length === 0 && missingDate.length === 0) return null;

  return (
    <View className="gap-2">
      {upcoming.length > 0 ? (
        <View className="gap-2 rounded-lg border border-primary/40 bg-primary/10 p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="notifications-outline" size={18} color={colors.onBackground} />
            <Text className="font-display-medium text-base text-on-background">Renewing soon</Text>
          </View>
          {upcoming.map((sub) => (
            <Pressable
              key={sub.id}
              onPress={() => router.push(`/subscriptions/${sub.id}`)}
              className="flex-row items-center gap-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5">
                <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={20} />
              </View>
              <Text className="flex-1 font-sans-semibold text-sm text-on-background" numberOfLines={1}>
                {sub.service_name}
              </Text>
              <Text className="font-sans text-xs text-on-surface-variant">
                {formatMoney(sub.monthly_cost, sub.currency)} on {sub.next_renewal_date}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {missingDate.length > 0 ? (
        <Text className="font-sans text-[11px] text-on-surface-variant">
          {missingDate.length} subscription{missingDate.length > 1 ? "s" : ""} have no renewal date set --
          add one via Update My Records to get a reminder.
        </Text>
      ) : null}
    </View>
  );
}
