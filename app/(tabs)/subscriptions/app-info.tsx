import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
    planTiers: string;
  }>();
  const { addSubscription } = useTrackedSubscriptions();
  const { profile } = useProfile();
  const colors = useThemeColors();

  const basePrice = Number(params.price) || 0;
  const trialDays = Number(params.trialDays) || 0;
  const iconKey = params.icon || null;
  const tiers: { name: string; verifiedPrices?: Record<string, number> }[] | undefined = params.planTiers
    ? JSON.parse(params.planTiers)
    : undefined;
  // Middle tier by default (same starting point as before), but tracked by
  // index now instead of being assumed -- this is what the highlight below
  // actually follows when you tap a different plan.
  const defaultIndex = tiers ? Math.floor(tiers.length / 2) : 1;

  const [currency, setCurrency] = useState(profile?.home_currency ?? "USD");
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(defaultIndex);
  const [customPrice, setCustomPrice] = useState(() => {
    const initialCurrency = profile?.home_currency ?? "USD";
    const plan = derivePlans(basePrice, tiers, initialCurrency)[defaultIndex];
    return (plan.verified ? plan.price : convert(plan.price, "USD", initialCurrency)).toFixed(2);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A verified tier price (see Netflix's planTiers) is already exact in
  // `currency` -- converting it through the exchange-rate table on top
  // would corrupt a real number into an approximate one. Only an
  // unverified/illustrative price (always expressed in USD) needs that
  // conversion at all.
  const plans = derivePlans(basePrice, tiers, currency).map((plan) => ({
    ...plan,
    converted: plan.verified ? plan.price : convert(plan.price, "USD", currency),
  }));

  const handleSelectPlan = (index: number) => {
    setSelectedPlanIndex(index);
    setCustomPrice(plans[index].converted.toFixed(2));
  };

  const handleCurrencyChange = (next: string) => {
    setCurrency(next);
    // Re-derive the SELECTED tier's price under the new currency (verified
    // if this provider has one for it, illustrative-FX-converted if not),
    // rather than blindly FX-converting whatever's currently in the price
    // box -- that would silently turn a real verified number into a wrong
    // approximation the moment someone switched currency.
    const newPlan = derivePlans(basePrice, tiers, next)[selectedPlanIndex];
    setCustomPrice((newPlan.verified ? newPlan.price : convert(newPlan.price, "USD", next)).toFixed(2));
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
              onPress={() => handleSelectPlan(i)}
              className={clsx(
                "flex-row items-center justify-between rounded-lg border px-4 py-3",
                i === selectedPlanIndex ? "border-primary bg-primary/15" : "border-outline-variant bg-surface-container"
              )}
            >
              <View className="flex-row items-center gap-1.5">
                <Text className="font-sans-medium text-on-surface">{plan.name}</Text>
                {plan.verified ? (
                  <View className="flex-row items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5">
                    <Ionicons name="checkmark-circle" size={10} color="#2f9e44" />
                    <Text className="font-sans-bold text-[9px] text-success">Verified</Text>
                  </View>
                ) : null}
              </View>
              <Text className="font-display-medium text-sm text-on-surface">
                {formatMoney(plan.converted, currency)}/mo
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 font-sans text-[11px] text-on-surface-variant">
            {plans[selectedPlanIndex]?.verified
              ? "Verified from the provider's own pricing page -- not auto-updating, may drift over time."
              : "Estimated, not pulled from the provider -- use \"Check live price\" to confirm the real number."}
          </Text>
          {params.billingUrl ? (
            <Pressable onPress={() => Linking.openURL(params.billingUrl)} className="flex-row items-center gap-1 pl-2">
              <Text className="font-sans-semibold text-[11px] text-primary">Check live price</Text>
              <Ionicons name="open-outline" size={12} color={colors.onBackground} />
            </Pressable>
          ) : null}
        </View>

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
