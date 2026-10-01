import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";

// Two steps: (1) look up which security question this email uses (no auth
// needed -- a locked-out user has no session), (2) answer it + confirm the
// phone number + set a new password. Both calls go through dedicated public
// Edge Functions (forgot-password-lookup, forgot-password-reset), never
// straight to the database -- see those functions' own comments for the
// real security tradeoffs of this whole approach (a guessable-answer-space
// reset path, by design, not an oversight).
const ForgotPassword = () => {
  const colors = useThemeColors();
  const [step, setStep] = useState<"lookup" | "reset">("lookup");
  const [email, setEmail] = useState("");
  const [questionLabel, setQuestionLabel] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLookup = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter the email address on your account.");
      return;
    }
    setLoading(true);
    const { data, error: lookupError } = await supabase.functions.invoke("forgot-password-lookup", {
      body: { email: email.trim() },
    });
    setLoading(false);
    if (lookupError || !data?.found) {
      setError("We couldn't find a security question for that email. Check it and try again.");
      return;
    }
    setQuestionLabel(data.questionLabel);
    setStep("reset");
  };

  const handleReset = async () => {
    setError(null);
    if (!phoneNumber.trim()) {
      setError("Enter the phone number on your account.");
      return;
    }
    if (!answer.trim()) {
      setError("Answer your security question.");
      return;
    }
    if (/\s/.test(newPassword) || newPassword.length < 6) {
      setError("New password must be at least 6 characters, with no spaces.");
      return;
    }

    setLoading(true);
    const { data, error: resetError } = await supabase.functions.invoke("forgot-password-reset", {
      body: { email: email.trim(), phoneNumber: phoneNumber.trim(), answer: answer.trim(), newPassword },
    });
    setLoading(false);

    if (resetError || !data?.ok) {
      setError(data?.error ?? "Could not verify your details.");
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-center font-display text-xl text-on-background">Password updated</Text>
        <Text className="text-center font-sans text-sm text-on-surface-variant">
          Sign in with your new password.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace({ pathname: "/(auth)/sign-in", params: { email } })}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          <Text className="font-display-medium text-on-primary">Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="justify-center gap-4 bg-background px-6" style={{ minHeight: "100vh" as any, flex: 1 }}>
      <Pressable onPress={() => router.back()} className="self-start">
        <Ionicons name="arrow-back" size={22} color={colors.onSurfaceVariant} />
      </Pressable>
      <Text className="font-display text-2xl text-on-background">Reset Password</Text>

      {step === "lookup" ? (
        <>
          <Text className="font-sans text-sm text-on-surface-variant">
            Enter your account's email address to get started.
          </Text>
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
          {error ? <Text className="font-sans text-error">{error}</Text> : null}
          <TouchableOpacity
            onPress={handleLookup}
            disabled={loading}
            className="items-center rounded-lg bg-primary px-6 py-4"
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-display-medium text-on-primary">Continue</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text className="font-sans-medium text-sm text-on-background">{questionLabel}</Text>
          <TextInput
            placeholder="Your answer"
            placeholderTextColor={colors.onSurfaceVariant}
            autoCapitalize="none"
            value={answer}
            onChangeText={setAnswer}
            className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
          />
          <TextInput
            placeholder="Phone number on your account"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
          />
          <View className="relative">
            <TextInput
              placeholder="New password"
              placeholderTextColor={colors.onSurfaceVariant}
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 pr-12 font-sans text-on-surface"
            />
            <Pressable
              onPress={() => setShowPassword((p) => !p)}
              className="absolute right-0 top-0 h-full w-12 items-center justify-center"
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
          {error ? <Text className="font-sans text-error">{error}</Text> : null}
          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            className="items-center rounded-lg bg-primary px-6 py-4"
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-display-medium text-on-primary">Set New Password</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default ForgotPassword;
