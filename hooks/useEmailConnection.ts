import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { FunctionsHttpError } from "@supabase/supabase-js";
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
        const reason = redirectUrl.searchParams.get("error");
        setError(
          reason === "gmail_permission_not_granted"
            ? "Gmail access wasn't granted. Connect again and tick the Gmail permission on Google's screen."
            : reason ?? "Gmail connection failed."
        );
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
        let status: number | null = null;
        let body: { error?: string; message?: string; msg?: string; code?: string } | null = null;
        if (scanError instanceof FunctionsHttpError) {
          status = scanError.context.status;
          body = await scanError.context.json().catch(() => null);
        }
        // Our own function replies { error }; Supabase platform failures
        // (worker limit, boot error, timeout) reply { message } / { code }
        // instead, which used to fall through to the opaque "non-2xx" text.
        console.warn("gmail scan failed", { status, body });
        const reason = body?.error ?? body?.message ?? body?.msg;
        if (reason) {
          setError(reason);
        } else if (status !== null && status >= 500) {
          setError("The scan took too long or hit a server problem. Please try again in a moment.");
        } else {
          setError(scanError.message ?? "Scan failed.");
        }
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
