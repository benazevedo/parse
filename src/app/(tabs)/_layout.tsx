import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { colors, typography } from "@/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: typography.size.caption,
          fontWeight: typography.weight.medium,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "sunny" : "sunny-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "file-tray-full" : "file-tray-full-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "layers" : "layers-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="life"
        options={{
          title: "Life",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "grid" : "grid-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: "Ask",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? "sparkles" : "sparkles-outline"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
