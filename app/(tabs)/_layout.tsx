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
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          // Just the safe-area inset, not +16 on top of it -- that extra
          // margin was leaving a visible gap of empty background between
          // the pill and the bottom edge.
          bottom: Math.max(insets.bottom, 8),
          height: 48,
          // React Navigation reserves vertical padding for a label area by
          // default even with tabBarShowLabel: false, which is what left a
          // big empty gap under the icons inside the fixed-height pill --
          // zeroing both out is what actually makes `height: 64` tight.
          paddingTop: 0,
          paddingBottom: 0,
          borderRadius: 999,
          borderTopWidth: 0,
          // Fully opaque -- rgba(...,0.78) let screen content show through.
          backgroundColor: "#14172A",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
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
