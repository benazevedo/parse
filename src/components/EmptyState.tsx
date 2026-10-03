import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.accent} name={icon} size={24} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: "center",
    marginBottom: spacing.lg,
    width: 48,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },
  message: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.sm,
    maxWidth: 280,
    textAlign: "center",
  },
});
