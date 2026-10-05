/**
 * CronoBiblia content loader (Track E).
 *
 * Named content functions consumed through `src/lib/content-safe.ts`.
 * Every function is `() => Promise<any[]>` with try/catch inside and resolves
 * `[]` (or `null` for getContentById) on any failure — the app must never
 * crash on missing or malformed content packs.
 *
 * Packs live in `src/content/packs/*.json` and are AI-DRAFTED
 * (`status: "DRAFT-AWAITING-REVIEW"`); see `src/content/README.md`.
 *
 * Named content types (added by Track D to unblock cross-track type imports —
 * Track E should review and promote these to canonical, pack-validated
 * types). They mirror the fields Track B's renderer, timeline, search and
 * quiz code already consume.
 */

export type Category =
  | "relato"
  | "imperios"
  | "personajes"
  | "arqueologia"
  | "mundo";

export type Confidence = "alta" | "media" | "baja" | "debatida";

export interface ContentRow {
  label: string;
  value?: string;
  side?: string;
  yearMin: number;
  yearMax: number;
  [key: string]: unknown;
}

export interface ContentBlock {
  type: string;
  text?: string;
  title?: string;
  level?: number;
  tone?: string;
  reference?: string;
  src?: string;
  alt?: string;
  caption?: string;
  attribution?: string;
  license?: string;
  claim?: string;
  aporta?: string;
  noDemuestra?: string;
  place?: string;
  step?: string;
  quizId?: string;
  rows?: ContentRow[];
  [key: string]: unknown;
}

export interface ContentRouteStep {
  place: string;
  text: string;
  modern?: string;
}

export interface ContentQuestion {
  prompt: string;
  explanation: string;
}

export interface QuizOption {
  id: string;
  label: string;
  correct?: boolean;
}

export interface QuizEvent {
  id: string;
  label?: string;
}

export interface QuizPlace {
  name?: string;
  hint?: string;
}

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "identify-place" | "order-events" | string;
  prompt: string;
  explanation: string;
  source?: string;
  place?: QuizPlace;
  options?: QuizOption[];
  placeOptions?: QuizOption[];
  events?: QuizEvent[];
  [key: string]: unknown;
}

export interface ContentItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  displayDate?: string;
  yearMin?: number;
  yearMax?: number;
  era?: string;
  categories?: Category[];
  confidence?: Confidence;
  premium?: boolean;
  biblicalRefs?: string[];
  body?: ContentBlock[];
  sources?: Array<{ title?: string; detail?: string }>;
  routeSteps?: ContentRouteStep[];
  questions?: QuizQuestion[];
  related?: string[];
  [key: string]: unknown;
}

export interface Era {
  slug: string;
  title: string;
  premium?: boolean;
  order?: number;
  summary?: string;
  yearMin?: number;
  yearMax?: number;
  [key: string]: unknown;
}

const PACK_LOADERS: Record<string, () => Promise<unknown>> = {
  eras: () => import("../content/packs/eras.json"),
  "timeline-events": () => import("../content/packs/timeline-events.json"),
  maps: () => import("../content/packs/maps.json"),
  evidence: () => import("../content/packs/evidence.json"),
  books: () => import("../content/packs/books.json"),
  quizzes: () => import("../content/packs/quizzes.json"),
  "daily-facts": () => import("../content/packs/daily-facts.json"),
  stories: () => import("../content/packs/stories.json"),
  "family-lessons": () => import("../content/packs/family-lessons.json"),
};

function asArray(doc: unknown): any[] {
  if (Array.isArray(doc)) return doc;
  if (doc && typeof doc === "object") {
    const items = (doc as { items?: unknown }).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

async function loadPack(name: string): Promise<any[]> {
  try {
    const mod = (await PACK_LOADERS[name]()) as { default?: unknown } | unknown;
    const doc = (mod as { default?: unknown })?.default ?? mod;
    return asArray(doc);
  } catch {
    return [];
  }
}

export function getTimelineEvents(): Promise<any[]> {
  return loadPack("timeline-events");
}

export function getEras(): Promise<any[]> {
  return loadPack("eras");
}

export function getMaps(): Promise<any[]> {
  return loadPack("maps");
}

export function getEvidence(): Promise<any[]> {
  return loadPack("evidence");
}

export function getBooks(): Promise<any[]> {
  return loadPack("books");
}

export function getQuizzes(): Promise<any[]> {
  return loadPack("quizzes");
}

export function getDailyFacts(): Promise<any[]> {
  return loadPack("daily-facts");
}

export function getStories(): Promise<any[]> {
  return loadPack("stories");
}

export function getFamilyLessons(): Promise<any[]> {
  return loadPack("family-lessons");
}

export async function getContentById(id: string): Promise<any | null> {
  try {
    const packs = await Promise.all(Object.keys(PACK_LOADERS).map(loadPack));
    for (const items of packs) {
      for (const item of items) {
        if (item && item.id === id) return item;
        // Nested map geometry (places/routes) is addressable by its own stable ID.
        for (const p of item.places || []) {
          if (p.id === id) return { ...p, _parent: item.id, _kind: "place" };
        }
        for (const r of item.routes || []) {
          if (r.id === id) return { ...r, _parent: item.id, _kind: "route" };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
