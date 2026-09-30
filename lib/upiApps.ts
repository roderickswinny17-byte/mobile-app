import { Linking } from "react-native";

export type UpiApp = {
  key: string;
  label: string;
  scheme: string;
  androidPackage: string;
  navigationHint: string;
};

// Custom URL schemes these apps register for UPI intents -- opens the app
// itself, nothing more specific: confirmed via research (Google Pay's own
// help docs, Paytm's own docs) that none of these apps publish a deep link
// into an existing mandate's management screen for a particular merchant,
// or even into the Autopay/Mandates list itself -- the only documented path
// is manual in-app navigation, hence navigationHint below (based on each
// app's own published instructions, not guessed). phonepe:// and paytmmp://
// are long-standing, widely documented UPI-intent schemes; gpay:// and
// bhim:// are less certain -- verify on a real device before relying on
// them, and drop whichever doesn't reliably open the app.
export const UPI_APPS: UpiApp[] = [
  {
    key: "phonepe",
    label: "PhonePe",
    scheme: "phonepe://",
    androidPackage: "com.phonepe.app",
    navigationHint: "Tap your profile icon, then scroll to \"AutoPay\"",
  },
  {
    key: "paytm",
    label: "Paytm",
    scheme: "paytmmp://",
    androidPackage: "net.one97.paytm",
    navigationHint: "Go to \"Balance & History\" (or \"My Paytm\"), then \"UPI AutoPay\"",
  },
  {
    key: "gpay",
    label: "Google Pay",
    scheme: "gpay://",
    androidPackage: "com.google.android.apps.nbu.paisa.user",
    navigationHint: "Tap your profile picture (top right), then \"Autopay\"",
  },
  {
    key: "bhim",
    label: "BHIM",
    scheme: "bhim://",
    androidPackage: "in.org.npci.upiapp",
    navigationHint: "Look for \"Mandates\" in the app menu",
  },
];

export async function openUpiApp(app: UpiApp) {
  const canOpen = await Linking.canOpenURL(app.scheme);
  if (canOpen) {
    await Linking.openURL(app.scheme);
    return;
  }
  // Not installed (or the scheme isn't registered) -- same Play Store
  // fallback pattern used elsewhere in the app (see billing_url handling).
  await Linking.openURL(`https://play.google.com/store/apps/details?id=${app.androidPackage}`);
}
