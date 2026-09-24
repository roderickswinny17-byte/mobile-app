import { createClient } from "npm:@supabase/supabase-js@2";

// Curated known senders -- the Gmail search targets these specifically
// instead of guessing from subject keywords across the whole inbox (that
// approach produced a false positive: "Kiranmai Duggirala" detected from an
// unrelated email that happened to match a subject keyword). Nothing
// outside this list is ever scanned at all. Add a verified sender
// domain/address here to detect a new service.
const KNOWN_SENDERS: { domain: string; serviceName: string; iconKey: string | null }[] = [
  { domain: "netflix.com", serviceName: "Netflix", iconKey: "netflix" },
  { domain: "spotify.com", serviceName: "Spotify", iconKey: "spotify" },
  { domain: "adobe.com", serviceName: "Adobe Creative Cloud", iconKey: "adobe" },
  { domain: "github.com", serviceName: "GitHub Pro", iconKey: "github" },
  { domain: "dropbox.com", serviceName: "Dropbox", iconKey: "dropbox" },
  { domain: "figma.com", serviceName: "Figma", iconKey: "figma" },
  { domain: "notion.so", serviceName: "Notion", iconKey: "notion" },
  { domain: "openai.com", serviceName: "ChatGPT Plus", iconKey: "openai" },
  // YouTube Premium intentionally not included yet -- add its real sender
  // domain/address here once confirmed, rather than guessing at Google's
  // actual notification sender.
];

// "Netflix" <billing@netflix.com> -> { name: "Netflix", domain: "netflix.com" }
function parseFromHeader(from: string): { name: string; domain: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^@>]+@([^>]+))?>?$/);
  const rawName = match?.[1]?.trim();
  const domain = match?.[3]?.trim().toLowerCase() ?? "";
  const name = rawName && rawName.length > 0 ? rawName : domain.split(".")[0] || "Unknown";
  return { name, domain };
}

// Looks for a currency amount in the given text -- a deliberately simple
// heuristic (see the disclaimer this produces on the client's review
// screen), not a real invoice parser. Tries symbol-prefixed amounts first
// ($15.99), then code-suffixed/prefixed ones (15.99 USD, Rs. 799, INR 799)
// since plenty of real receipts are worded that way instead.
const CURRENCY_BY_SYMBOL: Record<string, string> = { "$": "USD", "₹": "INR", "£": "GBP", "€": "EUR" };
function guessAmount(text: string): { amount: number; currency: string } | null {
  // Decimals optional -- INR prices very often omit paise ("₹119" not
  // "₹119.00"), and the old mandatory ".dd" here meant any whole-number
  // symbol-prefixed price silently fell through to no match at all.
  const symbolMatch = text.match(/([$₹£€])\s?([\d,]+(?:\.\d{2})?)/);
  if (symbolMatch) {
    return {
      amount: parseFloat(symbolMatch[2].replace(/,/g, "")),
      currency: CURRENCY_BY_SYMBOL[symbolMatch[1]] ?? "USD",
    };
  }
  const codeMatch = text.match(/\b(USD|INR|GBP|EUR)\s?([\d,]+\.?\d{0,2})\b|\b([\d,]+\.\d{2})\s?(USD|INR|GBP|EUR)\b/i);
  if (codeMatch) {
    const amount = codeMatch[2] ?? codeMatch[3];
    const currency = (codeMatch[1] ?? codeMatch[4])?.toUpperCase();
    if (amount && currency) return { amount: parseFloat(amount.replace(/,/g, "")), currency };
  }
  const rsMatch = text.match(/\bRs\.?\s?([\d,]+(?:\.\d{2})?)\b/i);
  if (rsMatch) return { amount: parseFloat(rsMatch[1].replace(/,/g, "")), currency: "INR" };
  return null;
}

