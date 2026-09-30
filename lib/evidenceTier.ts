// Mirrors classifyEvidenceTier in supabase/functions/gmail-scan-subscriptions
// -- human-readable versions of the same 1 (best) - 4 (weakest) scale, for
// the "what does this email actually represent" drill-down screen.
export function evidenceTierLabel(tier: number): string {
  switch (tier) {
    case 1:
      return "Receipt with billing details";
    case 2:
      return "Redeem / trial-ending notice";
    case 3:
      return "Subscribe invitation";
    default:
      return "Weak signal";
  }
}

export function evidenceTierDescription(tier: number): string {
  switch (tier) {
    case 1:
      return "Includes an actual charge amount and/or date -- the strongest evidence of a real subscription payment.";
    case 2:
      return "About redeeming a benefit, an ending trial, or a declined payment -- proof the subscription is active, but not a clean receipt.";
    case 3:
      return "An invitation to subscribe or upgrade -- marketing copy, not proof you're actually being charged.";
    default:
      return "Mentions the service, but doesn't clearly show a charge, renewal, or invitation on its own.";
  }
}
