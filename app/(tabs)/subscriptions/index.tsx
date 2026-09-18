import { View, Text } from "react-native";
import React from "react";
import { GestureDetector } from "react-native-gesture-handler";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";

const Subscriptions = () => {
    const panGesture = useSwipeTabNavigation();

    return (
        <GestureDetector gesture={panGesture}>
            <View className="flex-1 items-center justify-center bg-background">
                <Text className="font-sans-bold text-2xl text-on-background">Subscriptions</Text>
            </View>
        </GestureDetector>
    )
}

export default Subscriptions
