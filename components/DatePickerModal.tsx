import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatDateYMD, parseDateYMD } from "@/lib/dateMath";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  visible: boolean;
  onClose: () => void;
  value: string; // "" or YYYY-MM-DD
  minDate: Date;
  onSelect: (dateString: string) => void;
};

// Plain-JS calendar grid, not a native date picker -- avoids pulling in a
// new native module (another EAS rebuild) just for this. Days before
// `minDate` are rendered disabled rather than simply omitted, so it's clear
// they exist but aren't selectable, with the reason surfaced by the caller.
export function DatePickerModal({ visible, onClose, value, minDate, onSelect }: Props) {
  const colors = useThemeColors();
  const selected = parseDateYMD(value);
  const [viewDate, setViewDate] = useState(() => (selected && selected >= minDate ? selected : minDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const minYearMonth = minDate.getFullYear() * 12 + minDate.getMonth();
  const viewYearMonth = year * 12 + month;
  const canGoPrev = viewYearMonth > minYearMonth;

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const changeMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50" onPress={onClose}>
        <Pressable className="w-[320px] gap-3 rounded-xl bg-surface-container p-4" onPress={(e) => e.stopPropagation()}>
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => canGoPrev && changeMonth(-1)} disabled={!canGoPrev} className="h-8 w-8 items-center justify-center">
              <Ionicons name="chevron-back" size={22} color={canGoPrev ? colors.onBackground : colors.onSurfaceVariant} />
            </Pressable>
            <Text className="font-display-medium text-base text-on-surface">
              {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </Text>
            <Pressable onPress={() => changeMonth(1)} className="h-8 w-8 items-center justify-center">
              <Ionicons name="chevron-forward" size={22} color={colors.onBackground} />
            </Pressable>
          </View>

          <View className="flex-row">
            {WEEKDAYS.map((w, i) => (
              <View key={i} className="w-[40px] items-center">
                <Text className="font-sans-medium text-xs text-on-surface-variant">{w}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {cells.map((day, i) => {
              if (day === null) return <View key={i} className="h-10 w-[40px]" />;
              const cellDate = new Date(year, month, day);
              const disabled = cellDate < minDate;
              const isSelected = !!selected && formatDateYMD(selected) === formatDateYMD(cellDate);
              return (
                <Pressable
                  key={i}
                  disabled={disabled}
                  onPress={() => onSelect(formatDateYMD(cellDate))}
                  className={clsx("h-10 w-[40px] items-center justify-center rounded-full", isSelected && "bg-primary")}
                >
                  <Text
                    className={clsx(
                      "font-sans-medium text-sm",
                      disabled ? "text-on-surface-variant opacity-40" : isSelected ? "text-on-primary" : "text-on-surface"
                    )}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onClose} className="items-center rounded-lg border border-outline-variant py-2">
            <Text className="font-sans-medium text-on-surface">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
