import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MoodKey } from "@/lib/moods";

export type Song = {
  id: string;
  title: string;
  artist: string;
  language: string;
  mood: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
};

export function useSongs(mood: MoodKey) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("songs")
        .select("id, title, artist, language, mood, audio_url, cover_url, duration_seconds")
        .eq("mood", mood)
        .order("title");

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setSongs(data ?? []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mood]);

  return { songs, loading, error };
}
