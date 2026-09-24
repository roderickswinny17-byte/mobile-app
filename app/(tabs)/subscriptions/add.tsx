import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "@/components/AppIcon";
import { useTrackedSubscriptions } from "@/hooks/useTrackedSubscriptions";
import { useThemeColors } from "@/hooks/useThemeColors";
import { CATALOG_APPS, makeFreeformApp, type CatalogApp } from "@/lib/subscriptionCatalog";

// Shared by the "+" on both Home and Subscriptions (see their headers) --
// search the catalog, or add anything not in it. Picking a result opens
// App Info (plans/trial/price) before it's actually saved.
export default function AddSubscription() {
  const { subscriptions } = useTrackedSubscriptions();
  const [query, setQuery] = useState("");
  const colors = useThemeColors();

  const alreadyAdded = new Set(subscriptions.map((s) => s.service_name));
  const matches = CATALOG_APPS.filter(
    (app) => query.trim() === "" || app.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const exactKnownMatch = CATALOG_APPS.some((a) => a.name.toLowerCase() === query.trim().toLowerCase());
  const freeform = query.trim() !== "" && !exactKnownMatch ? makeFreeformApp(query) : null;

  const openAppInfo = (app: CatalogApp) => {
    router.push({
      pathname: "/subscriptions/app-info",
      params: {
        name: app.name,
        category: app.category,
        icon: app.icon ?? "",
        price: String(app.price),
        trialDays: String(app.trialDays),
        hex: app.hex,
        billingUrl: app.billingUrl,
      },
    });
  };

  return (
    <View className="flex-1 gap-3 bg-background px-6 pt-8">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-xl text-on-background">Add Subscription</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container"
        >
          <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-3">
        <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          autoFocus
          placeholder="Type any app name -- Netflix, Hulu, Zoom..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={query}
          onChangeText={setQuery}
          className="flex-1 font-sans text-sm text-on-surface"
        />
      </View>
      <Text className="-mt-1 font-sans text-[11px] text-on-surface-variant">
        Not limited to a fixed list -- type any subscription and add it, even if it&apos;s not
        suggested below.
      </Text>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
        ListFooterComponent={
          freeform ? (
            <Pressable
              onPress={() => openAppInfo(freeform)}
              className="flex-row items-center gap-3 rounded-lg border border-dashed border-outline-variant bg-surface-container p-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-white p-1.5">
                <AppIcon iconKey={null} name={freeform.name} size={28} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-medium text-sm text-on-surface">
                  Add &quot;{freeform.name}&quot;
                </Text>
                <Text className="font-sans text-xs text-on-surface-variant">
                  Not in our suggestions -- add it anyway
                </Text>
              </View>
            </Pressable>
          ) : matches.length === 0 && query.trim() === "" ? (
            <Text className="py-6 text-center font-sans text-sm text-on-surface-variant">
              Start typing to search...
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const added = alreadyAdded.has(item.name);
          return (
            <Pressable
              disabled={added}
              onPress={() => openAppInfo(item)}
              className={
                "flex-row items-center justify-between rounded-lg border border-outline-variant p-3 " +
                (added ? "bg-surface-container-high opacity-50" : "bg-surface-container")
              }
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-white p-1.5">
                  <AppIcon iconKey={item.icon} name={item.name} size={28} />
                </View>
                <View>
                  <Text className="font-sans-medium text-sm text-on-surface">{item.name}</Text>
                  <Text className="font-sans text-xs text-on-surface-variant">{item.category}</Text>
                </View>
              </View>
              <Text className={added ? "font-sans-semibold text-xs text-on-surface-variant" : "font-sans-semibold text-xs text-primary"}>
                {added ? "Added" : "View"}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
