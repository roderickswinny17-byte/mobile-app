import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared with sign-up.tsx's own copies of these -- kept as plain functions
// (not imported from one file) since each screen's error copy differs
// slightly ("Enter a password" here vs sign-up's own wording) and this is
// small enough that a shared module would be more indirection than value.
function validateEmail(raw: string): string | null {
  if (!raw.trim()) return "Enter an email address.";
  if (/\s/.test(raw)) return "Email cannot contain spaces.";
  if (!EMAIL_REGEX.test(raw.trim())) return "Enter a valid email address (e.g. name@example.com).";
  return null;
}
function validatePassword(password: string): string | null {
  // Catches "all spaces" too, not just "" -- the bug this replaces only
  // checked `!password`, which a 6-space string passes (truthy, length 6).
  if (!password.trim()) return "Enter a password.";
  if (/\s/.test(password)) return "Password cannot contain spaces.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

const SignIn = () => {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();

  const handleSignIn = async () => {
    setError(null);
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
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
    <View className="justify-center gap-4 bg-background px-6" style={{ minHeight: "100vh" as any, flex: 1 }}>
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

      <TouchableOpacity onPress={handleSignIn} disabled={loading} className="items-center rounded-lg bg-primary px-6 py-4">
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-display-medium text-on-primary">Sign In</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/forgot-password" className="text-center">
        <Text className="font-sans text-sm text-on-surface-variant">Forgot Password?</Text>
      </Link>

      <Link href="/(auth)/sign-up" className="text-center">
        <Text className="font-sans text-primary">Don&apos;t have an account? Create Account</Text>
      </Link>
    </View>
  );
};

export default SignIn;
