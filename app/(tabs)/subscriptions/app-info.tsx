import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { AppIcon } from "@/components/AppIcon";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { useProfile } from "@/hooks/useProfile";
import { useThemeColors } from "@/hooks/useThemeColors";
import { derivePlans } from "@/lib/subscriptionCatalog";
import { CURRENCIES, convert, formatMoney } from "@/lib/currency";

// Shown after picking a search result on the Add Subscription screen,
// before it's actually saved -- plan tiers + trial info (sample data, see
// the disclaimer below) and an always-editable "Your Price" field, since no
// free API can return real current pricing for an arbitrary company.
export default function AppInfo() {
  const params = useLocalSearchParams<{
    name: string;
    category: string;
    icon: string;
    price: string;
    trialDays: string;
    hex: string;
    billingUrl: string;
  }>();
  const { addSubscription } = useTrackedSubscriptions();
  const { profile } = useProfile();
  const colors = useThemeColors();

  const basePrice = Number(params.price) || 0;
  const trialDays = Number(params.trialDays) || 0;
  const iconKey = params.icon || null;

  const [currency, setCurrency] = useState(profile?.home_currency ?? "USD");
  const [customPrice, setCustomPrice] = useState(() =>
    convert(derivePlans(basePrice)[1].price, "USD", profile?.home_currency ?? "USD").toFixed(2)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = derivePlans(basePrice).map((plan) => ({
    ...plan,
    converted: convert(plan.price, "USD", currency),
  }));

  const handleCurrencyChange = (next: string) => {
    const currentVal = parseFloat(customPrice) || 0;
    setCustomPrice(convert(currentVal, currency, next).toFixed(2));
    setCurrency(next);
  };

  const handleConfirm = async () => {
    setError(null);
    const price = parseFloat(customPrice);
    if (Number.isNaN(price) || price <= 0) {
      setError("Enter a valid price.");
      return;
    }
    setSaving(true);
    const { error: addError } = await addSubscription({
      service_name: params.name,
      monthly_cost: price,
      currency,
      billing_cycle: "monthly",
      next_renewal_date: null,
      category: params.category || null,
      icon_key: iconKey,
      hex: params.hex || "#DCD3F3",
      billing_url: params.billingUrl || null,
    });
    setSaving(false);
    if (addError) {
      setError(addError);
      return;
    }
    router.back();
    router.back(); // App Info -> Add Subscription -> wherever "+" was opened from
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
          <Text className="font-display text-lg text-on-background">App Info</Text>
        </View>

        <View className="items-center gap-2">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-white p-4">
            <AppIcon iconKey={iconKey} name={params.name} size={48} />
          </View>
          <Text className="font-display text-2xl text-on-background">{params.name}</Text>
          <Text className="font-sans text-sm text-on-surface-variant">{params.category}</Text>
        </View>

        <View className="flex-row items-center gap-2 rounded-lg border border-outline-variant bg-secondary-container px-4 py-3">
          <Ionicons name="gift-outline" size={18} color={colors.onBackground} />
          <Text className="flex-1 font-sans-semibold text-xs text-on-background">
            {trialDays > 0
              ? `${trialDays}-day free trial, then billed automatically`
              : "No free trial for this app -- billed immediately"}
          </Text>
        </View>

        <Text className="font-display-medium text-lg text-on-background">Available Plans</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
          <View className="flex-row gap-2">
            {CURRENCIES.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => handleCurrencyChange(c.code)}
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

        <View className="gap-2">
          {plans.map((plan, i) => (
            <Pressable
              key={plan.name}
              onPress={() => setCustomPrice(plan.converted.toFixed(2))}
              className={clsx(
                "flex-row items-center justify-between rounded-lg border px-4 py-3",
                i === 1 ? "border-primary bg-primary/15" : "border-outline-variant bg-surface-container"
              )}
            >
              <Text className="font-sans-medium text-on-surface">{plan.name}</Text>
              <Text className="font-display-medium text-sm text-on-surface">
                {formatMoney(plan.converted, currency)}/mo
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="font-sans text-[11px] text-on-surface-variant">
          Sample plan data for this reference -- not live pricing pulled from the provider.
        </Text>

        <Text className="font-display-medium text-lg text-on-background">Your Price</Text>
        <Text className="-mt-2 font-sans text-xs text-on-surface-variant">
          Paying a different amount than any plan above? Enter exactly what you&apos;re billed.
        </Text>
        <View className="flex-row items-center gap-2 rounded-lg border-2 border-primary bg-surface-container px-4 py-3">
          <TextInput
            keyboardType="decimal-pad"
            value={customPrice}
            onChangeText={setCustomPrice}
            placeholder="0.00"
            placeholderTextColor={colors.onSurfaceVariant}
            className="flex-1 font-display-medium text-xl"
            style={{ color: colors.onBackground }}
          />
          <Text className="font-sans text-xs text-on-surface-variant">/mo</Text>
        </View>

        {error ? <Text className="font-sans text-error">{error}</Text> : null}

        <Pressable
          onPress={handleConfirm}
          disabled={saving}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-display-medium text-on-primary">Add Subscription</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
