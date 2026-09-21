import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { supabase } from "@/lib/supabase";

const Payment = () => {
  const { planId, cycle } = useLocalSearchParams<{
    planId: string;
    cycle: "monthly" | "yearly";
  }>();
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
    <View className="flex-1 gap-4 bg-background px-6 pt-16">
      <Text className="font-sans-bold text-2xl text-on-background">Payment Details</Text>
      <Text className="font-sans text-sm text-on-surface-variant">
        {planId} · {cycle}
      </Text>

      <CardField
        postalCodeEnabled={false}
        placeholders={{ number: "4242 4242 4242 4242" }}
        cardStyle={{ backgroundColor: "#1c1b1b", textColor: "#e5e2e1" }}
        style={{ height: 50, marginVertical: 12 }}
        onCardChange={(details) => setCardComplete(details.complete)}
      />

      {error ? <Text className="font-sans text-error">{error}</Text> : null}

      <TouchableOpacity
        onPress={handlePay}
        disabled={loading}
        className="items-center rounded-lg bg-primary px-6 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#003914" />
        ) : (
          <Text className="font-sans-medium text-on-primary">Subscribe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default Payment;
