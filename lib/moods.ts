export type MoodKey = "happy" | "sad" | "love" | "party";

export const MOODS: { key: MoodKey; label: string; emoji: string }[] = [
  { key: "happy", label: "Happy", emoji: "😄" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "love", label: "Love", emoji: "❤️" },
  { key: "party", label: "Party", emoji: "🎉" },
];
