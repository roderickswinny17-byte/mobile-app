import type { ReactElement } from "react";

// Web has no @stripe/stripe-react-native build to wrap children in, so this
// is a plain passthrough. Metro picks this file automatically when bundling
// for web (see StripeRootProvider.tsx for the native implementation).
const StripeRootProvider = ({ children }: { children: ReactElement }) => children;

export default StripeRootProvider;
