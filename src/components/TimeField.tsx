import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

interface TimeFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

export function TimeField({ label, value, onChangeText }: TimeFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder="6:00 AM"
        placeholderTextColor={colors.disabled}
        selectTextOnFocus
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1 },
  label: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
});
