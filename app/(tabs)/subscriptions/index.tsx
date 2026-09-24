import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { useProfile } from "@/hooks/useProfile";
import { useThemeColors } from "@/hooks/useThemeColors";
import { SubscriptionRow } from "@/components/SubscriptionRow";
import { totalMonthlySpend } from "@/lib/subscriptionMath";
import { formatMoney } from "@/lib/currency";

const Subscriptions = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile } = useProfile();
  const { subscriptions, loading, error, reload } = useTrackedSubscriptions();
  const [query, setQuery] = useState("");
  const colors = useThemeColors();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const homeCurrency = profile?.home_currency ?? "USD";
  const filtered = subscriptions.filter((s) =>
    s.service_name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <GestureDetector gesture={panGesture}>
      <FlatList
        className="flex-1 bg-background"
        contentContainerStyle={{ gap: 12, paddingHorizontal: 24, paddingBottom: 112, paddingTop: 64 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SubscriptionRow sub={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-2xl text-on-background">Subscriptions</Text>
              <Pressable
                onPress={() => router.push("/subscriptions/add")}
                className="h-10 w-10 items-center justify-center rounded-full bg-on-background active:opacity-80"
              >
                <Ionicons name="add" size={22} color={colors.background} />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-3">
              <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                placeholder="Search subscriptions..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={query}
                onChangeText={setQuery}
                className="flex-1 font-sans text-sm text-on-surface"
              />
            </View>
            <Text className="font-sans text-sm text-on-surface-variant">
              {formatMoney(totalMonthlySpend(subscriptions, homeCurrency), homeCurrency)}/mo total
            </Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text className="font-sans text-error">Couldn&apos;t load your subscriptions: {error}</Text>
          ) : loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="font-sans text-on-surface-variant">
              {query ? "No matches." : "No subscriptions tracked yet."}
            </Text>
          )
        }
      />
    </GestureDetector>
  );
};

export default Subscriptions;
