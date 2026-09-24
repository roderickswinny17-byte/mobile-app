import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { CURRENCIES } from "@/lib/currency";
import { DatePickerModal } from "@/components/DatePickerModal";
import { cycleLabel, formatDateYMD, minNextPaymentDate, parseDateYMD } from "@/lib/dateMath";

const CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

// Editing here only ever changes YOUR tracked record -- it has no effect on
// the real subscription at the provider. See screen-detail's "These open
// [service]'s own billing page" note for where the real actions live.
export default function EditSubscription() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateSubscription, removeSubscription } = useTrackedSubscriptions();
  const colors = useThemeColors();
  const sub = subscriptions.find((s) => s.id === id);

  const [price, setPrice] = useState(String(sub?.monthly_cost ?? ""));
  const [currency, setCurrency] = useState(sub?.currency ?? "USD");
  const [cycle, setCycle] = useState<(typeof CYCLES)[number]["value"]>(sub?.billing_cycle ?? "monthly");
  const [nextPayment, setNextPayment] = useState(sub?.next_renewal_date ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  if (!sub) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-sans text-on-surface-variant">Subscription not found.</Text>
      </View>
    );
  }

  // Recomputed from `cycle` on every render (not memoized) -- it's a few
  // Date operations, cheap enough that memoizing would be overkill, and
  // this keeps it trivially correct if the user changes the billing cycle
  // after already having picked a date.
  const minDate = minNextPaymentDate(cycle);

  const handleSave = async () => {
    setError(null);
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Enter a valid price.");
      return;
    }
    if (nextPayment) {
      const parsedDate = parseDateYMD(nextPayment);
      if (!parsedDate || parsedDate < minDate) {
        setError(
          `Next payment can't be before ${formatDateYMD(minDate)} for a ${cycleLabel(cycle)} plan.`
        );
        return;
      }
    }
    setSaving(true);
    const { error: updateError } = await updateSubscription(sub.id, {
      monthly_cost: parsedPrice,
      currency,
      billing_cycle: cycle,
      next_renewal_date: nextPayment || null,
    });
    setSaving(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    router.back();
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove from My List",
      `This only removes ${sub.service_name} from what you're tracking here -- it doesn't cancel or change anything with ${sub.service_name} itself.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemoving(true);
            await removeSubscription(sub.id);
            router.dismissTo("/subscriptions");
          },
        },
      ]
    );
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
          <Text className="font-display text-lg text-on-background">Update My Records</Text>
        </View>
        <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
          {sub.service_name} -- only changes what you see here, not your real plan.
        </Text>

        <Text className="font-display-medium text-base text-on-background">Price</Text>
        <View className="flex-row items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 py-3">
          <TextInput
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            style={{ color: colors.onBackground }}
            className="flex-1 font-display-medium text-lg"
          />
        </View>

        <Text className="font-display-medium text-base text-on-background">Currency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {CURRENCIES.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => setCurrency(c.code)}
                className={clsx(
                  "items-center rounded-lg border px-3 py-2",
                  currency === c.code ? "border-primary bg-primary/15" : "border-outline-variant"
                )}
              >
                <Text className="font-sans-medium text-on-surface">{c.code}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text className="font-display-medium text-base text-on-background">Billing Cycle</Text>
        <View className="flex-row gap-2">
          {CYCLES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCycle(c.value)}
              className={clsx(
                "flex-1 items-center rounded-lg border py-2",
                cycle === c.value ? "border-primary bg-primary/15" : "border-outline-variant"
              )}
            >
              <Text className="font-sans-medium text-on-surface">{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="font-display-medium text-base text-on-background">Next Payment</Text>
        <Pressable
          onPress={() => setDatePickerOpen(true)}
          className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
        >
          <Text
            className="font-sans"
            style={{ color: nextPayment ? colors.onBackground : colors.onSurfaceVariant }}
          >
            {nextPayment || "Select a date"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
        <Text className="-mt-2 font-sans text-xs text-on-surface-variant">
          Earliest selectable date for a {cycleLabel(cycle)} plan: {formatDateYMD(minDate)}.
        </Text>

        <DatePickerModal
          visible={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          value={nextPayment}
          minDate={minDate}
          onSelect={(dateString) => {
            setNextPayment(dateString);
            setDatePickerOpen(false);
          }}
        />

        {error ? <Text className="font-sans text-error">{error}</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-display-medium text-on-primary">Save Changes</Text>
          )}
        </Pressable>

        <View className="mt-2 h-px bg-outline-variant" />

        <Pressable
          onPress={handleRemove}
          disabled={removing}
          className="items-center rounded-lg border border-error px-6 py-3"
        >
          {removing ? (
            <ActivityIndicator color={colors.onSurfaceVariant} />
          ) : (
            <Text className="font-sans-semibold text-sm text-error">Remove from My List</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
