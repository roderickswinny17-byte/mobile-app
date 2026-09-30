import { Modal, Pressable, Text, View } from "react-native";
import { UPI_APPS, openUpiApp } from "@/lib/upiApps";

type Props = { visible: boolean; onClose: () => void };

// Same bottom-sheet pattern as Settings' gear-icon sheet. Picking an app
// opens it (or its Play Store listing if not installed) and closes the
// sheet -- there's nowhere more specific to land the user on. Confirmed via
// research that none of these apps publish a deep link into an existing
// mandate's screen, or even their Autopay/Mandates list -- each app's own
// navigationHint is the real, documented manual path instead of a guess.
export function UpiAppPicker({ visible, onClose }: Props) {
  const handlePick = async (appKey: string) => {
    const app = UPI_APPS.find((a) => a.key === appKey);
    if (app) await openUpiApp(app);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="gap-3 rounded-t-2xl bg-background p-5 pb-8">
          <Text className="font-display-medium text-lg text-on-background">Open UPI App</Text>
          <Text className="-mt-1 font-sans text-xs text-on-surface-variant">
            No UPI app lets us jump straight to a specific mandate -- here&apos;s exactly where to look once it
            opens.
          </Text>
          {UPI_APPS.map((app) => (
            <Pressable
              key={app.key}
              onPress={() => handlePick(app.key)}
              className="gap-1 rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
            >
              <Text className="font-sans-semibold text-sm text-on-surface">{app.label}</Text>
              <Text className="font-sans text-[11px] text-on-surface-variant">{app.navigationHint}</Text>
            </Pressable>
          ))}
          <Text className="font-sans text-[10px] text-on-surface-variant">
            Cancelling the UPI mandate stops the charge, but it doesn&apos;t cancel the subscription itself --
            do both, or the service may still consider you subscribed.
          </Text>
          <Pressable onPress={onClose} className="items-center rounded-lg border border-outline-variant py-3">
            <Text className="font-sans-medium text-on-surface">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
