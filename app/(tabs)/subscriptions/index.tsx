import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import clsx from "clsx";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useSubscription } from "@/hooks/useSubscription";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { monthlyEquivalent, totalMonthlySpend } from "@/lib/subscriptionMath";

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

  const {
    subscriptions: tracked,
    loading: trackedLoading,
    addSubscription,
    removeSubscription,
  } = useTrackedSubscriptions();
  const [addOpen, setAddOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [cost, setCost] = useState("");
  const [trackedCycle, setTrackedCycle] = useState<BillingCycle>("monthly");
  const [addError, setAddError] = useState<string | null>(null);

  const currentPlan = subscription?.plan ?? "Normal";

  const handleAdd = async () => {
    setAddError(null);
    const parsedCost = Number(cost);
    if (!serviceName.trim() || !cost.trim() || Number.isNaN(parsedCost) || parsedCost <= 0) {
      setAddError("Enter a service name and a valid cost.");
      return;
    }
    const { error } = await addSubscription({
      service_name: serviceName.trim(),
      monthly_cost: parsedCost,
      billing_cycle: trackedCycle,
      next_renewal_date: null,
      category: null,
    });
    if (error) {
      setAddError(error);
      return;
    }
    setServiceName("");
    setCost("");
    setAddOpen(false);
  };

  return (
    <GestureDetector gesture={panGesture}>
      <ScrollView className="flex-1 bg-background">
        <View className="gap-4 px-6 pb-16 pt-16">
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
          <Pressable
            onPress={() => setCycle("monthly")}
            className={clsx(
              "flex-1 items-center rounded-lg border py-2",
              cycle === "monthly" ? "border-primary bg-primary/15" : "border-outline-variant"
            )}
          >
            <Text className="font-sans-medium text-on-surface">Monthly</Text>
          </Pressable>
          <Pressable
            onPress={() => setCycle("yearly")}
            className={clsx(
              "flex-1 items-center rounded-lg border py-2",
              cycle === "yearly" ? "border-primary bg-primary/15" : "border-outline-variant"
            )}
          >
            <Text className="font-sans-medium text-on-surface">Yearly</Text>
          </Pressable>
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
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/subscriptions/payment",
                  params: { planId: plan.id, cycle },
                })
              }
              className="mt-2 items-center rounded-lg bg-primary px-6 py-3"
            >
              <Text className="font-sans-medium text-on-primary">Upgrade</Text>
            </Pressable>
          </View>
        ))}

        <View className="mt-2 h-px bg-outline-variant" />

        <View className="flex-row items-center justify-between">
          <Text className="font-sans-bold text-lg text-on-background">Your Subscriptions</Text>
          <Pressable onPress={() => setAddOpen(true)}>
            <Text className="font-sans-medium text-primary">+ Add</Text>
          </Pressable>
        </View>
        <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
          ${totalMonthlySpend(tracked).toFixed(2)}/mo total
        </Text>

        {trackedLoading ? (
          <ActivityIndicator />
        ) : tracked.length === 0 ? (
          <Text className="font-sans text-on-surface-variant">No subscriptions tracked yet.</Text>
        ) : (
          tracked.map((sub) => (
            <Pressable
              key={sub.id}
              onLongPress={() => removeSubscription(sub.id)}
              className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <View>
                <Text className="font-sans-medium text-on-surface">{sub.service_name}</Text>
                <Text className="font-sans text-xs text-on-surface-variant">
                  {sub.billing_cycle} · hold to remove
                </Text>
              </View>
              <Text className="font-sans-bold text-on-surface">
                ${monthlyEquivalent(sub).toFixed(2)}/mo
              </Text>
            </Pressable>
          ))
        )}

        <Modal
          visible={addOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAddOpen(false)}
        >
          <Pressable
            className="flex-1 items-center justify-center bg-black/60 px-8"
            onPress={() => setAddOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full gap-3 rounded-lg bg-surface-container p-6"
            >
              <Text className="font-sans-bold text-xl text-on-surface">Add Subscription</Text>
              <TextInput
                placeholder="Service name (e.g. Netflix)"
                placeholderTextColor="#869585"
                value={serviceName}
                onChangeText={setServiceName}
                className="rounded-lg border border-outline-variant bg-surface-container-high px-4 py-3 font-sans text-on-surface"
              />
              <TextInput
                placeholder="Cost"
                placeholderTextColor="#869585"
                keyboardType="decimal-pad"
                value={cost}
                onChangeText={setCost}
                className="rounded-lg border border-outline-variant bg-surface-container-high px-4 py-3 font-sans text-on-surface"
              />
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setTrackedCycle("monthly")}
                  className={clsx(
                    "flex-1 items-center rounded-lg border py-2",
                    trackedCycle === "monthly"
                      ? "border-primary bg-primary/15"
                      : "border-outline-variant"
                  )}
                >
                  <Text className="font-sans-medium text-on-surface">Monthly</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTrackedCycle("yearly")}
                  className={clsx(
                    "flex-1 items-center rounded-lg border py-2",
                    trackedCycle === "yearly"
                      ? "border-primary bg-primary/15"
                      : "border-outline-variant"
                  )}
                >
                  <Text className="font-sans-medium text-on-surface">Yearly</Text>
                </Pressable>
              </View>
              {addError ? <Text className="font-sans text-error">{addError}</Text> : null}
              <Pressable onPress={handleAdd} className="items-center rounded-lg bg-primary px-6 py-3">
                <Text className="font-sans-medium text-on-primary">Add</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
        </View>
      </ScrollView>
    </GestureDetector>
  );
};

export default Subscriptions;
