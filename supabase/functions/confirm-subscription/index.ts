import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

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

    const { subscriptionId, planId, billingCycle } = await req.json();

    // Re-check with Stripe directly -- never trust the client's word that
    // payment succeeded.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    // deno-lint-ignore no-explicit-any
    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;

    if (paymentIntent?.status !== "succeeded") {
      return new Response(JSON.stringify({ error: "Payment not confirmed" }), { status: 400 });
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);

    // service_role key -- server-only, intentionally bypasses RLS as the one
    // trusted writer for this table.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: writeError } = await supabaseAdmin.from("subscriptions").insert({
      user_id: user.id,
      plan: planId,
      billing_cycle: billingCycle,
      status: "active",
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      card_brand: paymentMethod.card?.brand ?? null,
      card_last4: paymentMethod.card?.last4 ?? null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    if (writeError) {
      return new Response(JSON.stringify({ error: writeError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("confirm-subscription failed:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
