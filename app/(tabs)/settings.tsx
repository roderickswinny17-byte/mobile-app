import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

const Settings = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile, loading, error, reload } = useProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPhoneNumber(profile.phone_number ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaveError(null);
    setSaved(false);

    if (!firstName.trim() || !lastName.trim()) {
      setSaveError("First and last name can't be empty.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);

    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    setSaved(true);
    reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/sign-in");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 gap-4 bg-background px-6 pt-16">
        <Text className="font-sans-bold text-2xl text-on-background">Settings</Text>

        {error ? <Text className="font-sans text-error">{error}</Text> : null}

        <View className="gap-1">
          <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
            Email
          </Text>
          <Text className="font-sans text-base text-on-surface">{profile?.email}</Text>
        </View>

        <TextInput
          placeholder="First name"
          placeholderTextColor="#869585"
          value={firstName}
          onChangeText={setFirstName}
          className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
        />
        <TextInput
          placeholder="Last name"
          placeholderTextColor="#869585"
          value={lastName}
          onChangeText={setLastName}
          className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
        />
        <TextInput
          placeholder="Phone number"
          placeholderTextColor="#869585"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
        />

        {saveError ? <Text className="font-sans text-error">{saveError}</Text> : null}
        {saved ? <Text className="font-sans text-primary">Saved.</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-lg bg-primary px-6 py-4"
        >
          {saving ? (
            <ActivityIndicator color="#003914" />
          ) : (
            <Text className="font-sans-medium text-on-primary">Save Changes</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleLogout}
          className="items-center rounded-lg border border-error px-6 py-4"
        >
          <Text className="font-sans-medium text-error">Log Out</Text>
        </Pressable>
      </View>
    </GestureDetector>
  );
};

export default Settings;
