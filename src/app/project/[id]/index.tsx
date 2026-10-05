import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { PriorityPicker } from "@/components/PriorityPicker";
import { ProjectStepTree } from "@/components/projects/ProjectStepTree";
import { Screen } from "@/components/Screen";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { ProjectActionResult, ProjectStatus } from "@/types/project";

function showResult(result: ProjectActionResult): boolean {
  if (!result.ok) Alert.alert("Not changed", result.message);
  return result.ok;
}

const statusCopy: Record<ProjectStatus, string> = {
  active: "Active",
  parked: "Parked",
  someday: "Someday",
  completed: "Completed",
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useTaskStore((state) =>
    state.projects.find((item) => item.id === id),
  );
  const projectSteps = useTaskStore((state) => state.projectSteps);
  const tasks = useTaskStore((state) => state.tasks);
  const setProjectNextAction = useTaskStore(
    (state) => state.setProjectNextAction,
  );
  const addProjectNextActionToToday = useTaskStore(
    (state) => state.addProjectNextActionToToday,
  );
  const completeProjectStep = useTaskStore(
    (state) => state.completeProjectStep,
  );
  const setProjectStatus = useTaskStore((state) => state.setProjectStatus);
  const parkAndActivateProject = useTaskStore(
    (state) => state.parkAndActivateProject,
  );
  const activeSlots = useTaskStore((state) => state.activeSlots);
  const completeProject = useTaskStore((state) => state.completeProject);

  if (!project) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Project not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.linkText}>Return to Projects</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const steps = projectSteps.filter((step) => step.projectId === id);

  const nextAction = steps.find((step) => step.id === project.nextActionId);
  const linkedTask = nextAction
    ? tasks.find(
        (task) =>
          task.sourceProjectStepId === nextAction.id &&
          task.status !== "completed",
      )
    : undefined;
  const activeSteps = steps.filter((step) => step.status === "active").length;
  const completedSteps = steps.length - activeSteps;
  const canEdit = project.status !== "completed";

  const openParse = (parentStepId?: string, mode?: "add") => {
    router.push({
      pathname: "/project/[id]/parse",
      params: {
        id: project.id,
        ...(parentStepId ? { parentStepId } : {}),
        ...(mode ? { mode } : {}),
      },
    });
  };

  const confirmCompleteProject = () => {
    Alert.alert(
      "Complete this project?",
      "The outcome and all remaining steps will be marked complete.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete Project",
          onPress: () => showResult(completeProject(project.id)),
        },
      ],
    );
  };

  const activateInSlot = (activeSlotId?: string) => {
    const result = setProjectStatus(project.id, "active", activeSlotId);
    if (result.ok) return;
    const conflicts = (result.conflictingProjectIds ?? []).flatMap(
      (conflictId) => {
        const conflict = useTaskStore
          .getState()
          .projects.find((item) => item.id === conflictId);
        return conflict ? [conflict] : [];
      },
    );
    if (!activeSlotId || conflicts.length === 0) {
      Alert.alert("Not changed", result.message);
      return;
    }
    const slot = activeSlots.find((item) => item.id === activeSlotId);
    Alert.alert(
      `${slot?.name ?? "This slot"} is full`,
      `${conflicts.map((item) => item.title).join(", ")} is active here. Parking preserves its plan and next action.`,
      [
        { text: `Keep ${conflicts[0].title}`, style: "cancel" },
        {
          text: `Park & activate`,
          onPress: () =>
            showResult(
              parkAndActivateProject(
                project.id,
                activeSlotId,
                conflicts.map((item) => item.id),
              ),
            ),
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back to Projects"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.topButton}
        >
          <Ionicons color={colors.accent} name="chevron-back" size={23} />
        </Pressable>
        <Text style={styles.topTitle}>Project</Text>
        <Pressable
          accessibilityLabel="Capture a new item"
          hitSlop={10}
          onPress={() => router.push("/capture")}
          style={styles.topButton}
        >
          <Ionicons color={colors.accent} name="add" size={24} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroMeta}>
          <Text style={styles.status}>
            {statusCopy[project.status].toUpperCase()}
          </Text>
          <Text style={styles.progress}>
            {steps.length
              ? `${completedSteps}/${steps.length} STEPS`
              : "NOT PARSED"}
          </Text>
        </View>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.outcomeLabel}>DESIRED OUTCOME</Text>
        <Text style={styles.outcome}>{project.desiredOutcome}</Text>
      </View>

      <View style={styles.nextSection}>
        <Text style={styles.sectionLabel}>NEXT ACTION</Text>
        {nextAction ? (
          <View style={styles.nextCard}>
            <View style={styles.nextIcon}>
              <Ionicons color={colors.surface} name="arrow-forward" size={20} />
            </View>
            <Text style={styles.nextTitle}>{nextAction.title}</Text>
            {linkedTask ? (
              <View style={styles.linkedState}>
                <Ionicons
                  color={colors.success}
                  name="checkmark-circle"
                  size={17}
                />
                <Text style={styles.linkedStateText}>
                  {linkedTask.today ? "In Today" : "Active task in Inbox"}
                </Text>
                {linkedTask.today ? (
                  <Pressable onPress={() => router.push("/")}>
                    <Text style={styles.linkText}>View</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : project.status === "active" ? (
              <View style={styles.sendPanel}>
                <Text style={styles.sendLabel}>ADD TO TODAY AS</Text>
                <PriorityPicker
                  onSelect={(priority) =>
                    showResult(
                      addProjectNextActionToToday(project.id, priority),
                    )
                  }
                />
              </View>
            ) : (
              <Text style={styles.pausedMessage}>
                Reactivate this project to send its Next Action to Today.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noNextCard}>
            <Text style={styles.noNextTitle}>Choose one executable step.</Text>
            <Text style={styles.noNextBody}>
              A Next Action has no unfinished children and can be done without
              more planning.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.stepsHeading}>
        <View>
          <Text style={styles.sectionLabel}>PARSED STEPS</Text>
          <Text style={styles.stepsSupport}>
            Outcome → smaller outcome → action
          </Text>
        </View>
        {canEdit ? (
          <Pressable
            onPress={() => openParse(undefined, "add")}
            style={({ pressed }) => [
              styles.smallButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={colors.accent} name="add" size={16} />
            <Text style={styles.smallButtonText}>Add step</Text>
          </Pressable>
        ) : null}
      </View>

      {steps.length ? (
        <ProjectStepTree
          nextActionId={project.nextActionId}
          onComplete={(step) =>
            showResult(completeProjectStep(project.id, step.id))
          }
          onParse={(step) => openParse(step.id)}
          onSetNextAction={(step) =>
            showResult(setProjectNextAction(project.id, step.id))
          }
          projectId={project.id}
          steps={steps}
        />
      ) : (
        <View style={styles.unparsed}>
          <Text style={styles.unparsedTitle}>
            This outcome is still too large.
          </Text>
          <Text style={styles.unparsedBody}>
            Parse it into the first smaller piece. You can keep going from
            there.
          </Text>
        </View>
      )}

      {canEdit ? (
        <Pressable
          onPress={() => openParse()}
          style={({ pressed }) => [
            styles.parseButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={colors.surface}
            name="git-branch-outline"
            size={19}
          />
          <Text style={styles.parseButtonText}>PARSE PROJECT</Text>
        </Pressable>
      ) : null}

      <View style={styles.statusSection}>
        <Text style={styles.sectionLabel}>PROJECT STATUS</Text>
        {canEdit ? (
          <>
            <Text style={styles.slotSupport}>
              {project.status === "active"
                ? "Choose a focus slot, or leave foundational work unslotted."
                : "Reactivate into an open focus slot."}
            </Text>
            <View style={styles.statusActions}>
              <Pressable
                onPress={() => activateInSlot(undefined)}
                style={[
                  styles.statusButton,
                  project.status === "active" &&
                    !project.activeSlotId &&
                    styles.statusButtonSelected,
                ]}
              >
                <Text style={styles.statusButtonText}>No slot</Text>
              </Pressable>
              {activeSlots
                .filter((slot) => slot.enabled)
                .sort((a, b) => a.order - b.order)
                .map((slot) => (
                  <Pressable
                    key={slot.id}
                    onPress={() => activateInSlot(slot.id)}
                    style={[
                      styles.statusButton,
                      project.status === "active" &&
                        project.activeSlotId === slot.id &&
                        styles.statusButtonSelected,
                    ]}
                  >
                    <Text style={styles.statusButtonText}>{slot.name}</Text>
                  </Pressable>
                ))}
            </View>
          </>
        ) : null}
        <View style={styles.statusActions}>
          {project.status === "active" ? (
            <>
              <Pressable
                onPress={() =>
                  showResult(setProjectStatus(project.id, "parked"))
                }
                style={({ pressed }) => [
                  styles.statusButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.statusButtonText}>Park</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  showResult(setProjectStatus(project.id, "someday"))
                }
                style={({ pressed }) => [
                  styles.statusButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.statusButtonText}>Someday</Text>
              </Pressable>
            </>
          ) : null}
          {canEdit ? (
            <Pressable
              onPress={confirmCompleteProject}
              style={({ pressed }) => [
                styles.statusButton,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.statusButtonText, styles.completeProjectText]}
              >
                Complete project
              </Text>
            </Pressable>
          ) : null}
        </View>
        {project.status === "someday" ? (
          <Text style={styles.somedayCopy}>
            You do not owe this idea anything today.
          </Text>
        ) : null}
        {project.status === "parked" ? (
          <Text style={styles.somedayCopy}>Not now, not never.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  topButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  topTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  status: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.3,
  },
  progress: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.7,
    lineHeight: 40,
    marginTop: spacing.lg,
  },
  outcomeLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginTop: spacing.xl,
  },
  outcome: {
    color: colors.text,
    fontSize: typography.size.body,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  nextSection: { marginTop: spacing.xxl },
  sectionLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  nextCard: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  nextIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  nextTitle: {
    color: colors.surface,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    lineHeight: 31,
    marginTop: spacing.lg,
  },
  sendPanel: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.md,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  sendLabel: {
    color: "#DDE8E2",
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  linkedState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  linkedStateText: {
    color: colors.success,
    flex: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  linkText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  pausedMessage: {
    color: "#DDE8E2",
    fontSize: typography.size.caption,
    lineHeight: 18,
    marginTop: spacing.lg,
  },
  noNextCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  noNextTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  noNextBody: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  stepsHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  stepsSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },
  smallButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  smallButtonText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  unparsed: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: spacing.xl,
  },
  unparsedTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  unparsedBody: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  parseButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
  },
  parseButtonText: {
    color: colors.surface,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  statusSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  slotSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  statusButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  statusButtonText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  statusButtonSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  completeProjectText: { color: colors.success },
  somedayCopy: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    marginTop: spacing.lg,
  },
  missing: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
  },
  missingTitle: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
  },
  pressed: { opacity: 0.62 },
});
