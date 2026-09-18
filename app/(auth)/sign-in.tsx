import { Text, View } from "react-native";
import React from "react";
import { Link } from "expo-router";

const SignIn = () => {
    return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
            <Text className="font-sans-bold text-2xl text-on-background">SignIn</Text>
            <Link href="/(auth)/sign-up" className="font-sans text-primary">Create Account</Link>
        </View>
    )

}

export default SignIn