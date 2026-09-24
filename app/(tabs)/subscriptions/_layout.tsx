import { Stack } from "expo-router";

export default function SubscriptionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="app-info" />
      <Stack.Screen name="linked-summary" />
      <Stack.Screen name="detected" />
      <Stack.Screen name="add" options={{ presentation: "modal" }} />
    </Stack>
  );
}
