# Voola — Progress Tracker

_Last updated: 2026-09-28, from `git log` (14 commits, `672ce30` → `38e1aa3`)._

## Current Phase

**Subscription tracking & Gmail-based auto-detection**, on Expo SDK 57 (`react-native` 0.86, React 19.2, TypeScript 6). The app's original mood/songs feature has been fully removed and replaced by a subscription-tracking product: manual tracked subscriptions, Stripe-billed in-app plans, and Gmail OAuth + receipt scanning that auto-detects recurring charges.

## Completed Work

### Foundation
- Scaffolded from `create-expo-app` (`672ce30`), then rebuilt into Voola's dark theme/design system, Expo Router structure (root `Stack`, `(auth)` / `(tabs)` groups), tab bar with real screens, and onboarding/sign-in/sign-up screens (`3bdeb8c`).
- Supabase email/password auth wired up, with a `profiles` table auto-populated via a security-definer trigger on signup and RLS locking every user to their own row (insert/delete revoked from client roles) (`67803d7`).

### Payments
- Home/settings/subscriptions screens wired to Supabase profile + Stripe `CardField`; two Edge Functions (`create-payment-intent`, `confirm-subscription`) create the PaymentIntent and re-verify payment status server-side before writing the subscription row, so raw card data never touches the app or Supabase (`2745edd`).
- Follow-up hardening once real testing began:
  - Fixed placeholder Stripe Price IDs and made both Edge Functions return actual failure reasons instead of an opaque 500/non-2xx message (`1ea63a1`).
  - Added an `invokeWithRetry()` that retries once specifically on `FunctionsFetchError` (dropped connection/timeout/cold start) with a clearer "couldn't reach the server" message, distinct from server-side errors (`991495a`).
  - Added step-by-step `console.log`/`describeError()` logging through both Edge Functions so failures are traceable in Supabase Dashboard logs stage-by-stage (`737053f`).

