import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

// Create these Prices in the Stripe Dashboard first, then paste their IDs here.
const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  "subscription-a": {
    monthly: "price_XXXXXXXX",
    yearly: "price_YYYYYYYY",
  },
};

Deno.serve(async (req) => {
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
});
