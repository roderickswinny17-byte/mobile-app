import { Modal, Pressable, Text, View } from "react-native";
import type { Profile } from "@/hooks/useProfile";

type Props = {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
  plan: string;
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="gap-1">
    <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
      {label}
    </Text>
    <Text className="font-sans text-base text-on-surface">{value}</Text>
  </View>
);

export function ProfileInfoModal({ visible, onClose, profile, plan }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="gap-4 rounded-t-2xl border border-outline-variant bg-surface-container p-6">
          <Text className="font-sans-bold text-xl text-on-background">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <InfoRow label="Email" value={profile?.email ?? "—"} />
          <InfoRow label="Phone number" value={profile?.phone_number ?? "Not set"} />
          <InfoRow label="Plan" value={plan} />
          <Pressable onPress={onClose} className="mt-2 items-center rounded-lg bg-primary px-6 py-4">
            <Text className="font-sans-medium text-on-primary">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
