/**
 * Accent-insensitive Spanish search (Track B).
 *
 * Spanish copy must keep its accents on screen (spec §11), but search should
 * match "arqueologia" against "arqueología". We normalize with NFD and strip
 * combining diacritics before comparing — never modifying the stored text.
 */

import type { ContentBlock, ContentItem } from "@/lib/content";

/** Normalize for comparison: lowercase, NFD, strip diacritics. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function blockText(block: ContentBlock): string {
  const parts: string[] = [];
  if (block.text) parts.push(block.text);
  if (block.title) parts.push(block.title);
  if (block.reference) parts.push(block.reference);
  if (block.claim) parts.push(block.claim);
  if (block.aporta) parts.push(block.aporta);
  if (block.noDemuestra) parts.push(block.noDemuestra);
  if (block.place) parts.push(block.place);
  if (block.rows) {
    for (const row of block.rows) parts.push(row.label);
  }
  return parts.join(" ");
}

function itemHaystack(item: ContentItem): string {
  const parts: string[] = [item.title, item.summary];
  if (item.biblicalRefs) parts.push(...item.biblicalRefs);
  if (item.body) parts.push(...item.body.map(blockText));
  if (item.routeSteps) {
    for (const step of item.routeSteps) {
      parts.push(step.place, step.text, step.modern ?? "");
    }
  }
  if (item.questions) {
    for (const q of item.questions) parts.push(q.prompt, q.explanation);
  }
  return normalizeForSearch(parts.filter(Boolean).join(" "));
}

/**
 * Search content items by query. Empty query returns the list unchanged.
 * Matches title, summary, biblical references and block text.
 */
export function searchItems(items: ContentItem[], query: string): ContentItem[] {
  const q = normalizeForSearch(query.trim());
  if (!q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const haystack = itemHaystack(item);
    return tokens.every((token) => haystack.includes(token));
  });
}

/** Highlight helper for the UI: returns the raw query for accent-safe display. */
export function displayQuery(query: string): string {
  return query.trim();
}
