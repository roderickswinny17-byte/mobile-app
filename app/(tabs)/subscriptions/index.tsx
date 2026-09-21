import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import clsx from "clsx";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useSubscription } from "@/hooks/useSubscription";

type BillingCycle = "monthly" | "yearly";

const PLANS = [
  {
    id: "subscription-a",
    name: "Subscription A",
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    perks: ["Unlimited entries", "Priority support", "Early access to new features"],
  },
] as const;

const Subscriptions = () => {
  const panGesture = useSwipeTabNavigation();
  const { subscription, loading } = useSubscription();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const currentPlan = subscription?.plan ?? "Normal";

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 gap-4 bg-background px-6 pt-16">
        <Text className="font-sans-bold text-2xl text-on-background">Subscription</Text>

        <View className="rounded-lg border border-outline-variant bg-surface-container p-4">
          <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
            Current Plan
          </Text>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="mt-1 font-sans-bold text-lg text-on-surface">{currentPlan}</Text>
          )}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setCycle("monthly")}
            className={clsx(
              "flex-1 items-center rounded-lg border py-2",
              cycle === "monthly" ? "border-primary bg-primary/15" : "border-outline-variant"
            )}
          >
            <Text className="font-sans-medium text-on-surface">Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCycle("yearly")}
            className={clsx(
              "flex-1 items-center rounded-lg border py-2",
              cycle === "yearly" ? "border-primary bg-primary/15" : "border-outline-variant"
            )}
          >
            <Text className="font-sans-medium text-on-surface">Yearly</Text>
          </TouchableOpacity>
        </View>

        {PLANS.map((plan) => (
          <View
            key={plan.id}
            className="gap-2 rounded-lg border border-outline-variant bg-surface-container p-4"
          >
            <Text className="font-sans-bold text-lg text-on-surface">{plan.name}</Text>
            <Text className="font-sans text-2xl text-primary">
              ${cycle === "monthly" ? plan.monthlyPrice.toFixed(2) : plan.yearlyPrice.toFixed(2)}
              <Text className="font-sans text-sm text-on-surface-variant">
                {" "}
                / {cycle === "monthly" ? "month" : "year"}
              </Text>
            </Text>
            {plan.perks.map((perk) => (
              <Text key={perk} className="font-sans text-sm text-on-surface-variant">
                • {perk}
              </Text>
            ))}
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/subscriptions/payment",
                  params: { planId: plan.id, cycle },
                })
              }
              className="mt-2 items-center rounded-lg bg-primary px-6 py-3"
            >
              <Text className="font-sans-medium text-on-primary">Upgrade</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </GestureDetector>
  );
};

export default Subscriptions;
