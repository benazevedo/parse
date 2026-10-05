import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import {
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_KINDS,
  type KnowledgeDomain,
  type KnowledgeKind,
} from "@/types/capture";
import { searchKnowledgeItems } from "@/utils/knowledge";

type Shelf = "knowledge" | "someday" | "archived";

function titleCase(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function KnowledgeScreen() {
  const knowledgeItems = useTaskStore((state) => state.knowledgeItems);
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState<Shelf>("knowledge");
  const [kind, setKind] = useState<KnowledgeKind | undefined>();
  const [domain, setDomain] = useState<KnowledgeDomain | undefined>();

  const visibleItems = useMemo(() => {
    const onShelf = knowledgeItems.filter((item) => {
      if (shelf === "archived") return Boolean(item.archivedAt);
      if (item.archivedAt) return false;
      return shelf === "someday"
        ? item.disposition === "someday"
        : item.disposition === "reference";
    });
    return searchKnowledgeItems(onShelf, query)
      .filter((item) => !kind || item.kind === kind)
      .filter((item) => !domain || item.domain === domain)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [domain, kind, knowledgeItems, query, shelf]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Back to Life"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.back}
          >
            <Ionicons color={colors.accent} name="chevron-back" size={20} />
            <Text style={styles.backText}>Life</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>LIFE / KNOWLEDGE</Text>
        <Text style={styles.title}>Knowledge</Text>
        <Text style={styles.subtitle}>
          Ideas, references, and possibilities worth finding again.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons color={colors.muted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Search Knowledge"
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search title or content"
            placeholderTextColor={colors.disabled}
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
            >
              <Ionicons color={colors.muted} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.shelves}>
          <ShelfButton
            label="Knowledge"
            onPress={() => setShelf("knowledge")}
            selected={shelf === "knowledge"}
          />
          <ShelfButton
            label="Someday"
            onPress={() => setShelf("someday")}
            selected={shelf === "someday"}
          />
          <ShelfButton
            label="Archived"
            onPress={() => setShelf("archived")}
            selected={shelf === "archived"}
          />
        </View>

        <Text style={styles.filterLabel}>KIND</Text>
        <View style={styles.chips}>
          <FilterChip
            label="All"
            onPress={() => setKind(undefined)}
            selected={!kind}
          />
          {KNOWLEDGE_KINDS.map((option) => (
            <FilterChip
              key={option}
              label={titleCase(option)}
              onPress={() => setKind(option)}
              selected={kind === option}
            />
          ))}
        </View>

        <Text style={styles.filterLabel}>DOMAIN</Text>
        <View style={styles.chips}>
          <FilterChip
            label="All"
            onPress={() => setDomain(undefined)}
            selected={!domain}
          />
          {KNOWLEDGE_DOMAINS.map((option) => (
            <FilterChip
              key={option}
              label={titleCase(option)}
              onPress={() => setDomain(option)}
              selected={domain === option}
            />
          ))}
        </View>

        <View style={styles.resultsHeading}>
          <Text style={styles.resultsLabel}>
            {shelf === "someday"
              ? "SOMEDAY"
              : shelf === "archived"
                ? "ARCHIVED"
                : "REMEMBERED"}
          </Text>
          <Text style={styles.count}>{visibleItems.length}</Text>
        </View>

        {visibleItems.length ? (
          <View style={styles.list}>
            {visibleItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/knowledge/[id]",
                    params: { id: item.id },
                  } as unknown as Href)
                }
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Ionicons
                    color={colors.muted}
                    name="chevron-forward"
                    size={18}
                  />
                </View>
                <Text numberOfLines={3} style={styles.cardContent}>
                  {item.content}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.kind}>{titleCase(item.kind)}</Text>
                  {item.domain ? (
                    <Text style={styles.domain}>{titleCase(item.domain)}</Text>
                  ) : null}
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={shelf === "someday" ? "cloud-outline" : "library-outline"}
            message={
              shelf === "someday"
                ? "Not now doesn’t mean never."
                : "Capture a thought, then choose Keep when you process it."
            }
            title={
              shelf === "someday"
                ? "Nothing is waiting for Someday."
                : "Things worth remembering will live here."
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ShelfButton({
  label,
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
      style={[styles.shelf, selected && styles.shelfSelected]}
    >
      <Text style={[styles.shelfText, selected && styles.shelfTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  label,
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
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  topBar: { minHeight: 52, justifyContent: "center" },
  back: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    minHeight: 40,
  },
  backText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.7,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  searchInput: { color: colors.ink, flex: 1, fontSize: typography.size.body },
  shelves: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: spacing.xs,
  },
  shelf: {
    alignItems: "center",
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  shelfSelected: { backgroundColor: colors.surface },
  shelfText: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  shelfTextSelected: { color: colors.accent },
  filterLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.3,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  chipTextSelected: {
    color: colors.accent,
    fontWeight: typography.weight.bold,
  },
  resultsHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  resultsLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  count: { color: colors.muted, fontSize: typography.size.caption },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  cardTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  cardContent: {
    color: colors.text,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  kind: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  domain: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    color: colors.accent,
    fontSize: 10,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  date: { color: colors.muted, fontSize: 10, marginLeft: "auto" },
  pressed: { opacity: 0.68 },
});
