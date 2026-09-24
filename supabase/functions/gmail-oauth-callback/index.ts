import { createClient } from "npm:@supabase/supabase-js@2";

// The redirect_uri Google sends the user's browser back to after they
// approve/deny access -- registered as the OAuth app's redirect URI in
// Google Cloud Console. Public on purpose (Google calls this directly; the
// browser has no Supabase session of its own here), but the resulting
// tokens only ever get attached to a real user via the state row that
// gmail-oauth-start created while the app WAS authenticated.
const APP_SCHEME = "mobileapp";

function redirectToApp(success: boolean, error?: string) {
  const url = new URL(`${APP_SCHEME}://oauth-callback`);
  url.searchParams.set("success", String(success));
  if (error) url.searchParams.set("error", error);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  console.log("gmail-oauth-callback: request received");

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const googleError = url.searchParams.get("error");

    if (googleError) {
      console.error("gmail-oauth-callback: Google returned an error", googleError);
      return redirectToApp(false, googleError);
    }
    if (!code || !state) {
      console.error("gmail-oauth-callback: missing code or state");
      return redirectToApp(false, "missing_code_or_state");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: stateRow, error: stateError } = await supabaseAdmin
      .from("oauth_states")
      .select("user_id, provider, created_at")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !stateRow) {
      console.error("gmail-oauth-callback: unknown or already-used state", stateError);
      return redirectToApp(false, "invalid_state");
    }

    const stateAgeMs = Date.now() - new Date(stateRow.created_at).getTime();
    if (stateAgeMs > 10 * 60 * 1000) {
      console.error("gmail-oauth-callback: state expired", { stateAgeMs });
      await supabaseAdmin.from("oauth_states").delete().eq("state", state);
      return redirectToApp(false, "state_expired");
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!clientId || !clientSecret || !supabaseUrl) {
      console.error("gmail-oauth-callback: missing Google OAuth server config");
      return redirectToApp(false, "server_not_configured");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${supabaseUrl}/functions/v1/gmail-oauth-callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("gmail-oauth-callback: token exchange failed", tokenData);
      await supabaseAdmin.from("oauth_states").delete().eq("state", state);
      return redirectToApp(false, "token_exchange_failed");
    }

    // --- ENHANCEMENT 1: Get user email for UI ---
    let userEmail: string | null = null;
    try {
      const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const info = await infoRes.json();
      userEmail = info.email || null;
      console.log("gmail-oauth-callback: userinfo email", userEmail);
    } catch (e) {
      console.warn("gmail-oauth-callback: could not fetch email", e);
    }

    // Google only returns a refresh_token on the FIRST consent (or when
    // prompt=consent forces re-approval, which gmail-oauth-start always
    // sets) -- if this ever comes back empty for a re-connect, keep the
    // previously stored one rather than overwriting it with nothing.
    const { data: existing } = await supabaseAdmin
      .from("email_connections")
      .select("refresh_token, email")
      .eq("user_id", stateRow.user_id)
      .maybeSingle();

    // refresh_token is NOT NULL -- if Google omitted it AND there's no
    // previously stored one either (occasionally happens on a retry after
    // an earlier partial/failed attempt already consumed the one-time
    // grant), the insert below would otherwise fail with a generic,
    // hard-to-debug "storage_failed". Surfacing this specific case instead
    // so the fix (revoke access, then reconnect) is actually discoverable.
    const refreshToken = tokenData.refresh_token ?? existing?.refresh_token;
    if (!refreshToken) {
      console.error("gmail-oauth-callback: no refresh_token from Google and none stored previously");
      await supabaseAdmin.from("oauth_states").delete().eq("state", state);
      return redirectToApp(false, "no_refresh_token");
    }

    const { error: upsertError } = await supabaseAdmin.from("email_connections").upsert({
      user_id: stateRow.user_id,
      provider: stateRow.provider,
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
      email: userEmail ?? existing?.email ?? null,
    });

    await supabaseAdmin.from("oauth_states").delete().eq("state", state);

    if (upsertError) {
      console.error("gmail-oauth-callback: failed to store tokens", upsertError);
      return redirectToApp(false, "storage_failed");
    }

    console.log("gmail-oauth-callback: connected", { userId: stateRow.user_id, email: userEmail });
    return redirectToApp(true);
  } catch (err) {
    console.error("gmail-oauth-callback: unhandled exception", err);
    return redirectToApp(false, "unexpected_error");
  }
});