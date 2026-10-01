import { createClient } from "npm:@supabase/supabase-js@2";

// PBKDF2 via Deno's native Web Crypto API -- not bcryptjs. A first attempt
// using `npm:bcryptjs` failed to even boot in the edge runtime (confirmed:
// a real HTTP call returned "BOOT_ERROR: Function failed to start" for both
// functions that imported it). Web Crypto is a runtime-native global, not
// an npm package, so there's no module-resolution/compat risk at all. Salt
// is random per answer and stored alongside the hash (not secret -- its
// whole job is making identical answers hash differently per user).
const PBKDF2_ITERATIONS = 100_000;

async function hashAnswer(answer: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(answer), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const toHex = (bytes: Uint8Array) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${toHex(salt)}:${toHex(new Uint8Array(derivedBits))}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const VALID_QUESTIONS = ["favourite_colour", "favourite_cricketer"];

// Called right after sign-up (while the user still has a valid session) to
// store their chosen security question + a one-way hash of the answer.
// Hashing happens here, server-side, never on the client -- a client-
// computed hash would just be a differently-shaped plaintext answer an
// attacker could replay directly without ever knowing the real answer.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    const { question, answer } = await req.json();
    if (!VALID_QUESTIONS.includes(question)) {
      return new Response(JSON.stringify({ error: "Invalid security question" }), { status: 400, headers: corsHeaders });
    }
    if (!answer || typeof answer !== "string" || !answer.trim()) {
      return new Response(JSON.stringify({ error: "Answer is required" }), { status: 400, headers: corsHeaders });
    }

    // Normalize before hashing -- "Kohli", "kohli", " kohli " must all match
    // the same stored hash, or the user locks themselves out over casing.
    const normalized = answer.trim().toLowerCase();
    const answerHash = await hashAnswer(normalized);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ security_question: question, security_answer_hash: answerHash })
      .eq("id", user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
