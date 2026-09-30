import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";

// "i" icon that shows a short info bubble on tap (mobile) AND on hover
// (web -- onHoverIn/onHoverOut are real events under react-native-web, no-ops
// on native, so this one component covers both without branching). No
// outside-tap-to-dismiss on mobile yet -- tapping the icon again is the only
// way to close it there.
export function InfoTooltip({ text }: { text: string }) {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);

  return (
    <View className="relative items-center justify-center">
      <Pressable
        onPress={() => setVisible((v) => !v)}
        onHoverIn={() => setVisible(true)}
        onHoverOut={() => setVisible(false)}
        hitSlop={8}
      >
        <Ionicons name="information-circle-outline" size={18} color={colors.onSurfaceVariant} />
      </Pressable>
      {visible ? (
        <View className="absolute bottom-6 right-0 z-10 w-56 rounded-lg border border-outline-variant bg-surface-container p-2.5">
          <Text className="font-sans text-[11px] text-on-surface">{text}</Text>
        </View>
      ) : null}
    </View>
  );
}
