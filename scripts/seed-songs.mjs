// One-time / re-runnable script: pulls royalty-free, Creative-Commons
// licensed tracks from Jamendo (https://www.jamendo.com) and inserts them
// into the `songs` table. This does NOT download or bundle any audio files
// -- it stores Jamendo's own streaming URL, so playback streams live from
// their servers.
//
// Run locally (never from the app):
//   JAMENDO_CLIENT_ID=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-songs.mjs
//
// JAMENDO_CLIENT_ID: free, from https://devportal.jamendo.com
// SUPABASE_SERVICE_ROLE_KEY: Dashboard -> Project Settings -> API Keys
//   (the secret one -- never put this in .env or anywhere in the app)
import { createClient } from "@supabase/supabase-js";

const { JAMENDO_CLIENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!JAMENDO_CLIENT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Required: JAMENDO_CLIENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Maps this app's mood keys (lib/moods.ts) to Jamendo's tag vocabulary.
const MOOD_TAGS = {
  happy: "happy",
  sad: "sad",
  love: "romantic",
  party: "party",
};

// Jamendo's catalog skews Western/independent -- expect thin or empty
// results for te/ta/ml, since it's not built around regional Indian music.
const LANGUAGES = ["en", "hi", "te", "ta", "ml"];

async function fetchMoodSongs(mood, tag) {
  const rows = [];

  for (const lang of LANGUAGES) {
    const url = new URL("https://api.jamendo.com/v3.0/tracks");
    url.searchParams.set("client_id", JAMENDO_CLIENT_ID);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "10");
    url.searchParams.set("tags", tag);
    url.searchParams.set("lang", lang);

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Jamendo request failed for mood=${mood} lang=${lang}: ${res.status}`);
      continue;
    }
    const { results } = await res.json();

    for (const track of results ?? []) {
      if (!track.audio) continue; // skip tracks with no streaming URL
      rows.push({
        title: track.name,
        artist: track.artist_name,
        language: lang,
        mood,
        audio_url: track.audio,
        cover_url: track.image || null,
        duration_seconds: track.duration ?? null,
        source: "jamendo",
        license_url: track.license_ccurl || null,
      });
    }
  }

  return rows;
}

const allRows = (
  await Promise.all(Object.entries(MOOD_TAGS).map(([mood, tag]) => fetchMoodSongs(mood, tag)))
).flat();

if (allRows.length === 0) {
  console.log("No songs fetched from Jamendo -- nothing to insert.");
  process.exit(0);
}

const { error } = await supabase.from("songs").insert(allRows);
if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Inserted ${allRows.length} songs.`);
