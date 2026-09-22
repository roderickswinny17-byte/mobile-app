import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { router } from "expo-router";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { supabase } from "@/lib/supabase";

// The real Stripe card-entry UI. Only ever mounted when PaymentForm.tsx has
// confirmed we're NOT in Expo Go -- useStripe() and <CardField> both touch
// native code that Expo Go doesn't include, and mounting this component is
// what would actually invoke that native code (importing the JS module
// alone is safe; instantiating <CardField>'s native view and calling into
// useStripe()'s bridge methods is what crashes there).
type Props = { planId: string; cycle: "monthly" | "yearly" };

const StripeCardPaymentForm = ({ planId, cycle }: Props) => {
  const { confirmPayment } = useStripe();

  const [cardComplete, setCardComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!cardComplete) {
      setError("Enter complete card details.");
      return;
    }

    setError(null);
    setLoading(true);

    // Server-side: creates the Stripe subscription + PaymentIntent using
    // the secret key (never in the app) and returns a client secret.
    const { data, error: fnError } = await supabase.functions.invoke("create-payment-intent", {
      body: { planId, billingCycle: cycle },
    });

    if (fnError || !data?.clientSecret) {
      setLoading(false);
      setError(fnError?.message ?? "Could not start payment.");
      return;
    }

    const { error: confirmError } = await confirmPayment(data.clientSecret, {
      paymentMethodType: "Card",
    });

    if (confirmError) {
      setLoading(false);
      setError(confirmError.message);
      return;
    }

    // Re-verifies with Stripe server-side and writes the subscriptions row --
    // the app never asserts "payment succeeded" directly into the database.
    const { error: recordError } = await supabase.functions.invoke("confirm-subscription", {
      body: { subscriptionId: data.subscriptionId, planId, billingCycle: cycle },
    });
    setLoading(false);

    if (recordError) {
      setError(recordError.message);
      return;
    }

    router.replace("/subscriptions");
  };

  return (
    <>
      <CardField
        postalCodeEnabled={false}
        placeholders={{ number: "4242 4242 4242 4242" }}
        cardStyle={{ backgroundColor: "#1c1b1b", textColor: "#e5e2e1" }}
        style={{ height: 50, marginVertical: 12 }}
        onCardChange={(details) => setCardComplete(details.complete)}
      />

      {error ? <Text className="font-sans text-error">{error}</Text> : null}

      <Pressable
        onPress={handlePay}
        disabled={loading}
        className="items-center rounded-lg bg-primary px-6 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#003914" />
        ) : (
          <Text className="font-sans-medium text-on-primary">Subscribe</Text>
        )}
      </Pressable>
    </>
  );
};

export default StripeCardPaymentForm;
