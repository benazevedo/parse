import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radii, spacing, typography } from "@/theme/tokens";

const domains: {
  name: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    name: "Family",
    description: "People and moments that matter",
    icon: "people-outline",
  },
  {
    name: "Faith",
    description: "Reflection, prayer, and presence",
    icon: "heart-outline",
  },
  {
    name: "Fitness",
    description: "Training and daily movement",
    icon: "fitness-outline",
  },
  {
    name: "Home",
    description: "Care, repairs, and routines",
    icon: "home-outline",
  },
  {
    name: "Learning",
    description: "What you are studying now",
    icon: "book-outline",
  },
  {
    name: "Knowledge",
    description: "Ideas worth finding again",
    icon: "library-outline",
  },
];

export default function LifeScreen() {
  return (
    <Screen>
      <ScreenHeader
        subtitle="The parts of life that support the work—and give it meaning."
        title="Life"
      />
      <View style={styles.grid}>
        {domains.map((domain) => (
          <View key={domain.name} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons color={colors.accent} name={domain.icon} size={22} />
            </View>
            <Text style={styles.title}>{domain.name}</Text>
            <Text style={styles.description}>{domain.description}</Text>
            <Text style={styles.soon}>PLANNED</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 176,
    padding: spacing.lg,
    width: "48%",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    marginBottom: spacing.lg,
    width: 42,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  description: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  soon: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginTop: "auto",
    paddingTop: spacing.md,
  },
});
