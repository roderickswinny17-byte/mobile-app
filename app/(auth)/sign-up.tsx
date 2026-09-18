import { Text, View } from "react-native";
import React from "react";
import { Link } from "expo-router";

const SignUp = () => {
    return (<View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="font-sans-bold text-2xl text-on-background">SignUp</Text>
        <Link href="/(auth)/sign-up" className="font-sans text-primary">Sign In</Link>
    </View>
    )
}

export default SignUp