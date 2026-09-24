import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { icons, type IconKey } from "@/assets/constants/icons";

// Best-effort real logo for anything NOT in the bundled catalog (assets/icons/
// only covers ~15 curated apps) -- same DuckDuckGo favicon-by-domain lookup
// verified working in design-preview/subscriptions-reference.html (free, no
// key, 200 for a real domain / 404 for a made-up one). Falls back to a
// initial-letter badge if the guessed domain doesn't resolve to anything.
function guessDomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

function Monogram({ name, size }: { name: string; size: number }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <View
      className="items-center justify-center rounded-full bg-tertiary"
      style={{ width: size, height: size }}
    >
      <Text className="font-display-medium text-on-tertiary" style={{ fontSize: size * 0.45 }}>
        {initial}
      </Text>
    </View>
  );
}

export function AppIcon({
  iconKey,
  name,
  size = 24,
}: {
  iconKey: string | null | undefined;
  name: string;
  size?: number;
}) {
  // Tracks WHICH name last failed, not just whether one did -- add.tsx
  // reuses one AppIcon instance for the live search preview, whose `name`
  // changes on every keystroke, so a boolean flag would stay stuck "failed"
  // forever after the first bad guess instead of retrying for a new name.
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const icon = iconKey && iconKey in icons ? icons[iconKey as IconKey] : null;

  if (icon) {
    return <Image source={icon} style={{ width: size, height: size }} contentFit="contain" />;
  }

  if (failedFor !== name) {
    return (
      <Image
        source={{ uri: `https://icons.duckduckgo.com/ip3/${guessDomain(name)}.ico` }}
        style={{ width: size, height: size, borderRadius: size * 0.2 }}
        contentFit="contain"
        onError={() => setFailedFor(name)}
      />
    );
  }

  return <Monogram name={name} size={size} />;
}