// Same "simple heuristic, not a real parser" caveat as guessAmount -- looks
// for common phrasing ("$9.99/month", "billed annually", "every 3 months")
// rather than hardcoding every approved subscription to monthly regardless
// of what the receipt actually says.
function guessBillingCycle(text: string): "monthly" | "quarterly" | "yearly" {
  const t = text.toLowerCase();
  if (/\b(per|\/)\s*year\b|\bannual(ly)?\b|\byearly\b|\beach year\b/.test(t)) return "yearly";
  if (/\b(per|\/)\s*quarter\b|\bquarterly\b|\bevery (3|three) months\b/.test(t)) return "quarterly";
  return "monthly";
}

// Gmail's message payload is a tree (multipart/alternative wrapping a
// text/plain part and a text/html part, sometimes nested further) --
// this walks it looking for a text/plain part first, falling back to a
// crude HTML-tag strip of text/html if that's all there is. Decoded body
// text finds an amount far more often than the ~200-char snippet Gmail
// returns in the list/metadata views.
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
// Turns a raw text/html body into plain text worth searching. The naive
// version of this (strip tags, done) left <style>/<script> block CONTENTS
// behind as if they were real text -- a heavily-templated receipt's CSS
// (media queries, font-family rules) plus hundreds of blank table-cell
// newlines was burning through the entire truncation budget before the
// actual "charge ₹119" line ever showed up, so a real price was sitting in
// the email but never reached by guessAmount at all.
function htmlToText(html: string): string {
  const withoutBlocks = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

function extractBodyText(payload: GmailPart | undefined): string {
  if (!payload) return "";
  if (payload.body?.data && (payload.mimeType === "text/plain" || payload.mimeType === "text/html")) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? htmlToText(decoded) : decoded;
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  }
  for (const part of payload.parts ?? []) {
    const nested = extractBodyText(part);
    if (nested) return nested;
  }
  return "";
}
// atob() only reverses base64 -- it does NOT decode UTF-8, it hands back a
// raw byte string where each char is one byte (0-255). That's harmless for
// plain ASCII ($ signs, English text) but silently mangles any multi-byte
// character: symbols like RUPEE SIGN are 3 UTF-8 bytes, so without this
// step they never survive as the single character guessAmount() looks for
// -- a receipt with a real ₹ price in it would guess nothing at all.
function decodeBase64Url(data: string): string {
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}
// Some email templates encode currency symbols as HTML entities
// (&#8377;/&#x20b9; for ₹) instead of the literal character even in the
// text/html part -- decode those too so guessAmount's symbol match works
// either way.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Failed to refresh Google access token: ${JSON.stringify(data)}`);
  }
  return { accessToken: data.access_token as string, expiresIn: data.expires_in as number };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("gmail-scan-subscriptions: request received");

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
      console.error("gmail-scan-subscriptions: auth failed", userError);
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }
    console.log("gmail-scan-subscriptions: authenticated as", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection, error: connError } = await supabaseAdmin
      .from("email_connections")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connError || !connection) {
      console.error("gmail-scan-subscriptions: no Gmail connection", connError);
      return new Response(JSON.stringify({ error: "Gmail is not connected" }), { status: 400, headers: corsHeaders });
    }

    let accessToken = connection.access_token;
    if (new Date(connection.expires_at).getTime() < Date.now() + 60_000) {
      console.log("gmail-scan-subscriptions: access token expired, refreshing");
      const refreshed = await refreshAccessToken(connection.refresh_token);
      accessToken = refreshed.accessToken;
      await supabaseAdmin
        .from("email_connections")
        .update({
          access_token: refreshed.accessToken,
          expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        })
        .eq("user_id", user.id);
    }

    if (KNOWN_SENDERS.length === 0) {
      console.log("gmail-scan-subscriptions: KNOWN_SENDERS is empty, nothing to search for");
      return new Response(JSON.stringify({ scanned: 0, detected: 0 }), { headers: corsHeaders });
    }

    // Only mail from these exact known senders is ever looked at -- not a
    // subject-keyword search across the whole inbox.
    const query = `newer_than:90d (${KNOWN_SENDERS.map((s) => `from:${s.domain}`).join(" OR ")})`;
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("q", query);
    // Gmail returns matches newest-first -- 25 was too easy to crowd out
    // with promotional mail from a known sender (e.g. many ChatGPT
    // marketing emails burying an actual older Spotify receipt past
    // position 25, so it was never looked at again by any rescan).
    listUrl.searchParams.set("maxResults", "100");

    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const listData = await listRes.json();
    if (!listRes.ok) {
      console.error("gmail-scan-subscriptions: Gmail list failed", listData);
      return new Response(JSON.stringify({ error: "Gmail search failed", details: listData }), { status: 502, headers: corsHeaders });
    }

    const messageIds: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);
    console.log("gmail-scan-subscriptions: found", messageIds.length, "candidate messages");

    let detectedCount = 0;
    for (const id of messageIds) {
      // format=full (not metadata) -- the amount is very often outside the
      // ~200-char snippet Gmail returns for metadata/list views, so
      // guessAmount needs the actual body text to find it reliably.
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
      msgUrl.searchParams.set("format", "full");

      const msgRes = await fetch(msgUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const snippet: string = msg.snippet ?? "";
      // Larger cap now that whitespace/style-block junk is stripped first
      // (htmlToText) -- the old 5000-char cut was landing mid-CSS-boilerplate
      // on some real receipts, well before the actual charge line.
      const bodyText = extractBodyText(msg.payload).slice(0, 20000);

      const { domain } = parseFromHeader(from);
      // The service name/logo come from the matched entry, not from
      // parsing the email's display name -- that's what produced a
      // person's name instead of a real service before.
      const known = KNOWN_SENDERS.find((s) => domain === s.domain || domain.endsWith(`.${s.domain}`));
      if (!known) {
        console.warn("gmail-scan-subscriptions: message matched query but no known sender for domain", domain);
        continue;
      }

      const combinedText = `${subject} ${bodyText || snippet}`;
      const guessedMoney = guessAmount(combinedText);
      const guessedCycle = guessBillingCycle(combinedText);
      const guessFields = {
        guessed_amount: guessedMoney?.amount ?? null,
        guessed_currency: guessedMoney?.currency ?? "USD",
        guessed_billing_cycle: guessedCycle,
        source_snippet: snippet.slice(0, 300),
      };

      // A plain upsert would either skip every rescan of an already-seen
      // message (ignoreDuplicates: true -- a better decoder could never
      // reach a message already sitting pending with a stale null guess)
      // or blindly overwrite status back to "pending" on every rescan
      // (ignoreDuplicates: false -- would resurrect messages the user
      // already approved/dismissed). So: look the row up first, and only
      // touch it if it doesn't exist yet or is still awaiting review.
      const { data: existingCandidate } = await supabaseAdmin
        .from("detected_subscriptions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("gmail_message_id", id)
        .maybeSingle();

      if (!existingCandidate) {
        const { error: insertError } = await supabaseAdmin.from("detected_subscriptions").insert({
          user_id: user.id,
          service_name: known.serviceName,
          icon_key: known.iconKey,
          gmail_message_id: id,
          status: "pending",
          ...guessFields,
        });
        if (!insertError) detectedCount++;
        else console.warn("insert failed for", id, insertError.message);
      } else if (existingCandidate.status === "pending") {
        const { error: updateError } = await supabaseAdmin
          .from("detected_subscriptions")
          .update(guessFields)
          .eq("id", existingCandidate.id);
        if (!updateError) detectedCount++;
        else console.warn("guess refresh failed for", id, updateError.message);
      }
      // status is "approved" or "dismissed" -- already resolved, leave alone.
    }

    await supabaseAdmin
      .from("email_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

    console.log("gmail-scan-subscriptions: done", { detectedCount });
    return new Response(JSON.stringify({ scanned: messageIds.length, detected: detectedCount }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("gmail-scan-subscriptions: unhandled exception", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
