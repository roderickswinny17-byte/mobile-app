import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useSongs, type Song } from "@/hooks/useSongs";
import { MOODS, type MoodKey } from "@/lib/moods";

const SongRow = ({
  song,
  isActive,
  onPlay,
}: {
  song: Song;
  isActive: boolean;
  onPlay: (id: string) => void;
}) => {
  const player = useAudioPlayer(song.audio_url);
  const status = useAudioPlayerStatus(player);

  if (!isActive && status.playing) {
    player.pause();
  }

  return (
    <Pressable
      onPress={() => {
        onPlay(song.id);
        if (status.playing) {
          player.pause();
        } else {
          player.play();
        }
      }}
      className="flex-row items-center gap-3 rounded-lg bg-surface-container px-4 py-3"
    >
      <View className="h-11 w-11 items-center justify-center rounded-DEFAULT bg-surface-container-high">
        <Text className="text-lg">{isActive && status.playing ? "⏸" : "▶️"}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-sans-medium text-on-surface" numberOfLines={1}>
          {song.title}
        </Text>
        <Text className="font-sans text-sm text-on-surface-variant" numberOfLines={1}>
          {song.artist} · {song.language.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
};

const MoodSongs = () => {
  const { mood } = useLocalSearchParams<{ mood: MoodKey }>();
  const { songs, loading, error } = useSongs(mood);
  const [activeId, setActiveId] = useState<string | null>(null);
  const meta = MOODS.find((m) => m.key === mood);

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="font-sans-bold text-2xl text-on-background">
        {meta?.emoji} {meta?.label ?? mood} Songs
      </Text>

      {loading ? (
        <ActivityIndicator className="mt-6" />
      ) : error ? (
        <Text className="mt-4 font-sans text-error">{error}</Text>
      ) : songs.length === 0 ? (
        <Text className="mt-4 font-sans text-on-surface-variant">
          No songs in this category yet.
        </Text>
      ) : (
        <FlatList
          className="mt-4"
          data={songs}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <SongRow song={item} isActive={activeId === item.id} onPlay={setActiveId} />
          )}
        />
      )}
    </View>
  );
};

export default MoodSongs;
