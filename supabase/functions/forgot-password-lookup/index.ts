import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const QUESTION_LABELS: Record<string, string> = {
  favourite_colour: "What is your favourite colour?",
  favourite_cricketer: "Who is your favourite cricketer?",
};

// Public, no-auth endpoint by design -- a locked-out user has no session to
// authenticate with. Returns ONLY which question the account uses, never
// anything else, and the same shape of response whether the account exists
// or not isn't really achievable for this UX (the next screen needs to know
// which question to render) -- this is a deliberate, known account-
// enumeration tradeoff, not an oversight. See the questions column this
// opens up before relying on it in production.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("security_question")
      .eq("email", email.trim())
      .maybeSingle();

    if (!profile || !profile.security_question) {
      return new Response(JSON.stringify({ found: false }), { headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ found: true, questionLabel: QUESTION_LABELS[profile.security_question] }),
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
