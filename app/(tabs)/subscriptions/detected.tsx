import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { AppIcon } from "@/components/AppIcon";
import { useDetectedSubscriptions, type DetectedGroup } from "@/hooks/useDetectedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { CURRENCIES } from "@/lib/currency";

const CYCLES: { key: "monthly" | "quarterly" | "yearly"; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

// Review queue for gmail-scan-subscriptions' guesses -- nothing here has
// touched the real subscription list yet, see useDetectedSubscriptions.
// One card per service (see DetectedGroup) -- several receipt/notice emails
// for the same service show as one card with a count badge, not duplicates.
export default function DetectedSubscriptions() {
  const { groups, loading, error: fetchError, approve, dismiss } = useDetectedSubscriptions();
  const colors = useThemeColors();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [currencies, setCurrencies] = useState<Record<string, string>>({});
  const [cycles, setCycles] = useState<Record<string, "monthly" | "quarterly" | "yearly">>({});

  // No pre-seeding effect needed: each card just falls back to the scan's
  // guess until the user actually types something, both here and in the
  // TextInput's value below -- avoids writing state during an effect
  // purely to mirror props, which the React Compiler flags. Keyed by the
  // group's primary (best) item, same id used for the card's `key`.
  const priceFor = (group: DetectedGroup) => {
    const primary = group[0];
    return prices[primary.id] ?? (primary.guessed_amount != null ? String(primary.guessed_amount) : "");
  };
  const currencyFor = (group: DetectedGroup) => currencies[group[0].id] ?? group[0].guessed_currency;
  const cycleFor = (group: DetectedGroup) => cycles[group[0].id] ?? group[0].guessed_billing_cycle;

  const handleApprove = async (group: DetectedGroup) => {
    const primary = group[0];
    const price = parseFloat(priceFor(group));
    if (Number.isNaN(price) || price <= 0) {
      setError(`Enter ${primary.service_name}'s actual price before adding.`);
      return;
    }
    setError(null);
    setBusyId(primary.id);
    const { error: approveError, skipped } = await approve(group, price, currencyFor(group), cycleFor(group));
    setBusyId(null);
    if (approveError) setError(approveError);
    else if (skipped) setError(`${primary.service_name} is already in your list -- didn't add a duplicate.`);
  };

  const handleDismiss = async (group: DetectedGroup) => {
    setBusyId(group[0].id);
    await dismiss(group);
    setBusyId(null);
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
          <Text className="font-display text-lg text-on-background">Found in Gmail</Text>
        </View>
        <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
          Guessed from receipt emails -- the amount and even the service name can be wrong, so
          nothing is added until you confirm it.
        </Text>
        {error ? <Text className="font-sans text-sm text-error">{error}</Text> : null}

        {fetchError ? (
          <Text className="font-sans text-sm text-error">Couldn&apos;t load: {fetchError}</Text>
        ) : loading ? (
          <ActivityIndicator />
        ) : groups.length === 0 ? (
          <Text className="font-sans text-on-surface-variant">
            Nothing pending. Run a scan from Profile -&gt; Connect Gmail to look again.
          </Text>
        ) : (
          groups.map((group) => {
            const primary = group[0];
            return (
              <View
                key={primary.id}
                className="gap-3 rounded-lg border border-outline-variant bg-surface-container p-4"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-white p-1.5">
                    <AppIcon iconKey={primary.icon_key} name={primary.service_name} size={26} />
                  </View>
                  <Text className="flex-1 font-sans-medium text-sm text-on-surface">
                    {primary.service_name}
                  </Text>
                  {group.length > 1 ? (
                    <View className="h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
                      <Text className="font-sans-bold text-[11px] text-on-primary">×{group.length}</Text>
                    </View>
                  ) : null}
                </View>
                {group.length > 1 ? (
                  <Text className="-mt-2 font-sans text-[11px] text-on-surface-variant">
                    {group.length} emails from {primary.service_name} -- adding this counts as one
                    subscription.
                  </Text>
                ) : null}

                <View className="flex-row items-center gap-2 rounded-lg border border-outline-variant bg-background px-3 py-2">
                  <TextInput
                    keyboardType="decimal-pad"
                    placeholder={primary.guessed_amount != null ? undefined : "Enter the real amount"}
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={priceFor(group)}
                    onChangeText={(text) => setPrices((prev) => ({ ...prev, [primary.id]: text }))}
                    style={{ color: colors.onBackground }}
                    className="flex-1 font-display-medium text-sm"
                  />
                  <Text className="font-sans text-xs text-on-surface-variant">/mo</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-1.5">
                    {CURRENCIES.map((c) => (
                      <Pressable
                        key={c.code}
                        onPress={() => setCurrencies((prev) => ({ ...prev, [primary.id]: c.code }))}
                        className={clsx(
                          "rounded-full border px-2.5 py-1",
                          currencyFor(group) === c.code
                            ? "border-primary bg-primary/15"
                            : "border-outline-variant"
                        )}
                      >
                        <Text className="font-sans-medium text-[11px] text-on-surface">{c.code}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <View className="flex-row gap-1.5">
                  {CYCLES.map((c) => (
                    <Pressable
                      key={c.key}
                      onPress={() => setCycles((prev) => ({ ...prev, [primary.id]: c.key }))}
                      className={clsx(
                        "flex-1 items-center rounded-full border px-2.5 py-1.5",
                        cycleFor(group) === c.key
                          ? "border-primary bg-primary/15"
                          : "border-outline-variant"
                      )}
                    >
                      <Text className="font-sans-medium text-[11px] text-on-surface">{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {primary.guessed_amount == null ? (
                  <Text className="font-sans text-[11px] text-on-surface-variant">
                    Couldn&apos;t find a price in this email -- enter what you&apos;re actually charged.
                  </Text>
                ) : null}

                {primary.source_snippet ? (
                  <Text className="font-sans text-xs text-on-surface-variant" numberOfLines={2}>
                    &quot;{primary.source_snippet}&quot;
                  </Text>
                ) : null}
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleDismiss(group)}
                    disabled={busyId === primary.id}
                    className="flex-1 items-center rounded-lg border border-outline-variant py-3"
                  >
                    <Text className="font-sans-semibold text-sm text-on-surface">Dismiss</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApprove(group)}
                    disabled={busyId === primary.id}
                    className="flex-1 items-center rounded-lg bg-primary py-3"
                  >
                    {busyId === primary.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="font-display-medium text-on-primary">Add</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
