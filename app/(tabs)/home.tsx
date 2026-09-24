import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useProfile } from "@/hooks/useProfile";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { SubscriptionRow } from "@/components/SubscriptionRow";
import { AppIcon } from "@/components/AppIcon";
import { formatMoney } from "@/lib/currency";

const Home = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile, loading: profileLoading } = useProfile();
  const { subscriptions, loading, error, reload } = useTrackedSubscriptions();
  const colors = useThemeColors();

  // Tab screens stay mounted when navigating to the Add Subscription modal
  // and back, so the list needs an explicit refresh on refocus rather than
  // relying on a mount-only effect.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const upcoming = subscriptions.slice(0, 3);
  const initial = (profile?.first_name?.charAt(0) ?? "?").toUpperCase();

  return (
    <GestureDetector gesture={panGesture}>
      <FlatList
        className="flex-1 bg-background"
        contentContainerStyle={{ gap: 12, paddingHorizontal: 24, paddingBottom: 112, paddingTop: 64 }}
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SubscriptionRow sub={item} />}
        ListHeaderComponent={
          <View className="gap-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-on-background">
                  <Text className="font-display-medium text-lg text-background">
                    {profileLoading ? "" : initial}
                  </Text>
                </View>
                <Text className="font-display text-xl text-on-background">
                  {profile?.first_name ?? ""}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/subscriptions/add")}
                className="h-10 w-10 items-center justify-center rounded-full bg-on-background active:opacity-80"
              >
                <Ionicons name="add" size={22} color={colors.background} />
              </Pressable>
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-display-medium text-xl text-on-background">Upcoming</Text>
                <View className="rounded-full border border-outline-variant px-4 py-1.5">
                  <Text className="font-sans-semibold text-xs text-on-surface-variant">View all</Text>
                </View>
              </View>
              {upcoming.length === 0 ? (
                <Text className="font-sans text-on-surface-variant">Nothing added yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-3">
                    {upcoming.map((sub) => (
                      <Pressable
                        key={sub.id}
                        onPress={() => router.push(`/subscriptions/${sub.id}`)}
                        className="w-32 gap-2 rounded-xl border border-outline-variant bg-surface-container p-3"
                      >
                        <View className="h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-white p-1.5">
                          <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={22} />
                        </View>
                        <Text className="font-display-medium text-base text-on-surface">
                          {formatMoney(sub.monthly_cost, sub.currency)}
                        </Text>
                        <Text className="font-sans text-[11px] text-on-surface-variant">renews soon</Text>
                        <Text className="font-sans-semibold text-xs text-on-surface" numberOfLines={1}>
                          {sub.service_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="font-display-medium text-xl text-on-background">
                All Subscriptions
              </Text>
              <Pressable
                onPress={() => router.push("/subscriptions")}
                className="rounded-full border border-outline-variant px-4 py-1.5"
              >
                <Text className="font-sans-semibold text-xs text-on-surface-variant">View all</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text className="font-sans text-error">Couldn&apos;t load your subscriptions: {error}</Text>
          ) : loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="font-sans text-on-surface-variant">No subscriptions tracked yet.</Text>
          )
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
      />
    </GestureDetector>
  );
};

export default Home;
