import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

export type EmailConnectionStatus = {
  provider: string;
  email: string | null;
  connected_at: string;
  last_synced_at: string | null;
} | null;

// Gmail OAuth: gmail-oauth-start (Edge Function) hands back a Google
// consent URL, expo-web-browser opens it and waits for the redirect back to
// this app's own URL scheme (gmail-oauth-callback sends the browser there
// once tokens are safely stored server-side -- see supabase/schema.sql and
// supabase/functions/ for why none of that happens client-side).
export function useEmailConnection() {
  const [status, setStatus] = useState<EmailConnectionStatus>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_email_connection_status");
    setStatus(data?.[0] ?? null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const { data, error: startError } = await supabase.functions.invoke("gmail-oauth-start");
      if (startError || !data?.authorizeUrl) {
        setError(startError?.message ?? "Could not start Gmail connection.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.authorizeUrl, "mobileapp://oauth-callback");
      if (result.type !== "success") {
        setError("Gmail connection was cancelled.");
        return;
      }

      const redirectUrl = new URL(result.url);
      const success = redirectUrl.searchParams.get("success") === "true";
      if (!success) {
        setError(redirectUrl.searchParams.get("error") ?? "Gmail connection failed.");
        return;
      }

      await load();
    } finally {
      setConnecting(false);
    }
  }, [load]);

  const disconnect = useCallback(async () => {
    await supabase.rpc("disconnect_gmail");
    await load();
  }, [load]);

  const scanNow = useCallback(async () => {
    setError(null);
    setScanning(true);
    try {
      const { data, error: scanError } = await supabase.functions.invoke("gmail-scan-subscriptions");
      if (scanError) {
        setError(scanError.message ?? "Scan failed.");
        return null;
      }
      await load();
      return data as { scanned: number; detected: number };
    } finally {
      setScanning(false);
    }
  }, [load]);

  return {
    status,
    connected: !!status,
    loading,
    connecting,
    scanning,
    error,
    connect,
    disconnect,
    scanNow,
  };
}
