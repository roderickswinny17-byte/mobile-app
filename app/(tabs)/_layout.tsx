import { Tabs } from "expo-router";
import { tabs } from "@/assets/constants/data";
import { View } from "react-native";
import clsx from "clsx";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mirrors --color-primary / --color-on-primary from global.css -- tabBar*
// options and Ionicons' color prop are native style props, not classNames,
// so they can't read the NativeWind theme directly.
const ACTIVE_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "#9CA3C2";

type TabIconProps = { focused: boolean; icon: keyof typeof Ionicons.glyphMap };

const TabIcon = ({ focused, icon }: TabIconProps) => (
  <View
    className={clsx(
      "h-10 w-10 items-center justify-center rounded-full",
      focused && "bg-primary"
    )}
  >
    <Ionicons name={icon} size={20} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />
  </View>
);

const TabLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Docked, full-width, sticky to the bottom edge -- not a floating
        // pill. `position: "absolute"` plus side margins/borderRadius/shadow
        // (the previous styling) is what made it look like an island
        // hovering over content instead of a fixed bar; this is React
        // Navigation's default docked behavior, just styled.
        tabBarStyle: {
          backgroundColor: "#14172A",
          borderTopWidth: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
        },
        tabBarItemStyle: {
          height: 48,
          paddingTop: 0,
          paddingBottom: 0,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={tab.icon} />,
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;
