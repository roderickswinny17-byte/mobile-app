import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import clsx from "clsx";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useProfile } from "@/hooks/useProfile";

const MOODS = [
  { key: "happy", label: "Happy", emoji: "😄" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "love", label: "Love", emoji: "❤️" },
  { key: "party", label: "Party", emoji: "🎉" },
] as const;

const Home = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile, loading, error } = useProfile();
  const [mood, setMood] = useState<string | null>(null);

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 bg-background px-6 pt-16">
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text className="font-sans text-error">{error}</Text>
        ) : (
          <>
            <Text className="font-sans-bold text-2xl text-on-background">
              Welcome {profile?.first_name} {profile?.last_name}
            </Text>
            <Text className="mt-1 font-sans text-base text-on-surface-variant">
              How&apos;s your mood?
            </Text>

            <View className="mt-6 flex-row flex-wrap gap-3">
              {MOODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMood(m.key)}
                  className={clsx(
                    "w-[47%] items-center justify-center gap-2 rounded-lg border py-6",
                    mood === m.key
                      ? "border-primary bg-primary/15"
                      : "border-outline-variant bg-surface-container"
                  )}
                >
                  <Text className="text-3xl">{m.emoji}</Text>
                  <Text className="font-sans-medium text-on-surface">{m.label}</Text>
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
