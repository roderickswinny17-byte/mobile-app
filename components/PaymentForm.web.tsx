import { Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

// Web fallback -- see PaymentForm.tsx for why the real Stripe implementation
// can't live here. A real web checkout needs a separate integration
// (Stripe.js + Elements, or Stripe Checkout); this is a placeholder.
type Props = { planId: string; cycle: "monthly" | "yearly" };

const PaymentForm = ({ planId, cycle }: Props) => (
  <>
    <Text className="text-center font-sans text-on-surface-variant">
      Payments aren&apos;t available on web yet ({planId} · {cycle}). Open this app on iOS or
      Android to subscribe.
    </Text>
    <TouchableOpacity
      onPress={() => router.replace("/subscriptions")}
      className="items-center rounded-lg bg-primary px-6 py-4"
    >
      <Text className="font-sans-medium text-on-primary">Back to Subscription</Text>
    </TouchableOpacity>
  </>
);

export default PaymentForm;
