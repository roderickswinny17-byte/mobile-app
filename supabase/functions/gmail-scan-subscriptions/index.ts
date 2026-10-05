import { createClient } from "npm:@supabase/supabase-js@2";

// Curated senders -- when a matched email comes from one of these, its
// serviceName/iconKey are taken from here instead of guessed from the
// "From" header, and only the receipt-evidence gate (looksLikeReceipt)
// applies to it, same as before. This is no longer the only thing that can
// ever be detected (see the broadened query below) -- it's now just the
// "we already know exactly what this is" fast path. Add a verified sender
// domain/address here to get a clean name/logo for a new service.
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

// A known sender's own marketing email mentions the service name plenty
// but isn't proof of an actual subscription or charge -- discovered from
// real data: a single account had 25 "Spotify" candidates that were a mix
// of upsell ads ("Get Spotify Premium... 12 months at ₹799") AND completely
// unrelated tour-announcement newsletters ("Your Fave, On Tour", an artist
// "hitting the road"), none of them receipts. A blocklist of known-junk
// phrasing proved insufficient on the very first real account it was
// tested against (the tour emails weren't anticipated) -- this instead
// requires POSITIVE evidence the email is actually receipt/confirmation
// shaped before it's ever added to the review queue at all.
const RECEIPT_RE =
  /\b(receipt|invoice|order (id|confirmation|number)|thanks? for your (purchase|order|subscription)|you'?ll find your receipt|payment (successful|received|confirmation)|charged|billed|subscription (confirmed|renewed|active|receipt)|auto-?renew|authoriz\w* .{0,20}to (automatically )?charge)\b/i;
function looksLikeReceipt(text: string): boolean {
  return RECEIPT_RE.test(text);
}

// A much weaker signal than a receipt -- "you signed up" or "you cancelled"
// proves a service relationship exists (past or present), not that a charge
// happened. Only ever checked for curated KNOWN_SENDERS, where that alone is
// still trustworthy enough to surface the service for manual review.
const LIFECYCLE_RE =
  /\b(welcome to|thanks? for (joining|signing up)|you'?re (now |all )?set|account (is |has been )?(active|created)|we'?re sorry to see you go|your (membership|account|subscription) has been (cancell?ed|closed))\b/i;

// Overrides the guessed service name/logo for well-known products that are
// billed through an intermediary whose own sender name says nothing about
// which app is actually being paid for. Checked against body content, not
// the sender -- see the gating-vs-naming distinction where this is used.
const PRODUCT_NAME_HINTS: { pattern: RegExp; serviceName: string; iconKey: string | null }[] = [
  { pattern: /\bclaude( pro)?\b|\banthropic,?\s*pbc\b/i, serviceName: "Claude", iconKey: "claude" },
  { pattern: /\bchatgpt\b|\bopenai\b/i, serviceName: "ChatGPT Plus", iconKey: "openai" },
  { pattern: /\bgoogle one\b|\bgoogle ai pro\b/i, serviceName: "Google One (Gemini)", iconKey: null },
  { pattern: /\byoutube premium\b/i, serviceName: "YouTube Premium", iconKey: "youtube" },
];
// Google Play's own receipt wording is consistent enough to extract the
// actual merchant generically ("subscription purchase from BodBot on
// Google Play") for anything not already covered by PRODUCT_NAME_HINTS
// above -- otherwise every Play-billed app not on that short list still
// collapses into one generic "Google Play" bucket.
const GOOGLE_PLAY_MERCHANT_RE = /\bsubscription\s+(?:purchase\s+)?from\s+([A-Z][\w&.,''\s]{1,40}?)\s+on Google Play\b/i;

// Once the sender allowlist was removed (see the query below), looksLikeReceipt
// alone stopped being safe: it happily matches Uber ride receipts, Zomato food
// orders, one-off Amazon purchases and Razorpay donations -- all genuinely
// receipt-shaped, none of them a subscription. Confirmed against a real
// inbox (gmail-diagnostic-dump): "order confirmation"/"charged"/"billed"
// wording shows up constantly in ordinary one-off commerce. This second gate
// requires actual RECURRING-billing language before something outside the
// curated KNOWN_SENDERS list is added to the review queue at all.
//
// Stripping SUBSCRIPTION_NOISE_RE first matters just as much as the positive
// pattern: nearly every commercial email has an "unsubscribe" / "manage your
// email subscription preferences" footer, which contains the literal word
// "subscription" and would otherwise defeat this gate on its own (confirmed:
// Uber promo mail, LinkedIn digests and newsletter mail all matched purely
// on that footer boilerplate before this strip was added).
const SUBSCRIPTION_NOISE_RE =
  /\b(email subscription|newsletter subscription|manage (your )?(email )?(communication )?(preferences|subscription)|unsubscribe)\b/gi;
const SUBSCRIPTION_WORDING_RE =
  /\b(subscription|subscribed to|membership (fee|renew|active|plan)|recurring (payment|charge|billing)|auto-?renew\w*|renews? (automatically|on|monthly|yearly|annually)|billing cycle|your plan (renews|will renew))\b/i;
function hasSubscriptionEvidence(text: string): boolean {
  return SUBSCRIPTION_WORDING_RE.test(text.replace(SUBSCRIPTION_NOISE_RE, " "));
}

// Multiple emails routinely get matched for the same service -- a real
// receipt, a "your trial is ending" nudge, a plain upsell ad -- and they are
// not equally useful. This ranks each one (1 = best) so the review queue can
// pick the single most informative email per service as its primary card
// instead of whichever happened to be newest:
//   1. An actual receipt/confirmation that also has a real amount and/or a
//      charge date to project the renewal from -- proper subscription
//      details, not just proof the word "subscription" appeared somewhere.
//   2. A "redeem"/"claim"/"trial ending"/"payment declined, update now"
//      email -- proves an active or about-to-lapse subscription, but not a
//      clean charge record.
//   3. A "subscribe now"/"join"/"upgrade" invitation -- the weakest signal
//      that still cleared both gates above, usually upsell copy worded like
//      a receipt rather than an actual one.
//   4. Everything else that passed looksLikeReceipt/hasSubscriptionEvidence
//      but doesn't fit any of the above.
const REDEEM_RE =
  /\b(redeem|claim your|trial (will end|ends|ending|expires)|update (your )?payment|payment (declined|failed)|keep (your|the) (benefits|access))\b/i;
const SUBSCRIBE_INVITE_RE =
  /\b(subscribe now|get .*(premium|pro)\b|join .*(premium|pro|one)\b|upgrade to|start your (free trial|subscription)|unlock premium|welcome to prime)\b/i;
function classifyEvidenceTier(text: string, isReceipt: boolean, hasAmount: boolean, hasChargeDate: boolean): number {
  // isReceipt is required, not just hasAmount/hasChargeDate on their own --
  // confirmed on a real account: a "Welcome to Netflix"/signup email (only
  // in the queue at all because of the known-sender lifecycle fallback, see
  // LIFECYCLE_RE) can still contain a plan-comparison table with real-
  // looking prices ("Basic ₹149, Standard ₹649..."), which guessAmount()
  // has no way to tell apart from an actual charge. Without gating on
  // isReceipt too, that marketing table got tier 1 -- "confident, priced
  // evidence" -- for a subscription that was never actually billed.
  if (isReceipt && (hasAmount || hasChargeDate)) return 1;
  if (REDEEM_RE.test(text)) return 2;
  if (SUBSCRIBE_INVITE_RE.test(text)) return 3;
  return 4;
}

// Same disclaimer as guessAmount/guessBillingCycle -- looks for a date near
// words like "date"/"charged"/"billed", or a bare ISO date, not a real
// invoice parser. Finds when THIS receipt's charge happened, not when the
// NEXT one will -- projectNextRenewal below does that part.
const MONTH_DAY_YEAR_RE = /\b(?:date|charged|billed)\D{0,10}(\d{1,2})[\/\-\s](\w{3,9})[\/\-\s](\d{2,4})\b/i;
// Same idea, opposite word order -- "Date September 26, 2026" (month name
// first) instead of "date 26 September 2026". Confirmed missing on a real
// receipt (Spotify's own "Item(s) Premium Standard Date September 26, 2026"
// wording) -- without this, that email's charge date silently never gets
// found at all, even though it's sitting right there in plain text.
// [^\w]{0,5}, not \D{0,10} -- \D still matches letters (anything non-digit),
// so a greedy \D{0,10} here backtracks INTO the month name itself and
// happily captures "ber" out of "September" instead of the whole word
// (confirmed by directly testing this exact regex against the real Spotify
// receipt text -- it produced an Invalid Date). Restricting the gap to
// non-word characters only (whitespace/colon/etc.) can't eat into a \w word.
const MONTH_NAME_FIRST_RE = /\b(?:date|charged|billed)[^\w]{0,5}(\w{3,9})\s+(\d{1,2}),?\s+(\d{2,4})\b/i;
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
function guessChargeDate(text: string): Date | null {
  const monthDayMatch = text.match(MONTH_DAY_YEAR_RE);
  if (monthDayMatch) {
    const parsed = new Date(`${monthDayMatch[2]} ${monthDayMatch[1]}, ${monthDayMatch[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const monthNameFirstMatch = text.match(MONTH_NAME_FIRST_RE);
  if (monthNameFirstMatch) {
    const parsed = new Date(`${monthNameFirstMatch[1]} ${monthNameFirstMatch[2]}, ${monthNameFirstMatch[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const isoMatch = text.match(ISO_DATE_RE);
  if (isoMatch) {
    const parsed = new Date(isoMatch[0]);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

// Rolls a known-past charge date forward by the billing cycle until it's in
// the future -- a July 25 monthly charge found by a scan in September
// becomes "next renewal ~Sept 25", not the date the email itself was sent.
function projectNextRenewal(chargeDate: Date, cycle: "monthly" | "quarterly" | "yearly"): string {
  const monthsPerCycle = { monthly: 1, quarterly: 3, yearly: 12 }[cycle];
  const next = new Date(chargeDate);
  const today = new Date();
  while (next <= today) next.setMonth(next.getMonth() + monthsPerCycle);
  return next.toISOString().slice(0, 10);
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

const SCAN_COOLDOWN_SECONDS = 600;

// Upstash Redis over its REST API (plain fetch, no npm import -- npm imports
// have failed to boot in this edge runtime before). Returns 0 when the scan
// may proceed, or the seconds left on the cooldown. Fails open: if Upstash
// isn't configured or is unreachable, scanning is never blocked by it.
async function claimScanSlot(userId: string): Promise<number> {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return 0;

  const key = `scan:cooldown:${userId}`;
  const command = async (args: (string | number)[]) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    return (await res.json()).result;
  };

  try {
    const claimed = await command(["SET", key, "1", "NX", "EX", SCAN_COOLDOWN_SECONDS]);
    if (claimed === "OK") return 0;
    const ttl = Number(await command(["TTL", key]));
    return ttl > 0 ? ttl : 0;
  } catch (err) {
    console.error("gmail-scan-subscriptions: cooldown check failed, allowing scan", err);
    return 0;
  }
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

    const waitSeconds = await claimScanSlot(user.id);
    if (waitSeconds > 0) {
      const minutes = Math.ceil(waitSeconds / 60);
      return new Response(
        JSON.stringify({ error: `You can scan again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` }),
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(waitSeconds) } }
      );
    }

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

    // Restricted to Gmail's own "Purchases" category ONLY -- this is a
    // deliberate privacy/data-minimization boundary, not just a relevance
    // filter: the app's privacy policy specifically tells users Gmail data
    // collection is scoped to receipt/purchase-type mail, and an earlier
    // version of this query also matched a broad keyword list (subscription,
    // renewal, receipt, invoice, etc.) across subject/body TEXT ANYWHERE IN
    // THE INBOX, not just Gmail's own Purchases classification -- that's a
    // materially wider scan than what's disclosed. category:purchases is
    // Gmail's own classifier decision, made before this app ever sees
    // anything, so nothing outside it is ever fetched at all now. This does
    // mean a genuine receipt Gmail itself didn't happen to tag as a purchase
    // (rare for real e-commerce/subscription mail, but possible) won't be
    // found -- a real precision/recall tradeoff made deliberately in favor
    // of the narrower, more defensible data-collection claim.
    //
    // NOISY_NON_SUBSCRIPTION_DOMAINS: ride-hailing/food-delivery/generic
    // e-commerce/payment-gateway-donation mail (Uber, Zomato, Amazon,
    // Swiggy, BigBasket, Instamart, Razorpay) is also genuinely
    // Gmail-categorized as "Purchases" (they're real purchase confirmations)
    // but confirmed via a real-account diagnostic to be ~30% of every match
    // with almost never a subscription -- excluded to keep the review queue
    // (and the MAX_MESSAGES budget) usable, not to widen scope beyond
    // Purchases.
    const NOISY_NON_SUBSCRIPTION_DOMAINS = [
      "uber.com",
      "zomato.com",
      "swiggy.in",
      "amazon.in",
      "amazon.com",
      "bigbasket.com",
      "instamart.in",
      "razorpay.com",
      "redditmail.com",
    ];
    const exclusionClause = NOISY_NON_SUBSCRIPTION_DOMAINS.map((d) => `-from:${d}`).join(" ");
    const query = `newer_than:180d category:purchases ${exclusionClause}`;
    const MAX_MESSAGES = 200;

    let pageToken: string | undefined;
    const messageIds: string[] = [];
    do {
      const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      listUrl.searchParams.set("q", query);
      listUrl.searchParams.set("maxResults", "100");
      if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

      const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const listData = await listRes.json();
      if (!listRes.ok) {
        console.error("gmail-scan-subscriptions: Gmail list failed", listData);
        return new Response(JSON.stringify({ error: "Gmail search failed", details: listData }), { status: 502, headers: corsHeaders });
      }
      messageIds.push(...(listData.messages ?? []).map((m: { id: string }) => m.id));
      pageToken = listData.nextPageToken;
    } while (pageToken && messageIds.length < MAX_MESSAGES);

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

      const { name: parsedName, domain } = parseFromHeader(from);
      const combinedText = `${subject} ${bodyText || snippet}`;

      // Known senders keep their curated display name/logo, same as before.
      // A domain lookup is only correct when the sender domain BELONGS to
      // the service (netflix.com is genuinely Netflix) -- it breaks down for
      // a billing intermediary like Google Play, where the sender is always
      // "Google Play" regardless of which actual app is being paid for.
      // Confirmed on a real account: Claude Pro, Google One, and an
      // unrelated fitness app (BodBot) were all silently merged into one
      // "Google Play" bucket and approved as a single wrong subscription.
      // PRODUCT_NAME_HINTS catches the well-known cases by body content
      // first; GOOGLE_PLAY_MERCHANT_RE generically extracts "X" from "...
      // from X on Google Play" wording for anything else routed through
      // Google Play specifically. Neither touches the receipt/subscription
      // GATING below -- that still depends only on the real sender domain,
      // or an Uber email that happens to namedrop "Claude" in passing could
      // start getting treated as a trusted curated sender.
      const productHint = PRODUCT_NAME_HINTS.find((h) => h.pattern.test(combinedText));
      const merchantMatch = combinedText.match(GOOGLE_PLAY_MERCHANT_RE);
      const known = KNOWN_SENDERS.find((s) => domain === s.domain || domain.endsWith(`.${s.domain}`));
      const serviceName = productHint?.serviceName ?? merchantMatch?.[1]?.trim() ?? known?.serviceName ?? parsedName;
      const iconKey = productHint?.iconKey ?? known?.iconKey ?? null;

      const isReceipt = looksLikeReceipt(combinedText);
      // Curated senders are a known, trusted, short list of actual
      // subscription services (not marketplaces) -- for THEM ONLY, a
      // signup/welcome or cancellation email is also enough to at least
      // list the service for manual confirmation, even with no receipt
      // language at all. Found on a real account with zero receipt emails
      // for a service the user is definitely paying for (Netflix -- 17
      // matched emails there were all sign-in codes, content
      // recommendations, and a "Welcome to Netflix" signup email; not one
      // was receipt-shaped) -- without this, a real, known subscription
      // stays permanently invisible to the scanner just because its
      // provider's receipts don't happen to land in this inbox. The price
      // still isn't guessed from these (no receipt = no guessedAmount), so
      // the user types it in when approving, same as any other blank-price
      // candidate already does.
      const isKnownServiceLifecycleSignal = !!known && LIFECYCLE_RE.test(combinedText);
      if (!isReceipt && !isKnownServiceLifecycleSignal) {
        console.log("gmail-scan-subscriptions: skipping non-receipt email from", serviceName);
        continue;
      }
      // Everything NOT on the curated list still needs actual
      // subscription/recurring wording on top of receipt evidence, or Uber
      // rides, Zomato orders, Amazon purchases and Razorpay donations all
      // flood in too (every one of them is receipt-shaped).
      if (!known && !hasSubscriptionEvidence(combinedText)) {
        console.log("gmail-scan-subscriptions: skipping one-off receipt (no subscription wording) from", serviceName);
        continue;
      }
      // A price/date found in a non-receipt email (only in the queue at all
      // via the known-sender LIFECYCLE_RE fallback) is not trustworthy --
      // confirmed on a real account: a "Welcome to Netflix" signup email's
      // plan-comparison table ("Basic ₹149, Standard ₹649...") produced a
      // confident-looking ₹649 guess for a subscription that was never
      // actually billed. Only ever extract amount/date from something that
      // actually reads like a receipt.
      const guessedMoney = isReceipt ? guessAmount(combinedText) : null;
      const guessedCycle = guessBillingCycle(combinedText);
      const chargeDate = isReceipt ? guessChargeDate(combinedText) : null;
      const guessFields = {
        guessed_amount: guessedMoney?.amount ?? null,
        guessed_currency: guessedMoney?.currency ?? "USD",
        guessed_billing_cycle: guessedCycle,
        guessed_next_renewal_date: chargeDate ? projectNextRenewal(chargeDate, guessedCycle) : null,
        source_snippet: snippet.slice(0, 300),
        evidence_tier: classifyEvidenceTier(combinedText, isReceipt, guessedMoney != null, chargeDate != null),
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
          service_name: serviceName,
          icon_key: iconKey,
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
