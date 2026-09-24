import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUp = () => {
  // "Add another profile" from Settings lands here with the existing
  // profile's phone number pre-filled (editable) so the two accounts link
  // automatically -- see public.get_linked_profiles() in schema.sql.
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phoneParam ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const colors = useThemeColors();

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter your first and last name.");
      return;
    }
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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      // Email confirmation is required before a session exists.
      setInfo("Check your inbox to confirm your email, then sign in.");
      return;
    }

    // handle_new_user() (see schema.sql) seeds first/last name + email only;
    // phone number is written here as a follow-up so a blank/invalid value
    // never blocks account creation itself.
    if (phoneNumber.trim()) {
      await supabase
        .from("profiles")
        .update({ phone_number: phoneNumber.trim() })
        .eq("id", data.session.user.id);
    }

    router.replace("/home");
  };

  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6">
      <Text className="font-display text-2xl text-on-background">Create Account</Text>

      <TextInput
        placeholder="First name"
        placeholderTextColor={colors.onSurfaceVariant}
        autoCapitalize="words"
        value={firstName}
        onChangeText={setFirstName}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />
      <TextInput
        placeholder="Last name"
        placeholderTextColor={colors.onSurfaceVariant}
        autoCapitalize="words"
        value={lastName}
        onChangeText={setLastName}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />
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
      <Text className="-mt-3 font-sans text-xs text-on-surface-variant">
        Use the real email address your subscriptions are billed to -- Gmail scanning (Settings) reads
        receipts from this inbox to find and track them automatically.
      </Text>
      <View className="relative">
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={!showPassword}
          autoComplete="password-new"
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
      <TextInput
        placeholder="Phone number (optional -- links your profiles)"
        placeholderTextColor={colors.onSurfaceVariant}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />

      {error ? <Text className="font-sans text-error">{error}</Text> : null}
      {info ? <Text className="font-sans text-primary">{info}</Text> : null}

      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        className="items-center rounded-lg bg-primary px-6 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="font-display-medium text-on-primary">Create Account</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/sign-in" className="text-center font-sans text-primary">
        Already have an account? Sign In
      </Link>
    </View>
  );
};

export default SignUp;
