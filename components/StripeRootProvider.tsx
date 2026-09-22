import type { ReactElement } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

// Native (iOS/Android) implementation. @stripe/stripe-react-native has no
// web build at all, so this file must never be imported while bundling for
// web -- see StripeRootProvider.web.tsx, which Metro picks instead there.
const StripeRootProvider = ({ children }: { children: ReactElement }) => (
  <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}>
    {children}
  </StripeProvider>
);

export default StripeRootProvider;
