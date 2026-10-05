import { useCallback, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { AppIcon } from "@/components/AppIcon";
import { UpiAppPicker } from "@/components/UpiAppPicker";
import { useTrackedSubscriptions, type TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";
import { billingCycleLabel, billingCycleUnit } from "@/lib/subscriptionMath";
import { UPI_APPS, openUpiApp } from "@/lib/upiApps";
import { isWithinBusinessDaysBefore } from "@/lib/businessDays";

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, loading, updateSubscription } = useTrackedSubscriptions();
  const colors = useThemeColors();
  const [upiPickerOpen, setUpiPickerOpen] = useState(false);

  const sub: TrackedSubscription | undefined = subscriptions.find((s) => s.id === id);

  // Bleed's "did you still care about this" signal -- bumped on every visit
  // to this screen, not routed through updateSubscription/reload (that
  // would refetch the whole list just to record a view). Fire-and-forget:
  // this is a soft engagement signal, not something the user is waiting on.
  useFocusEffect(
    useCallback(() => {
      if (id) {
        supabase.from("tracked_subscriptions").update({ last_viewed_at: new Date().toISOString() }).eq("id", id);
      }
    }, [id])
  );

  // Android system back (nav bar / gesture) must behave like the header back
  // icon: return to the Home list instead of popping to another screen.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/home");
        return true;
      });
      return () => sub.remove();
    }, [])
  );

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

  // Autopay: this app can't check any provider's real autopay status
  // (same no-API-access limitation as Pause/Cancel/Change Plan) -- it
  // assumes the industry-standard default (on) and only flips once the
  // user confirms they've actually disabled it themselves on the
  // provider's own billing page, opened via handleOpenBilling above.
  const handleConfirmAutopayOff = async () => {
    if (sub) await updateSubscription(sub.id, { autopay_enabled: false });
  };
  const handleConfirmAutopayOn = async () => {
    if (sub) await updateSubscription(sub.id, { autopay_enabled: true });
  };

  // One tap straight to PhonePe (the most common UPI app for this) instead
  // of forcing a picker first -- "Other UPI app" below stays as the
  // fallback for GPay/Paytm/BHIM users. Still no way to land on the exact
  // mandate screen (confirmed via PhonePe's own developer docs -- their
  // "Customized Deeplink" API only opens a merchant's own checkout page,
  // nothing native), so this only removes the one avoidable extra tap.
  const phonePe = UPI_APPS.find((a) => a.key === "phonepe")!;
  const handleOpenPhonePe = () => openUpiApp(phonePe);

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
        <Pressable onPress={() => router.replace("/home")}>
          <Text className="font-sans-medium text-primary">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renewingSoon = !!sub.next_renewal_date && isWithinBusinessDaysBefore(sub.next_renewal_date, 2);

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
            onPress={() => router.replace("/home")}
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
          {infoRows.map(([label, value]) => {
            const highlight = label === "Next Payment" && renewingSoon;
            return (
              <View
                key={label}
                className={clsx(
                  "flex-row items-center justify-between px-4 py-3",
                  highlight && "bg-primary/10"
                )}
              >
                <Text className="font-sans text-xs text-on-surface-variant">{label}</Text>
                <Text
                  className={clsx(
                    "font-sans-semibold text-xs",
                    highlight ? "text-primary" : "text-on-surface"
                  )}
                >
                  {value}
                  {highlight ? ` (${formatMoney(sub.monthly_cost, sub.currency)} soon)` : ""}
                </Text>
              </View>
            );
          })}
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="font-sans text-xs text-on-surface-variant">Status</Text>
            <Text className="rounded-full bg-tertiary-container px-2 py-1 font-sans-bold text-[10px] uppercase tracking-wide text-on-tertiary-container">
              Active
            </Text>
          </View>
        </View>

        <Text className="font-display-medium text-lg text-on-background">Autopay</Text>
        <View className="gap-3 rounded-lg border border-outline-variant bg-surface-container p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-semibold text-sm text-on-surface">
              Autopay is {sub.autopay_enabled ? "on" : "off"}
            </Text>
            <View
              className={clsx(
                "rounded-full px-2.5 py-1",
                sub.autopay_enabled ? "bg-tertiary-container" : "bg-primary-container"
              )}
            >
              <Text
                className={clsx(
                  "font-sans-bold text-[10px] uppercase tracking-wide",
                  sub.autopay_enabled ? "text-on-tertiary-container" : "text-on-primary-container"
                )}
              >
                {sub.autopay_enabled ? "On" : "Off"}
              </Text>
            </View>
          </View>
          <Text className="font-sans text-[11px] text-on-surface-variant">
            {sub.autopay_enabled
              ? `We can't check this live -- most subscriptions auto-renew by default, so this reflects that typical default until you tell us otherwise.`
              : `You told us you've turned this off directly with ${sub.service_name}.`}
          </Text>
          {sub.autopay_enabled ? (
            <>
              {/* The one real action here: PhonePe (or another UPI app) is
                  what actually controls most autopay mandates, so it's the
                  primary button, not a plain billing-page redirect -- that
                  redirect is what "Cancel Subscription" below already does,
                  so a second "Disable Autopay" button that opened the same
                  page added nothing but a confusing duplicate. */}
              <Pressable
                onPress={handleOpenPhonePe}
                className="items-center rounded-lg bg-primary py-3"
              >
                <Text className="font-sans-semibold text-sm text-on-primary">Open PhonePe Autopay</Text>
              </Pressable>
              <Text className="font-sans text-[10px] text-on-surface-variant">
                Many autopay mandates are actually controlled by your UPI app, not {sub.service_name} -- once
                PhonePe opens, tap your profile icon then scroll to &quot;AutoPay&quot;.{" "}
                <Text
                  onPress={() => setUpiPickerOpen(true)}
                  className="font-sans-semibold text-on-surface-variant underline"
                >
                  Use a different UPI app
                </Text>
              </Text>
              <Pressable
                onPress={handleConfirmAutopayOff}
                className="items-center rounded-lg border border-outline-variant py-2.5"
              >
                <Text className="font-sans-semibold text-xs text-on-surface">I&apos;ve Disabled It</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleConfirmAutopayOn}
              className="items-center rounded-lg border border-outline-variant py-2.5"
            >
              <Text className="font-sans-semibold text-xs text-on-surface">Mark Autopay On Again</Text>
            </Pressable>
          )}
        </View>

        <UpiAppPicker visible={upiPickerOpen} onClose={() => setUpiPickerOpen(false)} />

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
