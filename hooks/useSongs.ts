import { useMemo } from "react";
import { SONGS, type Song } from "@/lib/songs";
import type { MoodKey } from "@/lib/moods";

export type { Song };

// Reads from the local placeholder catalog (lib/songs.ts) for now, not the
// Supabase `songs` table -- see that file for how to switch back once
// there's real seeded content. Keeps the same { songs, loading, error }
// shape either way, so callers don't need to change.
export function useSongs(mood: MoodKey) {
  const songs = useMemo(() => SONGS.filter((song) => song.mood === mood), [mood]);
  return { songs, loading: false, error: null };
}
