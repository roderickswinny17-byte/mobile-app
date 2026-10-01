import { Text, View } from "react-native";
import { Image } from "expo-image";
import clsx from "clsx";

type AvatarProps = {
  uri: string | null | undefined;
  initial: string;
  size: number;
  className?: string;
};

export function Avatar({ uri, initial, size, className }: AvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className={className}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={clsx("items-center justify-center bg-on-background", className)}
    >
      <Text className="font-display-medium text-background" style={{ fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}
