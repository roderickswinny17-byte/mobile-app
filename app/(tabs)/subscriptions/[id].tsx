import { View, Text } from "react-native";
import React from "react";
import { Link, useLocalSearchParams } from "expo-router";

const SubscriptionDetails = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
            <Text className="font-sans-bold text-2xl text-on-background">Subscription Details: {id}</Text>
            <Link href="/subscriptions" className="font-sans text-primary">Go Back</Link>
        </View>
    )
}

export default SubscriptionDetails
