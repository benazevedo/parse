import type { KnowledgeItem } from "../types/capture";

export function searchKnowledgeItems(
  items: KnowledgeItem[],
  query: string,
): KnowledgeItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return items;
  return items.filter(
    (item) =>
      item.title.toLocaleLowerCase().includes(normalized) ||
      item.content.toLocaleLowerCase().includes(normalized),
  );
}
