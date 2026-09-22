import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  "subscription-a": {
    monthly: "price_1UI1lBGY9w7pYyfke2CEp4IA",
    yearly: "price_1UI1puGY9w7pYyfkoSvzbgNo",
  },
};

// Stripe's SDK errors carry far more than .message -- type/code/statusCode
// pinpoint exactly what Stripe rejected and why, instead of a vague string.
// deno-lint-ignore no-explicit-any
function describeError(err: any) {
  return {
    message: err?.message,
    type: err?.type,
    code: err?.code,
    statusCode: err?.statusCode,
    rawMessage: err?.raw?.message,
  };
}

Deno.serve(async (req) => {
  console.log("create-payment-intent: request received");

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
      console.error("create-payment-intent: auth failed", userError);
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }
    console.log("create-payment-intent: authenticated as", user.id, user.email);

    const { planId, billingCycle } = await req.json();
    console.log("create-payment-intent: request body", { planId, billingCycle });

    const price = PLAN_PRICES[planId]?.[billingCycle as "monthly" | "yearly"];
    if (!price) {
      console.error("create-payment-intent: unknown plan", { planId, billingCycle });
      return new Response(JSON.stringify({ error: "Unknown plan" }), { status: 400 });
    }
    console.log("create-payment-intent: resolved price", price);

    const customer = await stripe.customers.create({ email: user.email });
    console.log("create-payment-intent: created Stripe customer", customer.id);

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
    console.log("create-payment-intent: created Stripe subscription", {
      id: subscription.id,
      status: subscription.status,
    });

    // deno-lint-ignore no-explicit-any
    const paymentIntent = (subscription.latest_invoice as any).payment_intent;
    if (!paymentIntent?.client_secret) {
      console.error("create-payment-intent: no payment_intent on latest_invoice", {
        latestInvoiceId: (subscription.latest_invoice as { id?: string })?.id,
      });
      return new Response(JSON.stringify({ error: "Stripe did not return a payment intent" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log("create-payment-intent: success, payment intent", paymentIntent.id);

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, subscriptionId: subscription.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Surface the real reason (e.g. "No such price", a Stripe auth error,
    // a malformed request) instead of the client only ever seeing a bare
    // "non-2xx status code" with no way to tell what actually went wrong.
    console.error("create-payment-intent: unhandled exception", describeError(err));
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
