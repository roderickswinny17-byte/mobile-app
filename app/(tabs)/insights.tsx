import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle } from "react-native-svg";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { useProfile } from "@/hooks/useProfile";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { AppIcon } from "@/components/AppIcon";
import { monthlyEquivalent } from "@/lib/subscriptionMath";
import { convert, formatMoney } from "@/lib/currency";

const SIZE = 176;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Insights = () => {
  const panGesture = useSwipeTabNavigation();
  const { subscriptions, loading, error } = useTrackedSubscriptions();
  const { profile, loading: profileLoading } = useProfile();
  useExchangeRates(); // re-renders once live FX rates land

  const homeCurrency = profile?.home_currency ?? "USD";

  const withShare = subscriptions
    .map((sub) => ({
      ...sub,
      color: sub.hex,
      monthly: convert(monthlyEquivalent(sub), sub.currency, homeCurrency),
    }))
    .sort((a, b) => b.monthly - a.monthly);
  const total = withShare.reduce((sum, s) => sum + s.monthly, 0);

  // React Compiler (app.json: experiments.reactCompiler) forbids mutating a
  // local variable across renders, so the running offset is threaded
  // through reduce's accumulator instead of a `let` incremented in a loop.
  const { arcs } = withShare.reduce<{ arcs: { id: string; color: string; length: number; offset: number }[]; cumulative: number }>(
    (acc, sub) => {
      const fraction = total > 0 ? sub.monthly / total : 0;
      return {
        arcs: [
          ...acc.arcs,
          { id: sub.id, color: sub.color, length: fraction * CIRCUMFERENCE, offset: acc.cumulative * CIRCUMFERENCE },
        ],
        cumulative: acc.cumulative + fraction,
      };
    },
    { arcs: [], cumulative: 0 }
  );

  if (loading || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <ScrollView className="flex-1 bg-background">
        <View className="gap-4 px-6 pb-28 pt-16">
          <Text className="font-display text-2xl text-on-background">Insights</Text>
          <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
            Share of your monthly spend across subscriptions (yearly plans shown at their
            monthly-equivalent cost).
          </Text>
          <Text className="-mt-3 font-sans text-xs text-on-surface-variant">
            All amounts converted to {homeCurrency} at current exchange rates.
          </Text>

          <View className="items-center rounded-lg border border-outline-variant bg-surface-container p-6">
            <View style={{ width: SIZE, height: SIZE }}>
              <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke="#E7E0D0"
                  strokeWidth={STROKE}
                  fill="none"
                />
                {arcs.map((arc) => (
                  <Circle
                    key={arc.id}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke={arc.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                    strokeDashoffset={-arc.offset}
                    strokeLinecap="butt"
                    fill="none"
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  />
                ))}
              </Svg>
              <View className="absolute inset-0 items-center justify-center">
                <Text className="font-sans text-[10px] uppercase tracking-wide text-on-surface-variant">
                  Total / mo
                </Text>
                <Text className="font-display text-xl text-on-surface">
                  {formatMoney(total, homeCurrency)}
                </Text>
              </View>
            </View>
          </View>

          {error ? (
            <Text className="font-sans text-error">Couldn&apos;t load your subscriptions: {error}</Text>
          ) : withShare.length === 0 ? (
            <Text className="font-sans text-on-surface-variant">No subscriptions tracked yet.</Text>
          ) : (
            <View className="gap-2">
              {withShare.map((sub) => (
                <View
                  key={sub.id}
                  className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: sub.color }} />
                    <View className="h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-white p-1.5">
                      <AppIcon iconKey={sub.icon_key} name={sub.service_name} size={20} />
                    </View>
                    <Text className="font-sans-semibold text-sm text-on-surface">
                      {sub.service_name}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-display-medium text-xs text-primary">
                      {formatMoney(sub.monthly, homeCurrency)}/mo
                    </Text>
                    <Text className="font-sans text-[11px] text-on-surface-variant">
                      {total > 0 ? Math.round((sub.monthly / total) * 100) : 0}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </GestureDetector>
  );
};

export default Insights;
