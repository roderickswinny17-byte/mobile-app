import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";
import { PhoneNumberField } from "@/components/PhoneNumberField";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(raw: string): string | null {
  if (!raw.trim()) return "Enter an email address.";
  if (/\s/.test(raw)) return "Email cannot contain spaces.";
  if (!EMAIL_REGEX.test(raw.trim())) return "Enter a valid email address (e.g. name@example.com).";
  return null;
}
function validatePassword(password: string): string | null {
  if (!password.trim()) return "Enter a password.";
  if (/\s/.test(password)) return "Password cannot contain spaces.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

const SECURITY_QUESTIONS = [
  { key: "favourite_colour", label: "Favourite colour" },
  { key: "favourite_cricketer", label: "Favourite cricketer" },
] as const;

const SignUp = () => {
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phoneParam ?? "");
  const [securityQuestion, setSecurityQuestion] = useState<(typeof SECURITY_QUESTIONS)[number]["key"]>(
    "favourite_colour"
  );
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();

  const handleSignUp = async () => {
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
    if (!securityAnswer.trim()) {
      setError("Answer your security question -- it's needed to reset your password later.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setError("Check your inbox to confirm your email, then sign in.");
      return;
    }

    // Both of these are best-effort follow-ups, same as the existing
    // phone-number write below -- a failure here never blocks account
    // creation itself, since neither is required to use the app day to day.
    if (phoneNumber.trim()) {
      await supabase.from("profiles").update({ phone_number: phoneNumber.trim() }).eq("id", data.session.user.id);
    }
    await supabase.functions.invoke("set-security-answer", {
      body: { question: securityQuestion, answer: securityAnswer.trim() },
    });

    router.replace("/home");
  };

  return (
    <View className="justify-center gap-4 bg-background px-6" style={{ minHeight: "100vh" as any, flex: 1 }}>
      <Text className="font-display text-2xl text-on-background">Create Account</Text>

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
          value={password}
          onChangeText={setPassword}
          className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 pr-12 font-sans text-on-surface"
        />
        <Pressable
          onPress={() => setShowPassword((p) => !p)}
          className="absolute right-0 top-0 h-full w-12 items-center justify-center"
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
      <PhoneNumberField
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Phone number (optional -- links your profiles)"
      />

      <Text className="-mb-2 font-sans-medium text-sm text-on-background">Security question</Text>
      <Text className="-mb-1 font-sans text-xs text-on-surface-variant">
        Used to reset your password if you forget it -- pick one you'll remember the exact answer to.
      </Text>
      <View className="flex-row gap-2">
        {SECURITY_QUESTIONS.map((q) => (
          <Pressable
            key={q.key}
            onPress={() => setSecurityQuestion(q.key)}
            className={clsx(
              "flex-1 items-center rounded-lg border px-3 py-2",
              securityQuestion === q.key ? "border-primary bg-primary/15" : "border-outline-variant"
            )}
          >
            <Text className="font-sans-medium text-xs text-on-surface">{q.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        placeholder="Your answer"
        placeholderTextColor={colors.onSurfaceVariant}
        autoCapitalize="none"
        value={securityAnswer}
        onChangeText={setSecurityAnswer}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />

      {error ? <Text className="font-sans text-error">{error}</Text> : null}

      <TouchableOpacity onPress={handleSignUp} disabled={loading} className="items-center rounded-lg bg-primary px-6 py-4">
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="font-display-medium text-on-primary">Create Account</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/sign-in" className="text-center">
        <Text className="font-sans text-primary">Already have an account? Sign In</Text>
      </Link>
    </View>
  );
};

export default SignUp;
