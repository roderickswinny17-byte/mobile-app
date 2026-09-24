import { createClient } from "npm:@supabase/supabase-js@2";

// Called by the app right before it opens the Google consent screen (see
// hooks/useEmailConnection.ts). Registers a short-lived state -> user_id
// mapping so gmail-oauth-callback -- which Google hits directly, with no
// Supabase session of its own -- knows which user to attach the resulting
// tokens to, without ever trusting a client-supplied user id.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  console.log("gmail-oauth-start: request received");

  try {
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error("gmail-oauth-start: auth failed", userError);
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("gmail-oauth-start: authenticated as", user.id);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!clientId || !supabaseUrl) {
      console.error("gmail-oauth-start: missing GOOGLE_CLIENT_ID or SUPABASE_URL");
      return new Response(JSON.stringify({ error: "Server not configured for Gmail OAuth" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const state = crypto.randomUUID();
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-oauth-callback`;

    // service_role -- oauth_states has no client-facing policy at all
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error: insertError } = await supabaseAdmin
      .from("oauth_states")
      .insert({ state, user_id: user.id, provider: "gmail" });

    if (insertError) {
      console.error("gmail-oauth-start: failed to store state", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email");
    authorizeUrl.searchParams.set("access_type", "offline");
    authorizeUrl.searchParams.set("prompt", "consent");
    authorizeUrl.searchParams.set("state", state);

    console.log("gmail-oauth-start: issued state, returning authorize URL");
    return new Response(JSON.stringify({ authorizeUrl: authorizeUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gmail-oauth-start: unhandled exception", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});