import { useCallback, useEffect, useState } from "react";
import { Appearance, Platform, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "theme-preference";

// A manual light/dark toggle (Settings -> Dark Mode), not just following the
// OS setting -- on iOS/Android. Appearance.setColorScheme() overrides what
// every `dark:`-driven color in global.css resolves to app-wide.
//
// Appearance.setColorScheme does not exist on web -- there is no browser API
// that lets JS override prefers-color-scheme at all, and react-native-web's
// Appearance shim doesn't implement it (confirmed: even NativeWind's own web
// runtime calls this exact same undefined method under the hood). Calling it
// unconditionally crashed the web build. On web this now safely no-ops, and
// Settings hides the toggle there instead of showing one that can't work.
//
// Defaults to light regardless of platform/OS setting -- explicit choice,
// not Appearance.getColorScheme() -- so a first launch always renders the
// intended bright design rather than silently inheriting a dark OS/browser
// preference.
export function useThemePreference() {
  const [scheme, setScheme] = useState<ColorSchemeName>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "dark" || saved === "light") {
        applyScheme(saved);
        setScheme(saved);
      }
    });
  }, []);

  const setThemePreference = useCallback((next: "light" | "dark") => {
    applyScheme(next);
    setScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { isDark: scheme === "dark", setThemePreference, supported: Platform.OS !== "web" };
}

function applyScheme(scheme: ColorSchemeName) {
  if (typeof Appearance.setColorScheme === "function") {
    Appearance.setColorScheme(scheme);
  }
}
