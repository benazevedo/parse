import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ModalHeader } from "@/components/ModalHeader";
import { PriorityPicker } from "@/components/PriorityPicker";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import {
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_KINDS,
  type CaptureActionResult,
  type KnowledgeDisposition,
  type KnowledgeDomain,
  type KnowledgeKind,
} from "@/types/capture";
import type { ProjectStatus } from "@/types/project";
import type { TaskPriority } from "@/types/task";

type TriageMode = "task" | "project" | "knowledge" | "someday";

const outcomes: {
  mode: TriageMode;
  label: string;
  support: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    mode: "task",
    label: "Do",
    support: "Make it actionable",
    icon: "checkmark-circle-outline",
  },
  {
    mode: "project",
    label: "Project",
    support: "Name an outcome",
    icon: "layers-outline",
  },
  {
    mode: "knowledge",
    label: "Keep",
    support: "Remember it",
    icon: "library-outline",
  },
  {
    mode: "someday",
    label: "Someday",
    support: "Not now, not never",
    icon: "cloud-outline",
  },
];

function label(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export default function TriageCaptureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const captureItems = useTaskStore((state) => state.captureItems);
  const projects = useTaskStore((state) => state.projects);
  const activeSlots = useTaskStore((state) => state.activeSlots);
  const processAsTask = useTaskStore((state) => state.processCaptureAsTask);
  const processAsProject = useTaskStore(
    (state) => state.processCaptureAsProject,
  );
  const processAsKnowledge = useTaskStore(
    (state) => state.processCaptureAsKnowledge,
  );
  const archiveCapture = useTaskStore((state) => state.archiveCapture);
  const capture = captureItems.find((item) => item.id === id);
  const [mode, setMode] = useState<TriageMode | null>(null);
  const [title, setTitle] = useState(capture?.content ?? "");
  const [notes, setNotes] = useState(capture?.notes ?? "");
  const [priority, setPriority] = useState<TaskPriority>("should");
  const [addToToday, setAddToToday] = useState(false);
  const [estimate, setEstimate] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [projectStatus, setProjectStatus] =
    useState<Exclude<ProjectStatus, "completed">>("parked");
  const [activeSlotId, setActiveSlotId] = useState<string | undefined>();
  const [kind, setKind] = useState<KnowledgeKind>("idea");
  const [domain, setDomain] = useState<KnowledgeDomain | undefined>();

  const finish = (outcome: string) => {
    if (!capture) return;
    router.replace({
      pathname: "/inbox",
      params: {
        undoCaptureId: capture.id,
        outcome,
        undoToken: Date.now().toString(),
      },
    } as unknown as Href);
  };

  const showFailure = (result: CaptureActionResult) => {
    if (!result.ok) Alert.alert("Not processed", result.message);
    return result.ok;
  };

  const saveTask = () => {
    if (!capture) return;
    const minutes = estimate.trim() ? Number(estimate) : undefined;
    const result = processAsTask(capture.id, {
      title,
      notes,
      priority,
      addToToday,
      estimatedMinutes: minutes,
    });
    if (showFailure(result)) finish("Task created");
  };

  const projectInput = () => ({
    title,
    desiredOutcome,
    status: projectStatus,
    activeSlotId: projectStatus === "active" ? activeSlotId : undefined,
  });

  const saveProject = (projectIdsToPark: string[] = []) => {
    if (!capture) return;
    const result = processAsProject(
      capture.id,
      projectInput(),
      projectIdsToPark,
    );
    if (result.ok) {
      finish("Project created");
      return;
    }
    const conflicts = projects.filter((project) =>
      result.conflictingProjectIds?.includes(project.id),
    );
    if (!activeSlotId || conflicts.length === 0) {
      showFailure(result);
      return;
    }
    const slot = activeSlots.find((item) => item.id === activeSlotId);
    Alert.alert(
      `${slot?.name ?? "This slot"} is full`,
      `${conflicts.map((project) => project.title).join(", ")} is active here. Parking preserves its plan and next action.`,
      [
        { text: `Keep ${conflicts[0].title}`, style: "cancel" },
        {
          text: "Park & create",
          onPress: () => saveProject(conflicts.map((project) => project.id)),
        },
      ],
    );
  };

  const saveKnowledge = (disposition: KnowledgeDisposition) => {
    if (!capture) return;
    const result = processAsKnowledge(capture.id, {
      title,
      kind: disposition === "someday" && kind === "idea" ? "other" : kind,
      domain,
      disposition,
    });
    if (showFailure(result)) {
      finish(
        disposition === "someday" ? "Saved for Someday" : "Saved to Knowledge",
      );
    }
  };

  const archive = () => {
    if (!capture) return;
    Alert.alert(
      "Archive this capture?",
      "It will stay stored and can be restored from the Inbox archive.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            const result = archiveCapture(capture.id);
            if (showFailure(result)) finish("Capture archived");
          },
        },
      ],
    );
  };

  if (!capture || capture.status !== "inbox") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="Process" />
        <View style={styles.missing}>
          <Text style={styles.prompt}>This capture is no longer waiting.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Return to Inbox</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ModalHeader title="Process Capture" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>CAPTURED THOUGHT</Text>
          <View style={styles.captureCard}>
            <Text style={styles.captureContent}>{capture.content}</Text>
            {capture.notes ? (
              <Text style={styles.captureNotes}>{capture.notes}</Text>
            ) : null}
          </View>

          {!mode ? (
            <>
              <Text style={styles.prompt}>What should this become?</Text>
              <Text style={styles.support}>
                Decide only when you are ready.
              </Text>
              <View style={styles.outcomeGrid}>
                {outcomes.map((outcome) => (
                  <Pressable
                    key={outcome.mode}
                    onPress={() => {
                      setMode(outcome.mode);
                      if (outcome.mode === "someday") setKind("other");
                    }}
                    style={({ pressed }) => [
                      styles.outcome,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      color={colors.accent}
                      name={outcome.icon}
                      size={22}
                    />
                    <Text style={styles.outcomeTitle}>{outcome.label}</Text>
                    <Text style={styles.outcomeSupport}>{outcome.support}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={archive} style={styles.archiveAction}>
                <Ionicons
                  color={colors.muted}
                  name="archive-outline"
                  size={18}
                />
                <Text style={styles.archiveText}>Archive</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.formHeading}>
                <Pressable
                  onPress={() => setMode(null)}
                  style={styles.backChoice}
                >
                  <Ionicons
                    color={colors.accent}
                    name="chevron-back"
                    size={17}
                  />
                  <Text style={styles.link}>Choose another outcome</Text>
                </Pressable>
                <Text style={styles.prompt}>
                  {mode === "task"
                    ? "Make it doable."
                    : mode === "project"
                      ? "Name the finished outcome."
                      : mode === "someday"
                        ? "Let it wait without pressure."
                        : "Keep what is worth remembering."}
                </Text>
              </View>

              <Field label={mode === "task" ? "Task title" : "Title"}>
                <TextInput
                  onChangeText={setTitle}
                  placeholderTextColor={colors.disabled}
                  style={styles.input}
                  value={title}
                />
              </Field>

              {mode === "task" ? (
                <>
                  <Field label="Notes (optional)">
                    <TextInput
                      multiline
                      onChangeText={setNotes}
                      placeholder="Useful context"
                      placeholderTextColor={colors.disabled}
                      style={[styles.input, styles.multiline]}
                      textAlignVertical="top"
                      value={notes}
                    />
                  </Field>
                  <Field label="Priority">
                    <PriorityPicker onSelect={setPriority} value={priority} />
                  </Field>
                  <Field label="Estimate (optional minutes)">
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={setEstimate}
                      placeholder="30"
                      placeholderTextColor={colors.disabled}
                      style={styles.input}
                      value={estimate}
                    />
                  </Field>
                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.fieldLabel}>Add to Today</Text>
                      <Text style={styles.switchSupport}>
                        Use the priority chosen above.
                      </Text>
                    </View>
                    <Switch onValueChange={setAddToToday} value={addToToday} />
                  </View>
                  <SaveButton label="Create task" onPress={saveTask} />
                </>
              ) : null}

              {mode === "project" ? (
                <>
                  <Field label="Desired outcome">
                    <TextInput
                      multiline
                      onChangeText={setDesiredOutcome}
                      placeholder="What will be meaningfully different when this is done?"
                      placeholderTextColor={colors.disabled}
                      style={[styles.input, styles.multiline]}
                      textAlignVertical="top"
                      value={desiredOutcome}
                    />
                  </Field>
                  <Field label="Initial status">
                    <View style={styles.chips}>
                      {(["active", "parked", "someday"] as const).map(
                        (status) => (
                          <Choice
                            key={status}
                            label={label(status)}
                            onPress={() => setProjectStatus(status)}
                            selected={projectStatus === status}
                          />
                        ),
                      )}
                    </View>
                  </Field>
                  {projectStatus === "active" ? (
                    <Field label="Active slot (optional)">
                      <View style={styles.chips}>
                        <Choice
                          label="No slot"
                          onPress={() => setActiveSlotId(undefined)}
                          selected={!activeSlotId}
                        />
                        {activeSlots
                          .filter((slot) => slot.enabled)
                          .sort((a, b) => a.order - b.order)
                          .map((slot) => (
                            <Choice
                              key={slot.id}
                              label={slot.name}
                              onPress={() => setActiveSlotId(slot.id)}
                              selected={activeSlotId === slot.id}
                            />
                          ))}
                      </View>
                    </Field>
                  ) : null}
                  <SaveButton
                    label="Create project"
                    onPress={() => saveProject()}
                  />
                </>
              ) : null}

              {mode === "knowledge" || mode === "someday" ? (
                <>
                  <Field label="Kind">
                    <View style={styles.chips}>
                      {KNOWLEDGE_KINDS.map((option) => (
                        <Choice
                          key={option}
                          label={label(option)}
                          onPress={() => setKind(option)}
                          selected={kind === option}
                        />
                      ))}
                    </View>
                  </Field>
                  <Field label="Domain (optional)">
                    <View style={styles.chips}>
                      <Choice
                        label="None"
                        onPress={() => setDomain(undefined)}
                        selected={!domain}
                      />
                      {KNOWLEDGE_DOMAINS.map((option) => (
                        <Choice
                          key={option}
                          label={label(option)}
                          onPress={() => setDomain(option)}
                          selected={domain === option}
                        />
                      ))}
                    </View>
                  </Field>
                  {mode === "someday" ? (
                    <Text style={styles.somedayCopy}>
                      You do not owe this idea anything today.
                    </Text>
                  ) : null}
                  <SaveButton
                    label={
                      mode === "someday"
                        ? "Save for Someday"
                        : "Save to Knowledge"
                    }
                    onPress={() =>
                      saveKnowledge(
                        mode === "someday" ? "someday" : "reference",
                      )
                    }
                  />
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label: fieldLabel,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{fieldLabel}</Text>
      {children}
    </View>
  );
}

function Choice({
  label: choiceLabel,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {choiceLabel}
      </Text>
    </Pressable>
  );
}

function SaveButton({
  label: buttonLabel,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.save, pressed && styles.pressed]}
    >
      <Text style={styles.saveText}>{buttonLabel}</Text>
      <Ionicons color={colors.surface} name="arrow-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  captureCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  captureContent: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 24,
  },
  captureNotes: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  prompt: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    lineHeight: 31,
    marginTop: spacing.xl,
  },
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    marginTop: spacing.xs,
  },
  outcomeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  outcome: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 132,
    padding: spacing.lg,
    width: "48%",
  },
  outcomeTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.md,
  },
  outcomeSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  archiveAction: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  archiveText: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  formHeading: { marginBottom: spacing.sm },
  backChoice: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xl,
    minHeight: 36,
  },
  link: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  field: { marginTop: spacing.lg },
  fieldLabel: {
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
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  multiline: { lineHeight: 22, minHeight: 104, padding: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  choiceSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  choiceText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  choiceTextSelected: { color: colors.accent },
  switchRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  switchCopy: { flex: 1 },
  switchSupport: { color: colors.muted, fontSize: typography.size.caption },
  somedayCopy: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    lineHeight: 22,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xxl,
    minHeight: 52,
  },
  saveText: {
    color: colors.surface,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  missing: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  pressed: { opacity: 0.65 },
});
