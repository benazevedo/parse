import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { Project, ProjectStatus } from "@/types/project";

interface ProjectSectionProps {
  label: string;
  projects: Project[];
  emptyMessage: string;
}

function ProjectSection({
  label,
  projects,
  emptyMessage,
}: ProjectSectionProps) {
  const allSteps = useTaskStore((state) => state.projectSteps);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.count}>{projects.length}</Text>
      </View>
      {projects.length ? (
        <View style={styles.list}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              onPress={() =>
                router.push({
                  pathname: "/project/[id]",
                  params: { id: project.id },
                })
              }
              project={project}
              steps={allSteps.filter((step) => step.projectId === project.id)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptySection}>{emptyMessage}</Text>
      )}
    </View>
  );
}

const sectionDetails: {
  status: Exclude<ProjectStatus, "completed">;
  label: string;
  emptyMessage: string;
}[] = [
  {
    status: "active",
    label: "ACTIVE",
    emptyMessage: "No active outcomes yet.",
  },
  {
    status: "parked",
    label: "PARKED",
    emptyMessage: "Nothing is intentionally paused.",
  },
  {
    status: "someday",
    label: "SOMEDAY",
    emptyMessage: "Future possibilities can rest here.",
  },
];

export default function ProjectsScreen() {
  const projects = useTaskStore((state) => state.projects);
  const projectSteps = useTaskStore((state) => state.projectSteps);
  const [showCompleted, setShowCompleted] = useState(false);
  const completed = projects.filter(
    (project) => project.status === "completed",
  );

  return (
    <Screen>
      <ScreenHeader
        subtitle="Turn meaningful outcomes into one executable next action."
        title="Projects"
      />
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
            Name the outcome, then parse it down.
          </Text>
        </View>
        <Ionicons color={colors.accent} name="arrow-forward" size={18} />
      </Pressable>

      {projects.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          message="Start with an outcome that is too large to do in one sitting. PARSE will help you find the next action."
          title="What do you want to finish?"
        />
      ) : (
        <>
          {sectionDetails.map((section) => (
            <ProjectSection
              emptyMessage={section.emptyMessage}
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
            {showCompleted ? (
              <View style={styles.list}>
                {completed.map((project) => (
                  <ProjectCard
                    key={project.id}
                    onPress={() =>
                      router.push({
                        pathname: "/project/[id]",
                        params: { id: project.id },
                      })
                    }
                    project={project}
                    steps={projectSteps.filter(
                      (step) => step.projectId === project.id,
                    )}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  list: { gap: spacing.md },
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
