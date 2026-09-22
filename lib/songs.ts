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

// Placeholder catalog: generic royalty-free instrumental tracks from
// SoundHelix (soundhelix.com), which explicitly provides these for testing
// and demo use -- verified each URL below actually resolves before using
// it. These are NOT mood- or language-curated real songs; they exist so the
// mood -> song list -> playback flow is fully testable right now, without
// needing a Jamendo API key or a database seed.
//
// To swap in real content later: get a free client_id from
// devportal.jamendo.com, run `JAMENDO_CLIENT_ID=... SUPABASE_URL=...
// SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-songs.mjs`, then point
// hooks/useSongs.ts back at the `songs` Supabase table instead of this file.
const track = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const SONGS: Song[] = [
  // Happy
  { id: "happy-1", title: "Sunny Skies", artist: "SoundHelix", language: "en", mood: "happy", audio_url: track(1), cover_url: null, duration_seconds: null },
  { id: "happy-2", title: "Good Vibes", artist: "SoundHelix", language: "en", mood: "happy", audio_url: track(2), cover_url: null, duration_seconds: null },
  { id: "happy-3", title: "Bright Morning", artist: "SoundHelix", language: "hi", mood: "happy", audio_url: track(3), cover_url: null, duration_seconds: null },
  { id: "happy-4", title: "Feel Good", artist: "SoundHelix", language: "te", mood: "happy", audio_url: track(4), cover_url: null, duration_seconds: null },
  { id: "happy-5", title: "Smile On", artist: "SoundHelix", language: "ta", mood: "happy", audio_url: track(5), cover_url: null, duration_seconds: null },

  // Sad
  { id: "sad-1", title: "Rainy Window", artist: "SoundHelix", language: "en", mood: "sad", audio_url: track(6), cover_url: null, duration_seconds: null },
  { id: "sad-2", title: "Quiet Room", artist: "SoundHelix", language: "en", mood: "sad", audio_url: track(7), cover_url: null, duration_seconds: null },
  { id: "sad-3", title: "Empty Streets", artist: "SoundHelix", language: "hi", mood: "sad", audio_url: track(8), cover_url: null, duration_seconds: null },
  { id: "sad-4", title: "Blue Hour", artist: "SoundHelix", language: "ml", mood: "sad", audio_url: track(9), cover_url: null, duration_seconds: null },
  { id: "sad-5", title: "Slow Fade", artist: "SoundHelix", language: "ta", mood: "sad", audio_url: track(10), cover_url: null, duration_seconds: null },

  // Love
  { id: "love-1", title: "Close To You", artist: "SoundHelix", language: "en", mood: "love", audio_url: track(11), cover_url: null, duration_seconds: null },
  { id: "love-2", title: "Sweet Moments", artist: "SoundHelix", language: "en", mood: "love", audio_url: track(12), cover_url: null, duration_seconds: null },
  { id: "love-3", title: "Together", artist: "SoundHelix", language: "hi", mood: "love", audio_url: track(13), cover_url: null, duration_seconds: null },
  { id: "love-4", title: "Warm Embrace", artist: "SoundHelix", language: "te", mood: "love", audio_url: track(14), cover_url: null, duration_seconds: null },
  { id: "love-5", title: "Forever Us", artist: "SoundHelix", language: "ml", mood: "love", audio_url: track(15), cover_url: null, duration_seconds: null },

  // Party
  { id: "party-1", title: "Night Out", artist: "SoundHelix", language: "en", mood: "party", audio_url: track(16), cover_url: null, duration_seconds: null },
  { id: "party-2", title: "Turn It Up", artist: "SoundHelix", language: "en", mood: "party", audio_url: track(17), cover_url: null, duration_seconds: null },
  { id: "party-3", title: "Dance Floor", artist: "SoundHelix", language: "hi", mood: "party", audio_url: track(1), cover_url: null, duration_seconds: null },
  { id: "party-4", title: "Weekend Mode", artist: "SoundHelix", language: "ta", mood: "party", audio_url: track(2), cover_url: null, duration_seconds: null },
  { id: "party-5", title: "Let Loose", artist: "SoundHelix", language: "te", mood: "party", audio_url: track(3), cover_url: null, duration_seconds: null },
];
