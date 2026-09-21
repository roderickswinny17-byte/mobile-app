import { useState } from "react";
import { Pressable, Text } from "react-native";
import type { Profile } from "@/hooks/useProfile";
import { ProfileInfoModal } from "./ProfileInfoModal";

type Props = { profile: Profile | null; plan: string };

export function ProfileBadge({ profile, plan }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high"
      >
        <Text className="text-xl">🙂</Text>
      </Pressable>
      <ProfileInfoModal visible={visible} onClose={() => setVisible(false)} profile={profile} plan={plan} />
    </>
  );
}
