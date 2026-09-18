import { Tabs } from "expo-router";
import { tabs } from "@/assets/constants/data";
import { View } from "react-native";
import clsx from "clsx";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mirrors --color-primary / --color-on-surface-variant / --color-background
// from global.css — Image tintColor and tabBar* options are native style
// props, not classNames, so they can't read the NativeWind theme directly.
const ACTIVE_COLOR = "#53e076";
const INACTIVE_COLOR = "#bccbb9";

const TabIcon = ({ focused, icon }: TabIconProps) => (
  <View className="items-center justify-center">
    <View
      className={clsx(
        "h-9 w-9 items-center justify-center rounded-full",
        focused && "bg-primary/15"
      )}
    >
      <Image
        source={icon}
        contentFit="contain"
        tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        style={{ width: 22, height: 22 }}
      />
    </View>
  </View>
);

const TabLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: "#131313",
          borderTopColor: "#3d4a3d",
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
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