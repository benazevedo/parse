import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { Project, ProjectStatus } from "@/types/project";

function openProject(id: string) {
  router.push({ pathname: "/project/[id]", params: { id } });
}

function ProjectList({ projects }: { projects: Project[] }) {
  const steps = useTaskStore((state) => state.projectSteps);
  return (
    <View style={styles.list}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          onPress={() => openProject(project.id)}
          project={project}
          steps={steps.filter((step) => step.projectId === project.id)}
        />
      ))}
    </View>
  );
}

function SecondarySection({
  label,
  projects,
  emptyMessage,
}: {
  label: string;
  projects: Project[];
  emptyMessage: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.count}>{projects.length}</Text>
      </View>
      {projects.length ? (
        <ProjectList projects={projects} />
      ) : (
        <Text style={styles.emptySection}>{emptyMessage}</Text>
      )}
    </View>
  );
}

const secondary: {
  status: Exclude<ProjectStatus, "active" | "completed">;
  label: string;
  empty: string;
}[] = [
  { status: "parked", label: "PARKED", empty: "Not now, not never." },
  {
    status: "someday",
    label: "SOMEDAY",
    empty: "Future possibilities can rest here.",
  },
];

export default function ProjectsScreen() {
  const projects = useTaskStore((state) => state.projects);
  const slots = useTaskStore((state) => state.activeSlots);
  const [showCompleted, setShowCompleted] = useState(false);
  const active = projects.filter((project) => project.status === "active");
  const completed = projects.filter(
    (project) => project.status === "completed",
  );
  const unslotted = active.filter((project) => !project.activeSlotId);

  return (
    <Screen>
      <ScreenHeader
        subtitle="Keep a few discretionary outcomes active. Everything else can wait."
        title="Projects"
      />

      <View style={styles.utilityRow}>
        <Pressable
          onPress={() => router.push("/review" as Href)}
          style={({ pressed }) => [styles.utility, pressed && styles.pressed]}
        >
          <Ionicons color={colors.accent} name="refresh-outline" size={18} />
          <Text style={styles.utilityText}>Weekly Review</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/focus/slots" as Href)}
          style={({ pressed }) => [styles.utility, pressed && styles.pressed]}
        >
          <Ionicons color={colors.accent} name="options-outline" size={18} />
          <Text style={styles.utilityText}>Slot settings</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/project/new")}
        style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
      >
        <View style={styles.newIcon}>
          <Ionicons color={colors.surface} name="add" size={20} />
        </View>
        <View style={styles.newCopy}>
          <Text style={styles.newTitle}>Create project</Text>
          <Text style={styles.newSubtitle}>
            Name the outcome, then choose its place.
          </Text>
        </View>
        <Ionicons color={colors.accent} name="arrow-forward" size={18} />
      </Pressable>

      {projects.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          message="Start with an outcome that is too large to do in one sitting."
          title="What do you want to finish?"
        />
      ) : (
        <>
          <View style={styles.activeHeading}>
            <Text style={styles.activeLabel}>ACTIVE NOW</Text>
            <Text style={styles.activeSupport}>
              Your current discretionary focus
            </Text>
          </View>
          {slots
            .filter((slot) => slot.enabled)
            .sort((a, b) => a.order - b.order)
            .map((slot) => {
              const occupants = active.filter(
                (project) => project.activeSlotId === slot.id,
              );
              return (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotHeading}>
                    <Text style={styles.slotName}>{slot.name}</Text>
                    <Text style={styles.capacity}>
                      {occupants.length}/{slot.maxActiveProjects}
                    </Text>
                  </View>
                  {occupants.length ? (
                    <ProjectList projects={occupants} />
                  ) : (
                    <Text style={styles.emptySlot}>
                      Open for what matters next.
                    </Text>
                  )}
                </View>
              );
            })}

          {unslotted.length ? (
            <SecondarySection
              emptyMessage=""
              label="OTHER ACTIVE"
              projects={unslotted}
            />
          ) : null}

          <View style={styles.secondaryDivider} />
          {secondary.map((section) => (
            <SecondarySection
              emptyMessage={section.empty}
              key={section.status}
              label={section.label}
              projects={projects.filter(
                (project) => project.status === section.status,
              )}
            />
          ))}

          <View style={styles.completedSection}>
            <Pressable
              onPress={() => setShowCompleted((current) => !current)}
              style={({ pressed }) => [
                styles.completedToggle,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.sectionLabel}>COMPLETED</Text>
              <Text style={styles.count}>{completed.length}</Text>
              <Ionicons
                color={colors.muted}
                name={showCompleted ? "chevron-up" : "chevron-down"}
                size={16}
              />
            </Pressable>
            {showCompleted ? <ProjectList projects={completed} /> : null}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  utilityRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  utility: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingRight: spacing.md,
  },
  utilityText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  newButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xxl,
    padding: spacing.lg,
  },
  newIcon: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  newCopy: { flex: 1 },
  newTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  newSubtitle: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: 3,
  },
  activeHeading: { marginBottom: spacing.lg },
  activeLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
  },
  activeSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },
  slotCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  slotHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  slotName: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.bold,
  },
  capacity: { color: colors.muted, fontSize: typography.size.caption },
  emptySlot: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    paddingVertical: spacing.md,
  },
  list: { gap: spacing.md },
  secondaryDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  section: { marginBottom: spacing.xxl },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  count: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  emptySection: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    paddingVertical: spacing.sm,
  },
  completedSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
  },
  completedToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
  },
  pressed: { opacity: 0.65 },
});
