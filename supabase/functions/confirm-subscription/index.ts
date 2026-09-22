import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

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
  console.log("confirm-subscription: request received");

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
      console.error("confirm-subscription: auth failed", userError);
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }
    console.log("confirm-subscription: authenticated as", user.id, user.email);

    const { subscriptionId, planId, billingCycle } = await req.json();
    console.log("confirm-subscription: request body", { subscriptionId, planId, billingCycle });

    // Re-check with Stripe directly -- never trust the client's word that
    // payment succeeded.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    console.log("confirm-subscription: retrieved Stripe subscription", {
      id: subscription.id,
      status: subscription.status,
    });

    // deno-lint-ignore no-explicit-any
    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
    console.log("confirm-subscription: payment intent status", paymentIntent?.status);

    if (paymentIntent?.status !== "succeeded") {
      console.error("confirm-subscription: payment not confirmed", {
        paymentIntentId: paymentIntent?.id,
        status: paymentIntent?.status,
      });
      return new Response(JSON.stringify({ error: "Payment not confirmed" }), { status: 400 });
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
    console.log("confirm-subscription: retrieved payment method", {
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
    });

    // service_role key -- server-only, intentionally bypasses RLS as the one
    // trusted writer for this table.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const insertPayload = {
      user_id: user.id,
      plan: planId,
      billing_cycle: billingCycle,
      status: "active",
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      card_brand: paymentMethod.card?.brand ?? null,
      card_last4: paymentMethod.card?.last4 ?? null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    };
    console.log("confirm-subscription: writing subscriptions row", insertPayload);

    const { error: writeError } = await supabaseAdmin.from("subscriptions").insert(insertPayload);

    if (writeError) {
      console.error("confirm-subscription: Supabase write failed", writeError);
      return new Response(JSON.stringify({ error: writeError.message }), { status: 500 });
    }
    console.log("confirm-subscription: success");

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("confirm-subscription: unhandled exception", describeError(err));
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
