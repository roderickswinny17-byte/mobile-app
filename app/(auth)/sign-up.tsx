import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

    router.replace("/home");
  };

  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6">
      <Text className="font-sans-bold text-2xl text-on-background">Create Account</Text>

      <TextInput
        placeholder="First name"
        placeholderTextColor="#869585"
        autoCapitalize="words"
        value={firstName}
        onChangeText={setFirstName}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />
      <TextInput
        placeholder="Last name"
        placeholderTextColor="#869585"
        autoCapitalize="words"
        value={lastName}
        onChangeText={setLastName}
        className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />
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
        autoComplete="password-new"
        value={password}
        onChangeText={setPassword}
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
          <ActivityIndicator color="#003914" />
        ) : (
          <Text className="font-sans-medium text-on-primary">Create Account</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/sign-in" className="text-center font-sans text-primary">
        Already have an account? Sign In
      </Link>
    </View>
  );
};

export default SignUp;
