import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import Constants, { ExecutionEnvironment } from "expo-constants";
import StripeCardPaymentForm from "./StripeCardPaymentForm";

// Native (iOS/Android) implementation. @stripe/stripe-react-native has no
// web build, so this must live outside app/ -- Expo Router's route manifest
// eagerly requires every file under a route path (including .web.tsx
// siblings), which defeats a platform split done at the route-file level.
// See PaymentForm.web.tsx for the web fallback Metro picks there instead.
//
// Expo Go doesn't bundle @stripe/stripe-react-native's native code at all
// (it's a third-party native module, not part of the core Expo SDK), so
// mounting its native <CardField> view or calling useStripe() there crashes
// the whole JS runtime -- which looks like "nothing happens, then Expo Go
// kicks you back to its connect screen". Gate on that instead of crashing:
// StripeCardPaymentForm only ever mounts when we're not in Expo Go.
type Props = { planId: string; cycle: "monthly" | "yearly" };

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const PaymentForm = ({ planId, cycle }: Props) => {
  if (isExpoGo) {
    return (
      <>
        <Text className="text-center font-sans text-on-surface-variant">
          Real payments need a development build -- Expo Go doesn&apos;t include Stripe&apos;s
          native SDK. Run `npx expo run:android` (or an EAS development build) to test this
          screen for real.
        </Text>
        <Pressable
          onPress={() => router.replace("/subscriptions")}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="font-sans-medium text-on-primary">Back to Subscription</Text>
        </Pressable>
      </>
    );
  }

  return <StripeCardPaymentForm planId={planId} cycle={cycle} />;
};

export default PaymentForm;
