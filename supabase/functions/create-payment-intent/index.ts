import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  "subscription-a": {
    monthly: "price_1UI1lBGY9w7pYyfke2CEp4IA",
    yearly: "price_1UI1puGY9w7pYyfkoSvzbgNo",
  },
};

Deno.serve(async (req) => {
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
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { planId, billingCycle } = await req.json();
    const price = PLAN_PRICES[planId]?.[billingCycle as "monthly" | "yearly"];
    if (!price) {
      return new Response(JSON.stringify({ error: "Unknown plan" }), { status: 400 });
    }

    const customer = await stripe.customers.create({ email: user.email });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    // deno-lint-ignore no-explicit-any
    const paymentIntent = (subscription.latest_invoice as any).payment_intent;

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, subscriptionId: subscription.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Surface the real reason (e.g. "No such price", a Stripe auth error,
    // a malformed request) instead of the client only ever seeing a bare
    // "non-2xx status code" with no way to tell what actually went wrong.
    console.error("create-payment-intent failed:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
