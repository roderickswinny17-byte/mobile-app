import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignIn = () => {
  // Switching between linked profiles (see Settings) signs out and lands
  // here with the target profile's email pre-filled, so the person only has
  // to type that profile's own password -- it's a genuinely separate
  // account, not a shared login.
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();

  const handleSignIn = async () => {
    setError(null);

    if (!email.trim()) {
      setError("Enter an email address.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter a password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/home");
  };

  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6">
      <Text className="font-display text-2xl text-on-background">Sign In</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.onSurfaceVariant}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />
      <View className="relative">
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={!showPassword}
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 pr-12 font-sans text-on-surface"
        />
        <Pressable
          onPress={() => setShowPassword((prev) => !prev)}
          className="absolute right-0 top-0 h-full w-12 items-center justify-center"
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {error ? <Text className="font-sans text-error">{error}</Text> : null}

      <TouchableOpacity
        onPress={handleSignIn}
        disabled={loading}
        className="items-center rounded-lg bg-primary px-6 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="font-display-medium text-on-primary">Sign In</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/sign-up" className="text-center font-sans text-primary">
        Don&apos;t have an account? Create Account
      </Link>
    </View>
  );
};

export default SignIn;
