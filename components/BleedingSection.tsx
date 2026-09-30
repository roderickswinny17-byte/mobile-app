import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import { BleedIcon } from "@/components/BleedIcon";
import type { TrackedSubscription } from "@/hooks/useTrackedSubscriptions";
import { formatMoney } from "@/lib/currency";
import { useThemeColors } from "@/hooks/useThemeColors";

const VISIBLE_LIMIT = 3;

// Sits above "All Subscriptions" on Home -- unlike a passive summary card,
// this shows the actual bleeding subscriptions themselves, tap-through to
// each. Only the worst 3 by default; a chevron reveals the rest, so a long
// bleeding list doesn't push the rest of Home down out of view.
export function BleedingSection({ bleeding }: { bleeding: TrackedSubscription[] }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useThemeColors();
  if (bleeding.length === 0) return null;

  const visible = expanded ? bleeding : bleeding.slice(0, VISIBLE_LIMIT);
  const hiddenCount = bleeding.length - VISIBLE_LIMIT;

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <BleedIcon size={20} />
        <Text className="font-display-medium text-xl text-on-background">Bleeding Subscriptions</Text>
      </View>
      <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
        You&apos;re paying for things you forgot exist.
      </Text>

      <View className="gap-2">
        {visible.map((sub) => (
          <Pressable
            key={sub.id}
            onPress={() => router.push(`/subscriptions/${sub.id}`)}
            className="flex-row items-center gap-3 rounded-xl border border-error/30 bg-error/10 p-3"
          >
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-white p-1.5">
              <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={22} />
            </View>
            <View className="flex-1 flex-row items-center gap-2">
              <Text className="font-sans-bold text-sm text-on-background" numberOfLines={1}>
                {sub.service_name}
              </Text>
              <View className="rounded-full bg-error/20 px-2 py-0.5">
                <Text className="font-sans-bold text-[9px] text-error">Bleeding</Text>
              </View>
            </View>
            <Text className="font-display-medium text-sm text-on-background">
              {formatMoney(sub.monthly_cost, sub.currency)}
            </Text>
          </Pressable>
        ))}
      </View>

      {bleeding.length > VISIBLE_LIMIT ? (
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          className="flex-row items-center justify-center gap-1 py-1"
        >
          <Text className="font-sans-semibold text-xs text-error">
            {expanded ? "Show less" : `Show ${hiddenCount} more`}
          </Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
    </View>
  );
}
