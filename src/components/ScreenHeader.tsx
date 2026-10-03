import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function ScreenHeader({ title, subtitle, eyebrow }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityLabel="Capture a new item"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.push("/capture")}
        style={({ pressed }) => [
          styles.capture,
          pressed && styles.capturePressed,
        ]}
      >
        <Ionicons color={colors.surface} name="add" size={19} />
        <Text style={styles.captureText}>Capture</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xxl,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.8,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  capture: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  capturePressed: {
    backgroundColor: colors.accentPressed,
  },
  captureText: {
    color: colors.surface,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
