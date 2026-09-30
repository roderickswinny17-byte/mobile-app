import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDetectedSubscriptions } from "@/hooks/useDetectedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";

// Shows on the Subscriptions tab whenever there's a pending Gmail review
// queue -- closes the gap where a scan finds real subscriptions but nothing
// visible changes unless you already know to check "Found in Gmail"
// specifically. Stays visible until every candidate is approved/dismissed,
// not just right after a scan.
export function DetectedSubscriptionsPrompt() {
  const { groups } = useDetectedSubscriptions();
  const colors = useThemeColors();
  const count = groups.length;
  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => router.push("/subscriptions/detected")}
      className="flex-row items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4"
    >
      <Ionicons name="mail-unread-outline" size={20} color={colors.onBackground} />
      <Text className="flex-1 font-sans-semibold text-sm text-on-background">
        {count} subscription{count > 1 ? "s" : ""} found in Gmail -- tap to review
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}
