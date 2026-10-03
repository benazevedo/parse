import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function AskScreen() {
  return (
    <Screen>
      <ScreenHeader
        subtitle="Eventually, Ask will help you reason over what you have saved in PARSE."
        title="Ask"
      />
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.accent} name="sparkles" size={26} />
        </View>
        <Text style={styles.title}>Answers grounded in your life.</Text>
        <Text style={styles.body}>
          Ask will use your tasks, projects, plans, and knowledge—not a generic
          chat history—to help you decide what matters.
        </Text>
        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel="Ask PARSE, coming later"
            editable={false}
            placeholder="Ask PARSE…"
            placeholderTextColor={colors.disabled}
            style={styles.input}
          />
          <Ionicons color={colors.disabled} name="arrow-up-circle" size={26} />
        </View>
        <Text style={styles.status}>NOT ACTIVE YET</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: "center",
    marginBottom: spacing.xl,
    width: 52,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.3,
    lineHeight: 31,
  },
  body: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  input: {
    color: colors.disabled,
    flex: 1,
    fontSize: typography.size.bodyLarge,
    minHeight: 54,
  },
  status: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
