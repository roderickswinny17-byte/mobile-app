import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import clsx from "clsx";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useSongs, type Song } from "@/hooks/useSongs";
import type { CategoryKey } from "@/assets/constants/data";

type Props = { category: CategoryKey; label: string; emoji: string };

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export function CategorySongList({ category, label, emoji }: Props) {
  const { songs, loading, error } = useSongs(category);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);

  const handlePress = (song: Song) => {
    if (activeSongId === song.id) {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
      return;
    }
    player.replace(song.audio_url);
    player.play();
    setActiveSongId(song.id);
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="font-sans-medium text-primary">← Back</Text>
      </Pressable>
      <Text className="font-sans-bold text-2xl text-on-background">
        {emoji} {label}
      </Text>

      {loading ? (
        <ActivityIndicator className="mt-6" />
      ) : error ? (
        <Text className="mt-4 font-sans text-error">{error}</Text>
      ) : songs.length === 0 ? (
        <Text className="mt-4 font-sans text-on-surface-variant">No songs yet.</Text>
      ) : (
        <FlatList
          className="mt-6"
          data={songs}
          keyExtractor={(s) => s.id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isActive = activeSongId === item.id;
            return (
              <Pressable
                onPress={() => handlePress(item)}
                className={clsx(
                  "flex-row items-center justify-between rounded-lg border p-4",
                  isActive
                    ? "border-primary bg-primary/15"
                    : "border-outline-variant bg-surface-container"
                )}
              >
                <View className="flex-1 pr-3">
                  <Text className="font-sans-medium text-on-surface" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text
                    className="mt-0.5 font-sans text-sm text-on-surface-variant"
                    numberOfLines={1}
                  >
                    {item.artist} · {item.language}
                  </Text>
                  {isActive ? (
                    <Text className="mt-1 font-sans text-xs text-on-surface-variant">
                      {formatTime(status.currentTime ?? 0)} / {formatTime(status.duration ?? 0)}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-2xl">{isActive && status.playing ? "⏸" : "▶️"}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
