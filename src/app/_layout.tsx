import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useTaskStore } from "@/store/task-store";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  const hasHydrated = useTaskStore((state) => state.hasHydrated);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {hasHydrated ? (
        <Stack screenOptions={{ contentStyle: styles.content }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="capture"
            options={{
              animation: "slide_from_bottom",
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="project/new"
            options={{
              animation: "slide_from_bottom",
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="project/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="project/[id]/parse"
            options={{
              animation: "slide_from_bottom",
              headerShown: false,
              presentation: "modal",
            }}
          />
        </Stack>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});
