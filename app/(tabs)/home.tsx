import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { CATEGORIES, CATEGORY_ROUTES } from "@/assets/constants/data";
import { ProfileBadge } from "@/components/ProfileBadge";

const Home = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile, loading, error } = useProfile();
  const { subscription } = useSubscription();

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 bg-background px-6 pt-16">
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text className="font-sans text-error">{error}</Text>
        ) : (
          <>
            <View className="flex-row items-center gap-3">
              <ProfileBadge profile={profile} plan={subscription?.plan ?? "Normal"} />
              <View className="flex-1">
                <Text className="font-sans-bold text-2xl text-on-background">
                  Welcome {profile?.first_name} {profile?.last_name}
                </Text>
                <Text className="mt-1 font-sans text-base text-on-surface-variant">
                  How&apos;s your mood?
                </Text>
              </View>
            </View>

            <View className="mt-6 flex-row flex-wrap gap-3">
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => router.push(CATEGORY_ROUTES[c.key])}
                  className="w-[47%] items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container py-6"
                >
                  <Text className="text-3xl">{c.emoji}</Text>
                  <Text className="font-sans-medium text-on-surface">{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>
    </GestureDetector>
  );
};

export default Home;
