import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { formatMoney } from "@/lib/currency";
import { getUpcomingRenewals } from "@/lib/renewalReminders";
import { useThemeColors } from "@/hooks/useThemeColors";

// A persistent, always-visible companion to RenewalReminderBanner -- the
// banner only appears when something's near, this stays in the header and
// carries a red dot the rest of the time so there's always a way to check.
// Tapping it shows the exact next billing date, same shared
// getUpcomingRenewals list the banner uses -- never a separate computation.
export function RenewalBell({ subscriptions }: { subscriptions: TrackedSubscription[] }) {
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();
  const upcoming = getUpcomingRenewals(subscriptions);
  const nearest = upcoming[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
      >
        <Ionicons name="notifications-outline" size={20} color={colors.onBackground} />
        {nearest ? (
          <View className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-error" />
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="gap-3 rounded-t-2xl bg-background p-5 pb-8">
            <Text className="font-display-medium text-lg text-on-background">Next Billing Date</Text>
            {!nearest ? (
              <Text className="font-sans text-sm text-on-surface-variant">
                Nothing renewing in the next couple of days.
              </Text>
            ) : (
              upcoming.map((sub) => (
                <Pressable
                  key={sub.id}
                  onPress={() => {
                    setOpen(false);
                    router.push(`/subscriptions/${sub.id}`);
                  }}
                  className="flex-row items-center gap-3 rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-white p-1.5">
                    <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-sm text-on-surface">{sub.service_name}</Text>
                    <Text className="font-sans text-xs text-on-surface-variant">{sub.next_renewal_date}</Text>
                  </View>
                  <Text className="font-display-medium text-sm text-on-surface">
                    {formatMoney(sub.monthly_cost, sub.currency)}
                  </Text>
                </Pressable>
              ))
            )}
            <Pressable onPress={() => setOpen(false)} className="items-center rounded-lg border border-outline-variant py-3">
              <Text className="font-sans-medium text-on-surface">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
