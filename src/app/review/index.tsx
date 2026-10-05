import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/Screen";
import {
  getProjectActivity,
  type ProjectActivity,
} from "@/store/focus-transitions";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { FocusActionResult } from "@/types/focus";
import type { Project } from "@/types/project";
import {
  addLocalDays,
  getMondayWeek,
  getRecurringCommitmentOccurrences,
} from "@/utils/recurrence";
import { getLocalDateKey } from "@/utils/time";

const stages = [
  "Look Back",
  "What Moved",
  "What Needs Attention",
  "Choose Focus",
  "Next Action Check",
  "Complete",
] as const;

const activityCopy: Record<ProjectActivity, string> = {
  moved: "Moved this week",
  no_activity: "No recent activity",
};

function dateKeyFromTimestamp(value?: string) {
  return value ? getLocalDateKey(new Date(value)) : undefined;
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function showFailure(result: FocusActionResult) {
  if (!result.ok) Alert.alert("Not changed", result.message);
}

export default function WeeklyReviewScreen() {
  const projects = useTaskStore((state) => state.projects);
  const projectSteps = useTaskStore((state) => state.projectSteps);
  const tasks = useTaskStore((state) => state.tasks);
  const activeSlots = useTaskStore((state) => state.activeSlots);
  const reviews = useTaskStore((state) => state.weeklyReviews);
  const routineStates = useTaskStore((state) => state.routineStates);
  const rules = useTaskStore((state) => state.recurrenceRules);
  const commitments = useTaskStore((state) => state.recurringCommitments);
  const overrides = useTaskStore((state) => state.recurrenceOverrides);
  const startWeeklyReview = useTaskStore((state) => state.startWeeklyReview);
  const completeWeeklyReview = useTaskStore(
    (state) => state.completeWeeklyReview,
  );
  const setProjectStatus = useTaskStore((state) => state.setProjectStatus);
  const parkAndActivateProject = useTaskStore(
    (state) => state.parkAndActivateProject,
  );
  const today = getLocalDateKey();
  const week = getMondayWeek(today);
  const currentReview = reviews.find(
    (review) => review.weekStartDate === week[0],
  );
  const [stage, setStage] = useState(0);
  const [notes, setNotes] = useState(currentReview?.notes ?? "");
  const activeProjects = projects.filter(
    (project) => project.status === "active",
  );
  const discretionary = activeProjects.filter(
    (project) => project.activeSlotId,
  );
  const needsNextAction = discretionary.filter(
    (project) => !project.nextActionId,
  );
  const completedTasks = tasks.filter((task) => {
    const date = dateKeyFromTimestamp(task.completedAt);
    return date && date >= week[0] && date <= week[6];
  });
  const completedSteps = projectSteps.filter((step) => {
    const date = dateKeyFromTimestamp(step.completedAt);
    return date && date >= week[0] && date <= week[6];
  });
  const completedProjects = projects.filter((project) => {
    const date = dateKeyFromTimestamp(project.completedAt);
    return date && date >= week[0] && date <= week[6];
  });
  const completedRoutines = routineStates.filter(
    (state) =>
      state.status === "completed" &&
      state.date >= week[0] &&
      state.date <= week[6],
  );
  const upcomingCommitments = Array.from({ length: 7 }, (_, index) =>
    getRecurringCommitmentOccurrences(
      addLocalDays(today, index),
      rules,
      commitments,
      overrides,
    ),
  ).flat();
  const mustAttention = tasks.filter(
    (task) => task.status !== "completed" && task.priority === "must",
  );

  const begin = () => {
    const result = startWeeklyReview(today);
    showFailure(result);
  };

  const activate = (project: Project, slotId: string) => {
    const result = setProjectStatus(project.id, "active", slotId);
    if (result.ok) return;
    const conflicts = projects.filter((item) =>
      result.conflictingProjectIds?.includes(item.id),
    );
    if (conflicts.length === 0) {
      showFailure(result);
      return;
    }
    const slot = activeSlots.find((item) => item.id === slotId);
    Alert.alert(
      `${slot?.name ?? "This slot"} is full`,
      `${conflicts.map((item) => item.title).join(", ")} is active here. Parking means not now, not never.`,
      [
        { text: `Keep ${conflicts[0].title}`, style: "cancel" },
        {
          text: "Park & activate",
          onPress: () =>
            showFailure(
              parkAndActivateProject(
                project.id,
                slotId,
                conflicts.map((item) => item.id),
              ),
            ),
        },
      ],
    );
  };

  const finish = () => {
    if (!currentReview) return;
    showFailure(completeWeeklyReview(currentReview.id, notes));
  };

  const renderStage = () => {
    if (stage === 0) {
      return (
        <>
          <Text style={styles.stagePrompt}>Notice what you completed.</Text>
          <View style={styles.metrics}>
            <Metric label="Tasks" value={completedTasks.length} />
            <Metric label="Steps" value={completedSteps.length} />
            <Metric label="Projects" value={completedProjects.length} />
            <Metric label="Routines" value={completedRoutines.length} />
          </View>
          {completedTasks.slice(0, 5).map((task) => (
            <Row key={task.id} label={task.title} meta="Completed" />
          ))}
          {completedTasks.length === 0 ? (
            <Text style={styles.empty}>
              Nothing recorded yet. Observation is enough.
            </Text>
          ) : null}
        </>
      );
    }
    if (stage === 1) {
      return (
        <>
          <Text style={styles.stagePrompt}>See where momentum appeared.</Text>
          {activeProjects.map((project) => (
            <Row
              key={project.id}
              label={project.title}
              meta={activityCopy[getProjectActivity(project, week[0])]}
            />
          ))}
          {activeProjects.length === 0 ? (
            <Text style={styles.empty}>No projects are active right now.</Text>
          ) : null}
        </>
      );
    }
    if (stage === 2) {
      return (
        <>
          <Text style={styles.stagePrompt}>Bring unclear edges into view.</Text>
          <Attention
            label="Needs a next action"
            value={needsNextAction.length}
          />
          <Attention label="Open Must tasks" value={mustAttention.length} />
          <Attention
            label="Commitments in the next 7 days"
            value={upcomingCommitments.length}
          />
          {needsNextAction.map((project) => (
            <Pressable
              key={project.id}
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/parse",
                  params: { id: project.id },
                })
              }
              style={styles.needsAction}
            >
              <Text style={styles.needsTitle}>{project.title}</Text>
              <Text style={styles.link}>Choose next action →</Text>
            </Pressable>
          ))}
        </>
      );
    }
    if (stage === 3) {
      return (
        <>
          <Text style={styles.stagePrompt}>Choose a small set for now.</Text>
          {activeSlots
            .filter((slot) => slot.enabled)
            .sort((a, b) => a.order - b.order)
            .map((slot) => {
              const occupants = projects.filter(
                (project) =>
                  project.status === "active" &&
                  project.activeSlotId === slot.id,
              );
              const candidates = projects.filter(
                (project) =>
                  project.status !== "completed" &&
                  !occupants.some((item) => item.id === project.id),
              );
              return (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotHeading}>
                    <Text style={styles.slotName}>{slot.name}</Text>
                    <Text style={styles.slotCount}>
                      {occupants.length}/{slot.maxActiveProjects}
                    </Text>
                  </View>
                  {occupants.map((project) => (
                    <View key={project.id} style={styles.focusRow}>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowLabel}>{project.title}</Text>
                        <Text style={styles.rowMeta}>Keep as focus</Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          showFailure(setProjectStatus(project.id, "parked"))
                        }
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>Park</Text>
                      </Pressable>
                    </View>
                  ))}
                  {occupants.length === 0 ? (
                    <Text style={styles.empty}>This slot is open.</Text>
                  ) : null}
                  <Text style={styles.candidateLabel}>SWITCH OR ACTIVATE</Text>
                  {candidates.slice(0, 5).map((project) => (
                    <Pressable
                      key={project.id}
                      onPress={() => activate(project, slot.id)}
                      style={styles.candidate}
                    >
                      <Text style={styles.candidateTitle}>{project.title}</Text>
                      <Text style={styles.link}>Choose</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
        </>
      );
    }
    if (stage === 4) {
      return (
        <>
          <Text style={styles.stagePrompt}>
            Make the first physical action obvious.
          </Text>
          {discretionary.map((project) => {
            const step = projectSteps.find(
              (item) => item.id === project.nextActionId,
            );
            return (
              <Pressable
                key={project.id}
                onPress={() =>
                  router.push({
                    pathname: step ? "/project/[id]" : "/project/[id]/parse",
                    params: { id: project.id },
                  })
                }
                style={styles.actionCheck}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{project.title}</Text>
                  <Text style={[styles.rowMeta, !step && styles.warning]}>
                    {step ? step.title : "Needs a next action"}
                  </Text>
                </View>
                <Ionicons
                  color={colors.accent}
                  name="chevron-forward"
                  size={18}
                />
              </Pressable>
            );
          })}
          {discretionary.length === 0 ? (
            <Text style={styles.empty}>
              Choose focus before checking next actions.
            </Text>
          ) : null}
        </>
      );
    }
    return (
      <>
        <Text style={styles.stagePrompt}>Close the loop gently.</Text>
        <Text style={styles.notesLabel}>Notes (optional)</Text>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="What should future you remember?"
          placeholderTextColor={colors.disabled}
          style={styles.notes}
          textAlignVertical="top"
          value={notes}
        />
        <View style={styles.finalSummary}>
          {activeSlots
            .filter((slot) => slot.enabled)
            .sort((a, b) => a.order - b.order)
            .map((slot) => {
              const names = projects
                .filter(
                  (project) =>
                    project.status === "active" &&
                    project.activeSlotId === slot.id,
                )
                .map((project) => project.title);
              return (
                <Row
                  key={slot.id}
                  label={slot.name}
                  meta={names.join(", ") || "Open"}
                />
              );
            })}
        </View>
        <Text style={styles.wait}>Everything else can wait.</Text>
      </>
    );
  };

  const completedHistory = reviews
    .filter((review) => review.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  if (!currentReview || currentReview.completedAt) {
    return (
      <Screen>
        <TopBar />
        <Text style={styles.eyebrow}>WEEKLY REVIEW</Text>
        <Text style={styles.title}>
          {currentReview?.completedAt
            ? "This week is clear."
            : "Make space for the week."}
        </Text>
        <Text style={styles.subtitle}>
          {currentReview?.completedAt
            ? "Your focus is chosen. Everything else can wait."
            : "Look back, notice what needs attention, and choose a small focus."}
        </Text>
        {!currentReview ? (
          <Pressable onPress={begin} style={styles.primary}>
            <Text style={styles.primaryText}>Start weekly review</Text>
          </Pressable>
        ) : (
          <View style={styles.completeCard}>
            <Ionicons
              color={colors.success}
              name="checkmark-circle"
              size={28}
            />
            <Text style={styles.completeTitle}>Review complete</Text>
            <Text style={styles.completeMeta}>
              {formatReviewDate(currentReview.completedAt!)}
            </Text>
            {currentReview.selectedFocusProjectIds
              .flatMap((projectId) => {
                const project = projects.find((item) => item.id === projectId);
                return project ? [project] : [];
              })
              .sort(
                (a, b) =>
                  activeSlots.findIndex((slot) => slot.id === a.activeSlotId) -
                  activeSlots.findIndex((slot) => slot.id === b.activeSlotId),
              )
              .map((project) => {
                const slot = activeSlots.find(
                  (item) => item.id === project.activeSlotId,
                );
                return (
                  <Text key={project.id} style={styles.completeFocus}>
                    {slot?.name ?? "Focus"} · {project.title}
                  </Text>
                );
              })}
          </View>
        )}
        <Text style={styles.historyLabel}>REVIEW HISTORY</Text>
        {completedHistory.map((review) => (
          <View key={review.id} style={styles.historyRow}>
            <Text style={styles.rowLabel}>Week of {review.weekStartDate}</Text>
            <Text style={styles.rowMeta}>
              Completed {formatReviewDate(review.completedAt!)}
            </Text>
          </View>
        ))}
        {completedHistory.length === 0 ? (
          <Text style={styles.empty}>Completed reviews will appear here.</Text>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar />
      <View style={styles.progressRow}>
        <Text style={styles.eyebrow}>{stages[stage].toUpperCase()}</Text>
        <Text style={styles.progress}>
          {stage + 1} of {stages.length}
        </Text>
      </View>
      <Text style={styles.title}>{stages[stage]}</Text>
      <View style={styles.stageCard}>{renderStage()}</View>
      <View style={styles.navigation}>
        {stage > 0 ? (
          <Pressable
            onPress={() => setStage((value) => value - 1)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() =>
            stage === stages.length - 1
              ? finish()
              : setStage((value) => value + 1)
          }
          style={styles.primarySmall}
        >
          <Text style={styles.primaryText}>
            {stage === stages.length - 1 ? "Complete review" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function TopBar() {
  return (
    <View style={styles.topBar}>
      <Pressable
        hitSlop={10}
        onPress={() => router.back()}
        style={styles.topButton}
      >
        <Ionicons color={colors.accent} name="chevron-back" size={23} />
      </Pressable>
      <Text style={styles.topTitle}>Weekly Review</Text>
      <View style={styles.topButton} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, meta }: { label: string; meta: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowMeta}>{meta}</Text>
    </View>
  );
}

function Attention({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.attention}>
      <Text style={styles.attentionValue}>{value}</Text>
      <Text style={styles.attentionLabel}>{label}</Text>
    </View>
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
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: "center",
    marginTop: spacing.xxl,
    minHeight: 52,
  },
  primarySmall: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.xl,
  },
  primaryText: {
    color: colors.surface,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progress: { color: colors.muted, fontSize: typography.size.caption },
  stageCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  stagePrompt: {
    color: colors.text,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metric: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    minWidth: "47%",
    padding: spacing.md,
  },
  metricValue: {
    color: colors.accent,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    lineHeight: 21,
    paddingVertical: spacing.sm,
  },
  attention: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  attentionValue: {
    color: colors.accent,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    minWidth: 28,
  },
  attentionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.body,
  },
  needsAction: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  needsTitle: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  link: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },
  slotCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  slotHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  slotName: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.bold,
  },
  slotCount: { color: colors.muted, fontSize: typography.size.caption },
  focusRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowCopy: { flex: 1 },
  smallAction: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  smallActionText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  candidateLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginTop: spacing.md,
  },
  candidate: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
  },
  candidateTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.caption,
  },
  actionCheck: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
  },
  warning: { color: colors.must, fontWeight: typography.weight.semibold },
  notesLabel: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
  },
  notes: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.body,
    minHeight: 110,
    padding: spacing.md,
  },
  finalSummary: { marginTop: spacing.lg },
  wait: {
    color: colors.accent,
    fontSize: typography.size.bodyLarge,
    fontStyle: "italic",
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  navigation: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
  },
  secondaryButton: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  secondaryText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  completeCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    marginTop: spacing.xxl,
    padding: spacing.xl,
  },
  completeTitle: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    marginTop: spacing.md,
  },
  completeMeta: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  completeFocus: {
    color: colors.text,
    fontSize: typography.size.body,
    marginTop: spacing.sm,
  },
  historyLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
    marginTop: spacing.xxxl,
  },
  historyRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.lg,
  },
});
