import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { useSwipeTabNavigation } from "@/hooks/useSwipeTabNavigation";
import { useProfile } from "@/hooks/useProfile";
import { useLinkedProfiles } from "@/hooks/useLinkedProfiles";
import { useAccountSwitcher } from "@/hooks/useAccountSwitcher";
import { useEmailConnection } from "@/hooks/useEmailConnection";
import { useSubscription } from "@/hooks/useSubscription";
import { useThemePreference } from "@/hooks/useThemePreference";
import { useThemeColors } from "@/hooks/useThemeColors";
import { supabase } from "@/lib/supabase";
import { removeCachedAccount } from "@/lib/accountSessions";
import { CURRENCIES } from "@/lib/currency";

const PLANS = [
  {
    id: "subscription-a",
    name: "Subscription A",
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    perks: ["Unlimited entries", "Priority support", "Early access to new features"],
  },
] as const;

const Settings = () => {
  const panGesture = useSwipeTabNavigation();
  const { profile, loading, error, reload } = useProfile();
  const { profiles: linkedProfiles, loading: linkedLoading, error: linkedError } = useLinkedProfiles();
  const { cachedAccounts, switching, switchTo } = useAccountSwitcher();
  const emailConnection = useEmailConnection();
  const { subscription, loading: planLoading } = useSubscription();
  const { isDark, setThemePreference, supported: darkModeSupported } = useThemePreference();
  const colors = useThemeColors();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const [seededProfileId, setSeededProfileId] = useState<string | null>(null);
  if (profile && profile.id !== seededProfileId) {
    setSeededProfileId(profile.id);
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setPhoneNumber(profile.phone_number ?? "");
  }

  const currentPlan = subscription?.plan ?? "Normal";

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

  const handleSetHomeCurrency = async (code: string) => {
    if (!profile || code === profile.home_currency) return;
    await supabase.from("profiles").update({ home_currency: code }).eq("id", profile.id);
    reload();
  };

  const handleLogout = async () => {
    setSettingsOpen(false);
    // Only this account leaves the local switcher -- other cached accounts
    // (see useAccountSwitcher) stay available for instant switching, same
    // as signing out of one Google account while others remain added.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) await removeCachedAccount(session.user.id);
    await supabase.auth.signOut();
    router.replace("/(auth)/sign-in");
  };

  const handleSwitchProfile = async (target: { id: string; email: string }) => {
    const cached = cachedAccounts.find((a) => a.userId === target.id);
    if (cached) {
      // Already signed into on this device before -- swap the live session
      // directly, no password needed. Every screen refetches on its next
      // focus (see useFocusEffect in the data hooks), so navigating tabs
      // after this naturally picks up the new account's data.
      const { error } = await switchTo(cached);
      if (!error) router.replace("/home");
      return;
    }
    // Not cached yet -- same as before: sign out and let them sign in once,
    // which caches it automatically for instant switching next time.
    await supabase.auth.signOut();
    router.replace({ pathname: "/(auth)/sign-in", params: { email: target.email } });
  };

  const handleAddProfile = () => {
    router.push({ pathname: "/(auth)/sign-up", params: { phone: profile?.phone_number ?? "" } });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
    <GestureDetector gesture={panGesture}>
      <ScrollView className="flex-1 bg-background">
        <View className="gap-4 px-6 pb-36 pt-16">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl text-on-background">Profile</Text>
            <Pressable
              onPress={() => setSettingsOpen(true)}
              className="h-10 w-10 items-center justify-center rounded-full bg-on-background"
            >
              <Ionicons name="settings-outline" size={20} color={colors.background} />
            </Pressable>
          </View>

          {error ? <Text className="font-sans text-error">{error}</Text> : null}

          <View className="gap-2">
            <View className="flex-row items-center gap-3 rounded-lg border border-outline-variant bg-surface-container p-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-on-background">
                <Text className="font-display-medium text-lg text-background">
                  {(profile?.first_name?.charAt(0) ?? "?").toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="font-display-medium text-base text-on-surface">
                  {profile?.first_name} {profile?.last_name}
                </Text>
                <Text className="font-sans text-xs text-on-surface-variant">{profile?.email}</Text>
              </View>
            </View>

            <TextInput
              placeholder="First name"
              placeholderTextColor={colors.onSurfaceVariant}
              value={firstName}
              onChangeText={setFirstName}
              className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
            />
            <TextInput
              placeholder="Last name"
              placeholderTextColor={colors.onSurfaceVariant}
              value={lastName}
              onChangeText={setLastName}
              className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
            />
            <TextInput
              placeholder="Phone number"
              placeholderTextColor={colors.onSurfaceVariant}
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
              className="mt-1 items-center rounded-lg bg-primary px-6 py-4"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-display-medium text-on-primary">Save Changes</Text>
              )}
            </Pressable>
          </View>

          <View className="mt-2 h-px bg-outline-variant" />

          <View className="gap-1">
            <Text className="font-display-medium text-lg text-on-background">
              More Subscription Plans
            </Text>
            <Text className="font-sans text-sm text-on-surface-variant">
              This app&apos;s own plan -- separate from the subscriptions you&apos;re tracking.
            </Text>
          </View>

          <View className="rounded-lg border border-outline-variant bg-surface-container p-4">
            <Text className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">
              Current Plan
            </Text>
            {planLoading ? (
              <ActivityIndicator />
            ) : (
              <Text className="mt-1 font-display-medium text-lg text-on-surface">
                {currentPlan}
              </Text>
            )}
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setCycle("monthly")}
              className={clsx(
                "flex-1 items-center rounded-lg border py-2",
                cycle === "monthly" ? "border-primary bg-primary/15" : "border-outline-variant"
              )}
            >
              <Text className="font-sans-medium text-on-surface">Monthly</Text>
            </Pressable>
            <Pressable
              onPress={() => setCycle("yearly")}
              className={clsx(
                "flex-1 items-center rounded-lg border py-2",
                cycle === "yearly" ? "border-primary bg-primary/15" : "border-outline-variant"
              )}
            >
              <Text className="font-sans-medium text-on-surface">Yearly</Text>
            </Pressable>
          </View>

          {PLANS.map((plan) => (
            <View
              key={plan.id}
              className="gap-2 rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <Text className="font-display-medium text-lg text-on-surface">{plan.name}</Text>
              <Text className="font-sans text-2xl text-primary">
                ${cycle === "monthly" ? plan.monthlyPrice.toFixed(2) : plan.yearlyPrice.toFixed(2)}
                <Text className="font-sans text-sm text-on-surface-variant">
                  {" "}
                  / {cycle === "monthly" ? "month" : "year"}
                </Text>
              </Text>
              {plan.perks.map((perk) => (
                <Text key={perk} className="font-sans text-sm text-on-surface-variant">
                  • {perk}
                </Text>
              ))}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/subscriptions/payment",
                    params: { planId: plan.id, cycle },
                  })
                }
                className="mt-2 items-center rounded-lg bg-primary px-6 py-3"
              >
                <Text className="font-display-medium text-on-primary">Upgrade</Text>
              </Pressable>
            </View>
          ))}

          <View className="mt-2 h-px bg-outline-variant" />

          <Text className="font-display-medium text-lg text-on-background">Find Subscriptions</Text>
          <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
            Scan Gmail for subscriptions -- you approve each one before it&apos;s added.
          </Text>
          {emailConnection.error ? (
            <Text className="font-sans text-xs text-error">{emailConnection.error}</Text>
          ) : null}
          {emailConnection.loading ? (
            <ActivityIndicator />
          ) : emailConnection.connected ? (
            <View className="gap-2">
              <View className="gap-0.5">
                <Text className="font-sans-medium text-xs text-on-surface">
                  {emailConnection.status?.email ?? "Connected"}
                </Text>
                <Text className="font-sans text-xs text-on-surface-variant">
                  {emailConnection.status?.last_synced_at
                    ? `Last scanned ${new Date(emailConnection.status.last_synced_at).toLocaleDateString()}`
                    : "Never scanned yet"}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={async () => {
                    await emailConnection.scanNow();
                    router.push("/subscriptions/detected");
                  }}
                  disabled={emailConnection.scanning}
                  className="flex-1 items-center rounded-lg bg-primary px-6 py-3"
                >
                  {emailConnection.scanning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-display-medium text-on-primary">Scan Now</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={emailConnection.disconnect}
                  className="items-center rounded-lg border border-outline-variant px-4 py-3"
                >
                  <Text className="font-sans-semibold text-sm text-on-surface">Disconnect</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={emailConnection.connect}
              disabled={emailConnection.connecting}
              className="items-center rounded-lg border border-outline-variant px-6 py-4"
            >
              {emailConnection.connecting ? (
                <ActivityIndicator />
              ) : (
                <Text className="font-sans-semibold text-sm text-on-surface">Connect Gmail</Text>
              )}
            </Pressable>
          )}

          <View className="mt-2 h-px bg-outline-variant" />

          <View className="flex-row items-center justify-between">
            <Text className="font-display-medium text-lg text-on-background">Profiles</Text>
            <Pressable onPress={handleAddProfile}>
              <Text className="font-sans-medium text-primary">+ Add</Text>
            </Pressable>
          </View>
          <Text className="-mt-2 font-sans text-sm text-on-surface-variant">
            Other accounts linked to your phone number.
          </Text>

          {linkedError ? (
            <Text className="font-sans text-error">Couldn&apos;t load linked profiles: {linkedError}</Text>
          ) : linkedLoading ? (
            <ActivityIndicator />
          ) : !profile?.phone_number ? (
            <Text className="font-sans text-on-surface-variant">
              Add a phone number above to link other profiles to this one.
            </Text>
          ) : linkedProfiles.length === 0 ? (
            <Text className="font-sans text-on-surface-variant">
              No other profiles linked to this phone number yet.
            </Text>
          ) : (
            <>
              {linkedProfiles.map((p) => {
                const isCached = cachedAccounts.some((a) => a.userId === p.id);
                return (
                  <View
                    key={p.id}
                    className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                        <Text className="font-sans-bold text-primary">
                          {p.first_name[0]?.toUpperCase() ?? "?"}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-sans-medium text-on-surface">
                          {p.first_name} {p.last_name}
                        </Text>
                        <Text className="font-sans text-xs text-on-surface-variant">{p.email}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleSwitchProfile(p)} disabled={switching}>
                      <Text className="font-sans-medium text-primary">
                        {isCached ? "Switch" : "Sign in"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                onPress={() => router.push("/subscriptions/linked-summary")}
                className="items-center rounded-lg border border-outline-variant px-6 py-3"
              >
                <Text className="font-sans-semibold text-sm text-primary">
                  View all linked subscriptions
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </GestureDetector>

      {/* Settings bottom sheet -- gear icon in the header above. Deliberately
          outside GestureDetector: it only ever takes exactly one child
          (the scroll view above), and a sibling here broke that at runtime. */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setSettingsOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="gap-3 rounded-t-2xl bg-background p-5 pb-8"
          >
            <View className="mx-auto h-1 w-10 rounded-full bg-outline-variant" />
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-xl text-on-background">Settings</Text>
              <Pressable
                onPress={() => setSettingsOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container"
              >
                <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-4 py-3.5">
              <Text className="font-sans-semibold text-sm text-on-surface">Notifications</Text>
              <Pressable
                onPress={() => setNotificationsOn((v) => !v)}
                className={clsx(
                  "h-6 w-11 justify-center rounded-full px-0.5",
                  notificationsOn ? "bg-primary" : "bg-outline-variant"
                )}
              >
                <View
                  className={clsx(
                    "h-5 w-5 rounded-full bg-white",
                    notificationsOn ? "self-end" : "self-start"
                  )}
                />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-4 py-3.5">
              <Text className="font-sans-semibold text-sm text-on-surface">Dark Mode</Text>
              {darkModeSupported ? (
                <Pressable
                  onPress={() => setThemePreference(isDark ? "light" : "dark")}
                  className={clsx(
                    "h-6 w-11 justify-center rounded-full px-0.5",
                    isDark ? "bg-primary" : "bg-outline-variant"
                  )}
                >
                  <View
                    className={clsx("h-5 w-5 rounded-full bg-white", isDark ? "self-end" : "self-start")}
                  />
                </Pressable>
              ) : (
                <Text className="font-sans text-xs text-on-surface-variant">iOS/Android only</Text>
              )}
            </View>
            {!darkModeSupported ? (
              <Text className="-mt-2 font-sans text-[11px] text-on-surface-variant">
                Browsers don&apos;t let apps override your system&apos;s light/dark setting on
                the web -- switch your OS or browser theme instead.
              </Text>
            ) : null}

            <Text className="font-sans-semibold text-sm text-on-surface">Currency</Text>
            <Text className="-mt-2 font-sans text-[11px] text-on-surface-variant">
              Used to total up spending in Insights -- each subscription still shows in the
              currency it&apos;s actually billed in.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c.code}
                    onPress={() => handleSetHomeCurrency(c.code)}
                    className={clsx(
                      "items-center rounded-lg border px-3 py-2",
                      profile?.home_currency === c.code
                        ? "border-primary bg-primary/15"
                        : "border-outline-variant"
                    )}
                  >
                    <Text className="font-sans-medium text-on-surface">{c.code}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable
              onPress={handleLogout}
              className="mt-2 items-center rounded-lg bg-primary px-6 py-4"
            >
              <Text className="font-display-medium text-on-primary">Sign Out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default Settings;
