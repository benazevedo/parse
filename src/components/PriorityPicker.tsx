import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { TaskPriority } from "@/types/task";

const priorities: TaskPriority[] = ["must", "should", "could"];

const priorityColors = {
  must: { background: colors.mustSoft, foreground: colors.must },
  should: { background: colors.shouldSoft, foreground: colors.should },
  could: { background: colors.couldSoft, foreground: colors.could },
};

interface PriorityPickerProps {
  value?: TaskPriority;
  onSelect: (priority: TaskPriority) => void;
  compact?: boolean;
}

export function PriorityPicker({
  value,
  onSelect,
  compact = false,
}: PriorityPickerProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.container}>
      {priorities.map((priority) => {
        const selected = priority === value;
        const palette = priorityColors[priority];

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={priority}
            onPress={() => onSelect(priority)}
            style={({ pressed }) => [
              styles.option,
              compact && styles.optionCompact,
              {
                backgroundColor: selected
                  ? palette.background
                  : colors.surfaceMuted,
              },
              selected && { borderColor: palette.foreground },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[styles.dot, { backgroundColor: palette.foreground }]}
            />
            <Text
              style={[
                styles.label,
                compact && styles.labelCompact,
                { color: selected ? palette.foreground : colors.text },
              ]}
            >
              {priority[0].toUpperCase() + priority.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  optionCompact: {
    flex: 0,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    borderRadius: radii.pill,
    height: 7,
    width: 7,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  labelCompact: {
    fontSize: 11,
  },
  pressed: {
    opacity: 0.72,
  },
});
