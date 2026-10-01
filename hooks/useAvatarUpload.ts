import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

// One file per user at "<uid>/avatar.<ext>" -- re-uploading always
// overwrites the same path (upsert: true) rather than accumulating old
// photos, and RLS on storage.objects (see schema.sql) only allows writing
// under your own uid folder.
export function useAvatarUpload(userId: string | undefined, onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async () => {
    if (!userId) return;
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      // base64 comes back populated from the picker call above, but typed
      // as optional -- re-reading from disk is the documented fallback for
      // when it isn't (e.g. some Android content:// URIs).
      const base64 = asset.base64 ?? (await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" }));
      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = ext === "png" ? "image/png" : "image/jpeg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, decode(base64), { contentType, upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust: the storage path is fixed per user, so without a
      // changing query param the Image component (and any CDN in front of
      // it) would keep showing the previous photo after this exact update.
      const url = `${data.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (profileError) {
        setError(profileError.message);
        return;
      }

      onUploaded(url);
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading, error };
}
