import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <Text className="font-sans-bold text-2xl text-on-background">Sign In</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#869585"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#869585"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />

      {error ? <Text className="font-sans text-error">{error}</Text> : null}

      <TouchableOpacity
        onPress={handleSignIn}
        disabled={loading}
        className="items-center rounded-lg bg-primary px-6 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#003914" />
        ) : (
          <Text className="font-sans-medium text-on-primary">Sign In</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/sign-up" className="text-center font-sans text-primary">
        Don&apos;t have an account? Create Account
      </Link>
    </View>
  );
};

export default SignIn;
