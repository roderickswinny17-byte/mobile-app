import { useColorScheme } from "react-native";

// Native-only props (Ionicons `color`, `placeholderTextColor`,
// ActivityIndicator `color`) can't read NativeWind's `dark:`-driven CSS
// variables -- they need a real resolved hex value. Mirrors the light/dark
// pairs defined in global.css so these stay in sync with the rest of the
// theme instead of drifting into hardcoded, wrong-in-one-mode colors.
export function useThemeColors() {
  const isDark = useColorScheme() === "dark";
  return {
    background: isDark ? "#14172A" : "#F8F2E3",
    onBackground: isDark ? "#F2EFE6" : "#1E1B16",
    onSurfaceVariant: isDark ? "#9CA3C2" : "#8C8477",
    onPrimary: "#FFFFFF", // coral is unchanged between modes, white always contrasts
  };
}
