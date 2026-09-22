import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { MOODS } from "@/lib/moods";

const Home = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile, loading, error } = useProfile();
  const { subscription } = useSubscription();
  const [profileOpen, setProfileOpen] = useState(false);

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
              <Pressable
                onPress={() => setProfileOpen(true)}
                className="h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/20"
              >
                <Text className="font-sans-bold text-lg text-primary">
                  {profile?.first_name?.[0]?.toUpperCase()}
                  {profile?.last_name?.[0]?.toUpperCase()}
                </Text>
              </Pressable>
              <View>
                <Text className="font-sans-bold text-2xl text-on-background">
                  Welcome {profile?.first_name} {profile?.last_name}
                </Text>
                <Text className="font-sans text-base text-on-surface-variant">
                  How&apos;s your mood?
                </Text>
              </View>
            </View>

            <View className="mt-6 flex-row flex-wrap gap-3">
              {MOODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() =>
                    router.push({ pathname: "/songs/[mood]", params: { mood: m.key } })
                  }
                  className="w-[47%] items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container py-6"
                >
                  <Text className="text-3xl">{m.emoji}</Text>
                  <Text className="font-sans-medium text-on-surface">{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Modal
          visible={profileOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileOpen(false)}
        >
          <Pressable
            className="flex-1 items-center justify-center bg-black/60 px-8"
            onPress={() => setProfileOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full gap-3 rounded-lg bg-surface-container p-6"
            >
              <Text className="font-sans-bold text-xl text-on-surface">
                {profile?.first_name} {profile?.last_name}
              </Text>
              <View className="gap-1">
                <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
                  Email
                </Text>
                <Text className="font-sans text-on-surface">{profile?.email}</Text>
              </View>
              <View className="gap-1">
                <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
                  Phone
                </Text>
                <Text className="font-sans text-on-surface">
                  {profile?.phone_number || "Not set"}
                </Text>
              </View>
              <View className="gap-1">
                <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
                  Plan
                </Text>
                <Text className="font-sans text-on-surface">{subscription?.plan ?? "Normal"}</Text>
              </View>
              <Pressable
                onPress={() => setProfileOpen(false)}
                className="mt-2 items-center rounded-lg bg-primary px-6 py-3"
              >
                <Text className="font-sans-medium text-on-primary">Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </GestureDetector>
  );
};

export default Home;
