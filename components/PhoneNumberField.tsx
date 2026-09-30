import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import { COUNTRY_CODES } from "@/lib/phoneCurrency";

// Splits a stored value like "+918008437995" back into { dialCode, local }
// for display -- longest dial code first, same reasoning as
// lib/phoneCurrency.ts's SORTED_DIAL_CODES. A value with no leading "+" (an
// old phone number saved before this picker existed) has no dial code at
// all, so it's shown entirely as the local part with no country selected.
const SORTED_DIAL_CODES = [...new Set(COUNTRY_CODES.map((c) => c.dialCode))].sort(
  (a, b) => b.length - a.length
);
function parseValue(value: string): { dialCode: string; local: string } {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1);
    for (const dialCode of SORTED_DIAL_CODES) {
      if (digits.startsWith(dialCode)) return { dialCode, local: digits.slice(dialCode.length) };
    }
  }
  return { dialCode: "", local: trimmed };
}

// Combined country-code picker + number input, replacing a plain free-text
// phone TextInput -- without an explicit country, "8008437995" and
// "+918008437995" look identical to a human but only the second lets the
// app infer a home currency at all (see lib/phoneCurrency.ts). Treated as a
// single controlled string (the full "+<dialCode><local>" value), same
// interface as a plain TextInput, so it drops into sign-up.tsx/settings.tsx
// with no change to how the surrounding form stores/saves phoneNumber.
export function PhoneNumberField({
  value,
  onChangeText,
  placeholder = "Phone number",
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
}) {
  const colors = useThemeColors();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { dialCode, local } = parseValue(value);
  const country = COUNTRY_CODES.find((c) => c.dialCode === dialCode);

  const handlePickCountry = (next: (typeof COUNTRY_CODES)[number]) => {
    setPickerOpen(false);
    onChangeText(`+${next.dialCode}${local}`);
  };
  const handleChangeLocal = (nextLocal: string) => {
    const digitsOnly = nextLocal.replace(/\D/g, "");
    onChangeText(dialCode ? `+${dialCode}${digitsOnly}` : digitsOnly);
  };

  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="items-center justify-center rounded-lg border border-outline-variant bg-surface-container px-3"
      >
        <Text className="font-sans-medium text-sm text-on-surface">{dialCode ? `+${dialCode}` : "Code"}</Text>
      </Pressable>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={local}
        onChangeText={handleChangeLocal}
        className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-4 py-3 font-sans text-on-surface"
      />

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setPickerOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="max-h-[70%] gap-3 rounded-t-2xl bg-background p-5 pb-8"
          >
            <Text className="font-display-medium text-lg text-on-background">Country Code</Text>
            <ScrollView>
              <View className="gap-1.5">
                {COUNTRY_CODES.map((c) => (
                  <Pressable
                    key={c.iso2}
                    onPress={() => handlePickCountry(c)}
                    className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
                  >
                    <Text className="font-sans-semibold text-sm text-on-surface">{c.name}</Text>
                    <Text className="font-sans text-xs text-on-surface-variant">+{c.dialCode}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable
              onPress={() => setPickerOpen(false)}
              className="items-center rounded-lg border border-outline-variant py-3"
            >
              <Text className="font-sans-medium text-on-surface">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
