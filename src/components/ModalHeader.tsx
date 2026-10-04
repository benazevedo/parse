import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme/tokens";

interface ModalHeaderProps {
  title: string;
}

export function ModalHeader({ title }: ModalHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => router.back()}
        style={styles.button}
      >
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  button: { justifyContent: "center", minHeight: 40, width: 72 },
  cancel: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
});
