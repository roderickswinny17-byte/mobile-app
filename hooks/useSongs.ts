import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CategoryKey } from "@/assets/constants/data";

export type Song = {
  id: string;
  title: string;
  artist: string;
  category: string;
  language: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export function useSongs(category: CategoryKey) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: songsError } = await supabase
      .from("songs")
      .select("id, title, artist, category, language, audio_url, cover_url, duration_seconds, created_at")
      .eq("category", category)
      .order("created_at", { ascending: true });

    if (songsError) {
      setError(songsError.message);
    } else {
      setSongs(data ?? []);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return { songs, loading, error, reload: load };
}
