import { createClient } from "npm:@supabase/supabase-js@2";

// Must match set-security-answer's hashAnswer exactly (same PBKDF2
// parameters), since it's verifying hashes that function produced.
const PBKDF2_ITERATIONS = 100_000;

async function verifyAnswer(answer: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(answer), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const computedHex = Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

// No Authorization/session check at all -- by design, since this exists for
// a locked-out user with no valid session. That also makes it the single
// highest-privilege public endpoint in this app: it ends by calling
// auth.admin.updateUserById with the service-role key, on nothing but
// whatever this function itself verifies. Every check below is load-
// bearing; none of it is defense in depth over something else.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, phoneNumber, answer, newPassword } = await req.json();
    if (!email || !phoneNumber || !answer || !newPassword) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400, headers: corsHeaders });
    }
    if (newPassword.length < 6 || /\s/.test(newPassword)) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters and contain no spaces." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, phone_number, security_answer_hash, reset_failed_attempts, reset_locked_until")
      .eq("email", String(email).trim())
      .maybeSingle();

    // Same generic error whether the account doesn't exist, the phone
    // doesn't match, or the answer is wrong -- never reveal WHICH check
    // failed, or this becomes an account/phone-number verification tool.
    const genericError = () =>
      new Response(JSON.stringify({ error: "Could not verify your details." }), { status: 400, headers: corsHeaders });

    if (!profile || !profile.security_answer_hash) return genericError();

    if (profile.reset_locked_until && new Date(profile.reset_locked_until) > new Date()) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Try again later." }),
        { status: 429, headers: corsHeaders }
      );
    }

    if ((profile.phone_number ?? "") !== String(phoneNumber).trim()) {
      await recordFailedAttempt(supabaseAdmin, profile.id, profile.reset_failed_attempts);
      return genericError();
    }

    const normalized = String(answer).trim().toLowerCase();
    const answerMatches = await verifyAnswer(normalized, profile.security_answer_hash);
    if (!answerMatches) {
      await recordFailedAttempt(supabaseAdmin, profile.id, profile.reset_failed_attempts);
      return genericError();
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });
    }

    // Reset the lockout counter on success.
    //
    // NOT implemented here, and worth resolving before relying on this:
    // invalidating this user's OTHER existing sessions after the reset.
    // auth.admin.signOut(jwt, scope) takes a specific access-token JWT to
    // revoke, not a user id -- confirmed by reading the actual installed
    // @supabase/auth-js type definitions, not assumed -- so there's no
    // direct "sign out this user id everywhere" call in this SDK version.
    // Until that's solved, a password reset here does NOT kick out anyone
    // already signed in elsewhere on the account.
    await supabaseAdmin
      .from("profiles")
      .update({ reset_failed_attempts: 0, reset_locked_until: null })
      .eq("id", profile.id);

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});

async function recordFailedAttempt(
  admin: ReturnType<typeof createClient>,
  profileId: string,
  currentAttempts: number
) {
  const attempts = currentAttempts + 1;
  const lockedUntil = attempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null;
  await admin.from("profiles").update({ reset_failed_attempts: attempts, reset_locked_until: lockedUntil }).eq("id", profileId);
}
