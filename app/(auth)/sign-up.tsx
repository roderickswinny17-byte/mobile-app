import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();
  const handleSignUp = async () => {
    setError(null);
    if (!email.trim()) { setError("Enter an email address."); return; }
    if (!EMAIL_REGEX.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    router.replace("/(auth)/sign-in");
  };
  return (
    <View className="justify-center gap-4 bg-background px-6" style={{ minHeight: '100vh' as any, flex: 1 }}>
      <Text className="font-display text-2xl text-on-background">Create Account</Text>
      <TextInput placeholder="Email" placeholderTextColor={colors.onSurfaceVariant} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface" />
      <View className="relative">
        <TextInput placeholder="Password" placeholderTextColor={colors.onSurfaceVariant} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 pr-12 font-sans text-on-surface" />
        <Pressable onPress={() => setShowPassword((p) => !p)} className="absolute right-0 top-0 h-full w-12 items-center justify-center">
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
      {error ? <Text className="font-sans text-error">{error}</Text> : null}
      <TouchableOpacity onPress={handleSignUp} disabled={loading} className="items-center rounded-lg bg-primary px-6 py-4">
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-display-medium text-on-primary">Create Account</Text>}
      </TouchableOpacity>
      <Link href="/(auth)/sign-in" className="text-center">
        <Text className="font-sans text-primary">Already have an account? Sign In</Text>
      </Link>
    </View>
  );
};
export default SignUp;
