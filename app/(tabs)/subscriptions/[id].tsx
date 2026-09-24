import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import { useTrackedSubscriptions, type TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatMoney } from "@/lib/currency";
import { billingCycleLabel, billingCycleUnit } from "@/lib/subscriptionMath";

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, loading } = useTrackedSubscriptions();
  const colors = useThemeColors();

  const sub: TrackedSubscription | undefined = subscriptions.find((s) => s.id === id);

  // Pause/Change Plan/Cancel all open the provider's own billing page --
  // this app has no API access to Netflix's/Spotify's/etc.'s real billing,
  // so it can't actually pause or cancel anything itself. All three point
  // at the same URL since most providers don't expose a separate deep link
  // per action; the button labels are what carry the actual intent.
  const handleOpenBilling = () => {
    const url =
      sub?.billing_url ||
      `https://www.google.com/search?q=${encodeURIComponent(`${sub?.service_name ?? ""} manage subscription`)}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!sub) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="font-sans text-on-surface-variant">Subscription not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="font-sans-medium text-primary">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const infoRows: [string, string][] = [
    ["Next Payment", sub.next_renewal_date ?? "Not set"],
    ["Billing Cycle", billingCycleLabel(sub.billing_cycle)],
    ["Currency", sub.currency],
  ];

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
          <Text className="font-display text-lg text-on-background">Subscription Details</Text>
        </View>

        <View className="items-center gap-1">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-white p-4">
            <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={48} />
          </View>
          <Text className="font-display text-2xl text-on-background">{sub.service_name}</Text>
          <Text className="font-sans text-base text-on-surface-variant">
            {formatMoney(sub.monthly_cost, sub.currency)} / {billingCycleUnit(sub.billing_cycle)}
          </Text>
          {sub.category ? (
            <Text className="font-sans text-sm text-on-surface-variant/70">{sub.category}</Text>
          ) : null}
        </View>

        <Text className="font-display-medium text-lg text-on-background">Information</Text>
        <View className="divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container">
          {infoRows.map(([label, value]) => (
            <View key={label} className="flex-row items-center justify-between px-4 py-3">
              <Text className="font-sans text-xs text-on-surface-variant">{label}</Text>
              <Text className="font-sans-semibold text-xs text-on-surface">{value}</Text>
            </View>
          ))}
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="font-sans text-xs text-on-surface-variant">Status</Text>
            <Text className="rounded-full bg-tertiary-container px-2 py-1 font-sans-bold text-[10px] uppercase tracking-wide text-on-tertiary-container">
              Active
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleOpenBilling}
          className="items-center rounded-lg bg-on-background px-6 py-4"
        >
          <Text className="font-display-medium text-background">Cancel Subscription</Text>
        </Pressable>
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleOpenBilling}
            className="flex-1 items-center rounded-lg border border-outline-variant bg-surface-container px-6 py-3"
          >
            <Text className="font-sans-semibold text-sm text-on-surface">Pause</Text>
          </Pressable>
          <Pressable
            onPress={handleOpenBilling}
            className="flex-1 items-center rounded-lg border border-outline-variant bg-surface-container px-6 py-3"
          >
            <Text className="font-sans-semibold text-sm text-on-surface">Change Plan</Text>
          </Pressable>
        </View>
        <Text className="text-center font-sans text-[11px] text-on-surface-variant">
          These open {sub.service_name}&apos;s own billing page -- we don&apos;t have access to
          manage it directly.
        </Text>

        <View className="mt-2 h-px bg-outline-variant" />

        <Pressable
          onPress={() => router.push(`/subscriptions/edit/${sub.id}`)}
          className="items-center rounded-lg border border-primary px-6 py-3"
        >
          <Text className="font-display-medium text-sm text-primary">Update My Records</Text>
        </Pressable>
        <Text className="text-center font-sans text-[11px] text-on-surface-variant">
          Only changes what you see here -- not your actual {sub.service_name} plan.
        </Text>
      </View>
    </ScrollView>
  );
};

export default SubscriptionDetails;