### Expo SDK upgrade (54 → 57)
- Checkpoint commit before starting the upgrade, bundling in the mood/songs feature and a `GestureDetector`/`TouchableOpacity` → `Pressable` fix (RNGH's Pan gesture was swallowing legacy Touchable presses), plus an Expo Go crash fix (Stripe's native card form only mounts outside Expo Go) (`bbc5bfd`).
- Three sequential hops, each verified with `expo-doctor`, `tsc`, lint, and a live/Playwright pass:
  - 54→55 (`4448616`): dependency bump, cleaned up app.json schema fields expo-doctor flagged.
  - 55→56 (`862e842`): removed dead `@react-navigation/*` packages (superseded by expo-router's own `Tabs`); noted a known Hermes V1 memory regression in SDK 56.
  - 56→57 (`9df12de`, final hop): lands the Hermes V1 fix; fixed a new `react-hooks/set-state-in-effect` lint error in `settings.tsx` by moving profile-sync to render-phase state. Native (Android/iOS) behavior was **not** verified in that session — no device/emulator available.

### Songs/mood feature (since removed)
- Added a local placeholder catalog (`lib/songs.ts`, 20 royalty-free SoundHelix tracks across 4 moods) so the mood → songs → playback flow could be tested without a Jamendo API key; `useSongs.ts` filtered this local catalog while keeping the Supabase `songs` table/seed script intact for later (`9d805f4`). Also folded in `eas build:configure` output (`eas.json`, media-playback permissions, `expo-dev-client`).
- **This entire feature (`app/(tabs)/songs/[mood].tsx`, `lib/songs.ts`, `lib/moods.ts`, `hooks/useSongs.ts`, `scripts/seed-songs.mjs`) was removed in `38e1aa3`** in favor of subscription tracking.

### Subscription tracking
- Added personal subscription-charge tracking to the Subscriptions tab: a new "Your Subscriptions" section (separate from the app's own Stripe-billed plan) where users log external recurring charges (Netflix, Spotify, etc.), see a running monthly-equivalent total (`lib/subscriptionMath.ts` normalizes yearly costs), add via modal, remove via long-press. New `tracked_subscriptions` table, RLS-scoped per user (`1e797a5`).
- Major feature commit — Gmail-based auto-detection and multi-account support (`38e1aa3`):
  - Gmail OAuth (`gmail-oauth-start`, `gmail-oauth-callback`) + `gmail-scan-subscriptions` Edge Function that scans receipts and populates a review queue (`app/(tabs)/subscriptions/detected.tsx`).
  - Cross-profile subscription summaries (`linked-summary.tsx`, `useLinkedProfiles`, `useLinkedSubscriptions`).
  - Instant multi-account switcher (`useAccountSwitcher`, `lib/accountSessions.ts`).
  - Custom calendar/date picker (`components/DatePickerModal.tsx`) for next-payment dates with per-cycle validation.
  - New `add.tsx` / `edit/[id].tsx` screens, `SubscriptionRow` / `AppIcon` components, currency + exchange-rate support (`lib/currency.ts`, `useExchangeRates`), theme preference support (`useThemePreference`, `useThemeColors`).
  - Bug-fix pass: stale data on tab revisit, decoding/detection bugs in the Gmail scanner, duplicate detected subscriptions, error surfacing on failed fetches, plus UI polish across Settings and the bottom nav bar.
  - `supabase/schema.sql` grew substantially (+245 lines) to support Gmail-linked accounts and detected subscriptions.

## In Progress

- **Migrating the EAS project from `shashank1-43` to `voola_software_solutions`.** `app.json` now points at the new project (`slug: subscription-tracker`, `owner: voola_software_solutions`, `extra.eas.projectId: a21c2a06-d95c-4251-be73-9eb5b061f0e7`), and the Android `package` was renamed `com.anonymous.mobileapp` → `com.voola.mobileapp.subscriptiontracker` (safe since nothing's been submitted to the Play Store yet). Not committed yet. This is a fresh, independent project under `voola` — not a live transfer of the old one — so deleting anything under `shashank1-43` afterward won't affect it. Blocked on the EAS CLI being logged in as an account with access to `voola_software_solutions` (currently still `vavilala.shashank100@gmail.com`, which has none) before a build can actually be triggered there.

## Open Questions

- **Native builds untested end-to-end.** No Android/iOS device or emulator has been available in the dev environment since the SDK 57 upgrade (`9df12de`) — only web/Playwright passes have been verified. The original motivating issue (Expo Go SDK mismatch) still needs confirming by opening the project in Expo Go on a real device.
- **Authenticated round-trip for tracked subscriptions unverified.** `1e797a5`'s add/remove flow was only validated up to Supabase's signup rate limit in Playwright (hit from repeated test-account creation); the modal renders/validates correctly but a full authenticated add → list → remove cycle needs manual confirmation on an already-signed-in device.
- **Jamendo integration abandoned, not resolved.** The songs/mood feature was scoped around getting a Jamendo `client_id` for real content, but the whole feature was later removed rather than completed — worth confirming this is a deliberate pivot away from music entirely, not just deferred.
- **Payment flow reliability.** The retry/logging work (`991495a`, `737053f`) treats Edge Function network failures as "inherently flaky mobile network," not a proven code defect — no root cause was ever confirmed, just resilience added around the symptom.
- **Gmail scanner accuracy.** `38e1aa3`'s bug-fix pass (decoding/detection bugs, duplicate detected subscriptions) suggests the scanning heuristics are still maturing; no mention of a systematic accuracy/false-positive check.

## Next Steps

1. Verify native (Android/iOS) behavior on a real device/emulator — SDK 57 upgrade and all subsequent feature work have only been checked via web/Playwright.
2. Complete an authenticated manual test of add/list/remove for both tracked subscriptions and Gmail-detected subscriptions.
3. Decide the fate of the Jamendo-backed songs table/seed script (`supabase/schema.sql`, `scripts/seed-songs.mjs` history) — either formally drop it from the schema or document why it's kept dormant.
4. Continue hardening the Gmail scanner (decoding edge cases, dedup logic) given the pattern of bugs found immediately after shipping it.
5. Consider adding automated/integration test coverage for the payment and Gmail-scan Edge Functions, since verification so far has been manual (Playwright + live log reading) rather than repeatable tests.
