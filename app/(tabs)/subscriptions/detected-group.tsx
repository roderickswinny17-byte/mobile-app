import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";
import { evidenceTierDescription, evidenceTierLabel } from "@/lib/evidenceTier";

type DetectedRow = {
  id: string;
  guessed_amount: number | null;
  guessed_currency: string;
  guessed_billing_cycle: string;
  guessed_next_renewal_date: string | null;
  source_snippet: string | null;
  detected_at: string;
  evidence_tier: number;
};

// Drill-down for a review card's "xN" badge -- multiple emails routinely get
// matched for one service (a receipt, a trial-ending nudge, an upsell ad),
// and the review card only ever showed the single best one. This lists every
// email in the group with what it actually represents, best evidence first,
// so approving/dismissing isn't a black box.
export default function DetectedGroupDetail() {
  const { ids, name } = useLocalSearchParams<{ ids: string; name: string }>();
  const colors = useThemeColors();
  const [rows, setRows] = useState<DetectedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const idList = (ids ?? "").split(",").filter(Boolean);
      if (idList.length === 0) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("detected_subscriptions")
        .select(
          "id, guessed_amount, guessed_currency, guessed_billing_cycle, guessed_next_renewal_date, source_snippet, detected_at, evidence_tier"
        )
        .in("id", idList)
        .order("evidence_tier", { ascending: true });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [ids]);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-6 pb-16 pt-16">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container"
          >
            <Ionicons name="arrow-back" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <Text className="font-display text-lg text-on-background">{name || "Matched emails"}</Text>
        </View>
        {!loading ? (
          <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
            {rows.length} email{rows.length === 1 ? "" : "s"} matched this service -- best evidence first.
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator />
        ) : rows.length === 0 ? (
          <Text className="font-sans text-on-surface-variant">Nothing found for this group anymore.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} className="gap-2 rounded-lg border border-outline-variant bg-surface-container p-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="font-sans-semibold text-sm text-on-surface">{evidenceTierLabel(row.evidence_tier)}</Text>
                <Text className="font-sans text-xs text-on-surface-variant">
                  {new Date(row.detected_at).toLocaleDateString()}
                </Text>
              </View>
              <Text className="font-sans text-xs text-on-surface-variant">{evidenceTierDescription(row.evidence_tier)}</Text>
              {row.guessed_amount != null ? (
                <Text className="font-display-medium text-sm text-on-background">
                  {formatMoney(row.guessed_amount, row.guessed_currency)} / {row.guessed_billing_cycle}
                </Text>
              ) : null}
              {row.guessed_next_renewal_date ? (
                <Text className="font-sans text-xs text-on-surface-variant">
                  Next payment guessed from this email: {row.guessed_next_renewal_date}
                </Text>
              ) : null}
              {row.source_snippet ? (
                <Text className="font-sans text-xs text-on-surface-variant" numberOfLines={5}>
                  &quot;{row.source_snippet}&quot;
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
