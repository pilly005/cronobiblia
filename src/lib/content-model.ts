/**
 * Content model adapter (Track B).
 *
 * Normalizes the canonical pack content (loaded through the named functions
 * in `src/lib/content.ts`) into the typed, camelCase models the Track B
 * screens consume. Every fetch is defensive: failures resolve to empty
 * lists / null so screens render honest empty states.
 *
 * Pack conventions (Track E): snake_case fields, `tier: "free" | "premium"`,
 * era ids "era-01"… "era-07", facets for timeline categories, quizzes as
 * individual question items (grouped here into quizzes of 5 per era),
 * stories as cards referencing content ids.
 */

import {
  getBooks,
  getContentById,
  getDailyFacts,
  getEras,
  getEvidence,
  getFamilyLessons,
  getMaps,
  getQuizzes,
  getStories,
  getTimelineEvents,
} from "./content";
import { normalizeForSearch } from "./search";

/* ---------------- Types ---------------- */

export type Category =
  | "relato"
  | "imperios"
  | "personajes"
  | "arqueologia"
  | "mundo";

export type Confidence = "alta" | "media" | "baja" | "debatida";

export interface SourceRef {
  title: string;
  detail?: string;
}

/** Structured block (mirrors spec §10 block types). */
export interface Block {
  type:
    | "paragraph"
    | "heading"
    | "callout"
    | "scripture"
    | "image"
    | "timeline_comparison"
    | "map_step"
    | "evidence_claim"
    | "quiz_checkpoint";
  text?: string;
  title?: string;
  reference?: string;
  level?: number;
  tone?: "texto" | "historia" | "interpretacion";
  src?: string;
  alt?: string;
  attribution?: string;
  license?: string;
  rows?: Array<{
    label: string;
    yearMin: number;
    yearMax: number;
    side: "biblico" | "mundial";
  }>;
  step?: number;
  place?: string;
  claim?: string;
  aporta?: string;
  noDemuestra?: string;
  quizId?: string;
}

export interface EraModel {
  id: string;
  title: string;
  summary: string;
  order: number;
  yearMin: number;
  yearMax: number;
  displayRange: string;
  premium: boolean;
}

export interface TimelineEventModel {
  kind: "timeline-event";
  id: string;
  title: string;
  summary: string;
  eraId: string;
  yearMin: number;
  yearMax: number;
  displayDate: string;
  confidence: Confidence;
  categories: Category[];
  biblicalRefs: string[];
  sources: SourceRef[];
  premium: boolean;
  blocks: Block[];
}

export type StoryCardKind = "event" | "quiz" | "evidence" | "map";

export interface StoryCardModel {
  order: number;
  kind: StoryCardKind;
  contentId: string;
  narration: string;
}

export interface StoryModel {
  kind: "story";
  id: string;
  title: string;
  summary: string;
  eraIds: string[];
  premium: boolean;
  durationMinutes: number;
  sources: SourceRef[];
  cards: StoryCardModel[];
}

export interface QuizOption {
  id: string;
  label: string;
  correct: boolean;
}

export type QuestionType = "multiple-choice" | "order-events" | "identify-place";

export interface QuizQuestionModel {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  source?: string;
  options?: QuizOption[];
  /** order-events: items in display pool; correctOrder: ids in correct order */
  items?: Array<{ id: string; label: string }>;
  correctOrder?: string[];
}

export interface QuizModel {
  kind: "quiz";
  id: string;
  title: string;
  summary: string;
  eraId: string;
  premium: boolean;
  questions: QuizQuestionModel[];
}

export interface EvidenceModel {
  kind: "evidence";
  id: string;
  title: string;
  summary: string;
  eraId: string;
  premium: boolean;
  sources: SourceRef[];
  blocks: Block[];
  relatedIds: string[];
}

export interface MapModel {
  kind: "map";
  id: string;
  title: string;
  summary: string;
  eraId: string;
  premium: boolean;
  sources: SourceRef[];
  blocks: Block[];
  textAlternative: string;
  relatedIds: string[];
}

export interface FamilyLessonModel {
  kind: "family-lesson";
  id: string;
  title: string;
  summary: string;
  eraId: string;
  premium: boolean;
  sources: SourceRef[];
  blocks: Block[];
  relatedIds: string[];
}

export interface DailyFactModel {
  kind: "daily-fact";
  id: string;
  title: string;
  text: string;
  day: number;
  premium: boolean;
  relatedId?: string;
}

export interface BookModel {
  kind: "book";
  id: string;
  title: string;
  summary: string;
  premium: boolean;
}

export type NormalizedItem =
  | TimelineEventModel
  | StoryModel
  | QuizModel
  | EvidenceModel
  | MapModel
  | FamilyLessonModel
  | DailyFactModel
  | BookModel;

/* ---------------- Raw helpers ---------------- */

type Raw = Record<string, any>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function arr(v: unknown): Raw[] {
  return Array.isArray(v) ? (v as Raw[]) : [];
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function isPremiumRaw(item: Raw): boolean {
  return item?.tier === "premium";
}

function toSources(v: unknown): SourceRef[] {
  return strArr(v).map((s) => ({ title: s }));
}

const FACET_MAP: Record<string, Category> = {
  "narrativa-biblica": "relato",
  imperio: "imperios",
  persona: "personajes",
  arqueologia: "arqueologia",
  mundo: "mundo",
};

function toCategories(facets: unknown): Category[] {
  const out: Category[] = [];
  for (const f of strArr(facets)) {
    const c = FACET_MAP[f];
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

const CONFIDENCE_MAP: Record<string, Confidence> = {
  high: "alta",
  medium: "media",
  low: "baja",
  disputed: "debatida",
};

function toConfidence(v: unknown): Confidence {
  return CONFIDENCE_MAP[str(v)] ?? "media";
}

function displayRange(yearMin: number, yearMax: number, label?: string): string {
  if (label) return label;
  const f = (y: number) => (y < 0 ? `${Math.abs(y)} a. C.` : `${y} d. C.`);
  return yearMin === yearMax ? f(yearMin) : `${f(yearMin)} – ${f(yearMax)}`;
}

/* ---------------- Block builders ---------------- */

function eventBlocks(e: Raw): Block[] {
  const blocks: Block[] = [];
  if (str(e.summary)) blocks.push({ type: "paragraph", text: str(e.summary) });
  const quote = e.quote as Raw | undefined;
  if (quote && (str(quote.text) || str(quote.ref))) {
    blocks.push({
      type: "scripture",
      text: str(quote.text) || undefined,
      reference: str(quote.ref) || undefined,
    });
  }
  const layers = e.layers as Raw | undefined;
  if (layers) {
    const tones: Array<[string, "texto" | "historia" | "interpretacion"]> = [
      ["texto", "texto"],
      ["historia", "historia"],
      ["interpretacion", "interpretacion"],
    ];
    for (const [key, tone] of tones) {
      if (str(layers[key])) {
        blocks.push({ type: "callout", tone, text: str(layers[key]) });
      }
    }
  }
  if (str(e.world_context)) {
    blocks.push({ type: "paragraph", text: `Contexto mundial: ${str(e.world_context)}` });
  }
  return blocks;
}

function evidenceBlocks(e: Raw): Block[] {
  const blocks: Block[] = [];
  if (str(e.summary)) blocks.push({ type: "paragraph", text: str(e.summary) });
  const ficha: string[] = [];
  if (str(e.discovery)) ficha.push(`Descubrimiento: ${str(e.discovery)}`);
  if (str(e.dating)) ficha.push(`Datación: ${str(e.dating)}`);
  if (str(e.present_location))
    ficha.push(`Ubicación actual: ${str(e.present_location)}`);
  if (ficha.length > 0) {
    blocks.push({ type: "heading", level: 3, text: "Ficha" });
    for (const line of ficha) blocks.push({ type: "paragraph", text: line });
  }
  if (str(e.contributes) || str(e.does_not_prove)) {
    blocks.push({
      type: "evidence_claim",
      claim: str(e.title) || "Evidencia",
      aporta: str(e.contributes) || undefined,
      noDemuestra: str(e.does_not_prove) || undefined,
    });
  }
  return blocks;
}

const ROUTE_CERTAINTY_LABEL: Record<string, string> = {
  documented: "documentada",
  reconstructed: "reconstruida",
  debated: "en debate",
};

function mapBlocks(m: Raw, placesById: Map<string, Raw>): Block[] {
  const blocks: Block[] = [];
  if (str(m.summary)) blocks.push({ type: "paragraph", text: str(m.summary) });
  for (const route of arr(m.routes)) {
    const certainty = ROUTE_CERTAINTY_LABEL[str(route.certainty)] ?? str(route.certainty);
    blocks.push({
      type: "heading",
      level: 3,
      text: `${str(route.name)}${certainty ? ` (ruta ${certainty})` : ""}`,
    });
    const steps = arr(route.steps).sort(
      (a, b) => num(a.order) - num(b.order),
    );
    for (const step of steps) {
      const place = placesById.get(str(step.place_id));
      blocks.push({
        type: "map_step",
        step: num(step.order),
        place: place ? str(place.ancient_name) : undefined,
        text: str(step.text),
      });
    }
  }
  if (str(m.text_alternative)) {
    blocks.push({
      type: "callout",
      tone: "historia",
      text: `Alternativa en texto: ${str(m.text_alternative)}`,
    });
  }
  return blocks;
}

function familyBlocks(f: Raw): Block[] {
  const blocks: Block[] = [];
  for (const p of strArr(f.paragraphs)) {
    blocks.push({ type: "paragraph", text: p });
  }
  if (str(f.read_together)) {
    blocks.push({
      type: "callout",
      tone: "texto",
      text: `Para leer juntos: ${str(f.read_together)}`,
    });
  }
  return blocks;
}

/* ---------------- Normalizers ---------------- */

function normalizeEra(e: Raw, index: number): EraModel {
  const yearMin = num(e.year_min, -2100);
  const yearMax = num(e.year_max, 150);
  return {
    id: str(e.id) || `era-${index + 1}`,
    title: str(e.title) || `Época ${index + 1}`,
    summary: str(e.summary),
    order: num(e.order, index + 1),
    yearMin,
    yearMax,
    displayRange: displayRange(yearMin, yearMax, str(e.date_label) || undefined),
    premium: isPremiumRaw(e),
  };
}

function normalizeEvent(e: Raw): TimelineEventModel {
  const yearMin = num(e.year_min);
  const yearMax = num(e.year_max, yearMin);
  return {
    kind: "timeline-event",
    id: str(e.id),
    title: str(e.title),
    summary: str(e.summary),
    eraId: str(e.era),
    yearMin,
    yearMax,
    displayDate: str(e.date_label) || displayRange(yearMin, yearMax),
    confidence: toConfidence(e.confidence),
    categories: toCategories(e.facets),
    biblicalRefs: strArr(e.scripture_refs),
    sources: toSources(e.sources),
    premium: isPremiumRaw(e),
    blocks: eventBlocks(e),
  };
}

function normalizeStory(s: Raw): StoryModel {
  const cards: StoryCardModel[] = arr(s.cards)
    .map((c) => ({
      order: num(c.order),
      kind: (["event", "quiz", "evidence", "map"].includes(str(c.kind))
        ? str(c.kind)
        : "event") as StoryCardKind,
      contentId: str(c.content_id),
      narration: str(c.narration),
    }))
    .sort((a, b) => a.order - b.order);
  return {
    kind: "story",
    id: str(s.id),
    title: str(s.title),
    summary: str(s.summary),
    eraIds: strArr(s.eras),
    premium: isPremiumRaw(s),
    durationMinutes: num(s.duration_minutes, 5),
    sources: toSources(s.sources),
    cards,
  };
}

function normalizeQuestion(q: Raw): QuizQuestionModel | null {
  const type = str(q.quiz_type) as QuestionType;
  if (!["multiple-choice", "order-events", "identify-place"].includes(type)) {
    return null;
  }
  const base = {
    id: str(q.id),
    type,
    prompt: str(q.prompt),
    explanation: str(q.explanation),
    source: strArr(q.sources)[0],
  };
  if (type === "order-events") {
    const items = arr(q.items).map((it) => ({
      id: str(it.event_id) || str(it.id),
      label: str(it.label),
    }));
    const correctOrder = strArr(q.correct_order);
    return { ...base, items, correctOrder };
  }
  const options: QuizOption[] = arr(q.options).map((o) => ({
    id: str(o.id),
    label: str(o.text) || str(o.label),
    correct: str(o.id) === str(q.correct_option_id),
  }));
  return { ...base, options };
}

const QUIZ_CHUNK = 5;

/** Chunk questions, merging a tiny trailing chunk (< 3) into the previous. */
function chunkBalanced<T>(items: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += QUIZ_CHUNK) {
    chunks.push(items.slice(i, i + QUIZ_CHUNK));
  }
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1]!;
    if (last.length < 3) {
      const prev = chunks[chunks.length - 2]!;
      chunks[chunks.length - 2] = [...prev, ...last];
      chunks.pop();
    }
  }
  return chunks;
}

/**
 * Groups question items into quizzes of 5, preserving pack order.
 * Free-tier questions are partitioned into their own quizzes so the free
 * tier keeps exactly the questions the catalog marks free (spec §3: 25).
 */
export function synthesizeQuizzes(
  questions: QuizQuestionModel[],
  rawById: Map<string, Raw>,
  eraTitle: (eraId: string) => string,
): QuizModel[] {
  const byEra = new Map<string, QuizQuestionModel[]>();
  for (const q of questions) {
    const eraId = str(rawById.get(q.id)?.era);
    if (!byEra.has(eraId)) byEra.set(eraId, []);
    byEra.get(eraId)!.push(q);
  }
  const quizzes: QuizModel[] = [];
  const pushChunk = (
    eraId: string,
    chunk: QuizQuestionModel[],
    n: number,
    premium: boolean,
    totalChunks: number,
  ) => {
    quizzes.push({
      kind: "quiz",
      id: `quiz-${eraId || "general"}-${premium ? "premium" : "free"}-${n}`,
      title:
        totalChunks === 1
          ? `Cuestionario: ${eraTitle(eraId)}`
          : `Cuestionario ${n}: ${eraTitle(eraId)}`,
      summary: `${chunk.length} preguntas con explicación inmediata.`,
      eraId,
      premium,
      questions: chunk,
    });
  };
  for (const [eraId, qs] of byEra) {
    const freeQs = qs.filter((q) => !isPremiumRaw(rawById.get(q.id) ?? {}));
    const premiumQs = qs.filter((q) => isPremiumRaw(rawById.get(q.id) ?? {}));
    const freeChunks = chunkBalanced(freeQs);
    const premiumChunks = chunkBalanced(premiumQs);
    freeChunks.forEach((chunk, i) =>
      pushChunk(eraId, chunk, i + 1, false, freeChunks.length),
    );
    premiumChunks.forEach((chunk, i) =>
      pushChunk(eraId, chunk, i + 1, true, premiumChunks.length),
    );
  }
  return quizzes;
}

function normalizeEvidence(e: Raw): EvidenceModel {
  return {
    kind: "evidence",
    id: str(e.id),
    title: str(e.title),
    summary: str(e.summary),
    eraId: str(e.era),
    premium: isPremiumRaw(e),
    sources: toSources(e.sources),
    blocks: evidenceBlocks(e),
    relatedIds: strArr(e.related_ids),
  };
}

function normalizeMap(m: Raw): MapModel {
  const placesById = new Map<string, Raw>();
  for (const p of arr(m.places)) placesById.set(str(p.id), p);
  return {
    kind: "map",
    id: str(m.id),
    title: str(m.title),
    summary: str(m.summary),
    eraId: str(m.era),
    premium: isPremiumRaw(m),
    sources: toSources(m.sources),
    blocks: mapBlocks(m, placesById),
    textAlternative: str(m.text_alternative),
    relatedIds: [],
  };
}

function normalizeFamilyLesson(f: Raw): FamilyLessonModel {
  return {
    kind: "family-lesson",
    id: str(f.id),
    title: str(f.title),
    summary: str(f.summary),
    eraId: str(f.era),
    premium: isPremiumRaw(f),
    sources: toSources(f.sources),
    blocks: familyBlocks(f),
    relatedIds: strArr(f.related_ids),
  };
}

function normalizeFact(f: Raw): DailyFactModel {
  return {
    kind: "daily-fact",
    id: str(f.id),
    title: str(f.title) || "¿Sabías que…?",
    text: str(f.text),
    day: num(f.day, 1),
    premium: isPremiumRaw(f),
    relatedId: str(f.related_id) || undefined,
  };
}

function normalizeBook(b: Raw): BookModel {
  return {
    kind: "book",
    id: str(b.id),
    title: str(b.title),
    summary: str(b.summary),
    premium: isPremiumRaw(b),
  };
}

/* ---------------- Public fetch API ---------------- */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function fetchEras(): Promise<EraModel[]> {
  return safe(async () => {
    const raw = (await getEras()) as Raw[];
    return raw.map(normalizeEra).sort((a, b) => a.order - b.order);
  }, []);
}

export async function fetchTimelineEvents(): Promise<TimelineEventModel[]> {
  return safe(async () => {
    const raw = (await getTimelineEvents()) as Raw[];
    return raw.map(normalizeEvent).filter((e) => e.id && e.title);
  }, []);
}

export async function fetchStories(): Promise<StoryModel[]> {
  return safe(async () => {
    const raw = (await getStories()) as Raw[];
    return raw.map(normalizeStory).filter((s) => s.id && s.title);
  }, []);
}

export async function fetchEvidence(): Promise<EvidenceModel[]> {
  return safe(async () => {
    const raw = (await getEvidence()) as Raw[];
    return raw.map(normalizeEvidence).filter((e) => e.id && e.title);
  }, []);
}

export async function fetchMaps(): Promise<MapModel[]> {
  return safe(async () => {
    const raw = (await getMaps()) as Raw[];
    return raw.map(normalizeMap).filter((m) => m.id && m.title);
  }, []);
}

export async function fetchFamilyLessons(): Promise<FamilyLessonModel[]> {
  return safe(async () => {
    const raw = (await getFamilyLessons()) as Raw[];
    return raw.map(normalizeFamilyLesson).filter((f) => f.id && f.title);
  }, []);
}

export async function fetchDailyFacts(): Promise<DailyFactModel[]> {
  return safe(async () => {
    const raw = (await getDailyFacts()) as Raw[];
    return raw.map(normalizeFact).filter((f) => f.id && f.text);
  }, []);
}

export async function fetchBooks(): Promise<BookModel[]> {
  return safe(async () => {
    const raw = (await getBooks()) as Raw[];
    return raw.map(normalizeBook).filter((b) => b.id && b.title);
  }, []);
}

let quizCache: { quizzes: QuizModel[]; byQuestionId: Map<string, string> } | null =
  null;

export async function fetchQuizzes(): Promise<QuizModel[]> {
  if (quizCache) return quizCache.quizzes;
  const result = await safe(async () => {
    const raw = (await getQuizzes()) as Raw[];
    const rawById = new Map<string, Raw>();
    const questions: QuizQuestionModel[] = [];
    for (const q of raw) {
      const nq = normalizeQuestion(q);
      if (nq && nq.id) {
        rawById.set(nq.id, q);
        questions.push(nq);
      }
    }
    const eras = await fetchEras();
    const eraTitle = (eraId: string) =>
      eras.find((e) => e.id === eraId)?.title ?? "Historia bíblica";
    const quizzes = synthesizeQuizzes(questions, rawById, eraTitle);
    const byQuestionId = new Map<string, string>();
    for (const quiz of quizzes) {
      for (const q of quiz.questions) byQuestionId.set(q.id, quiz.id);
    }
    return { quizzes, byQuestionId };
  }, { quizzes: [], byQuestionId: new Map<string, string>() });
  quizCache = result;
  return result.quizzes;
}

/** Synthesized quiz id that contains a given question id (for story quiz cards). */
export async function findQuizForQuestion(questionId: string): Promise<string | null> {
  await fetchQuizzes();
  return quizCache?.byQuestionId.get(questionId) ?? null;
}

export async function fetchQuizById(id: string): Promise<QuizModel | null> {
  const quizzes = await fetchQuizzes();
  return quizzes.find((q) => q.id === id) ?? null;
}

/** Normalize any top-level content id (events, stories, evidence, maps, …). */
export async function fetchContentById(id: string): Promise<NormalizedItem | null> {
  return safe(async () => {
    const raw = (await getContentById(id)) as Raw | null;
    if (!raw || !raw.id) return null;
    const type = str(raw.type);
    switch (type) {
      case "timeline-event":
        return normalizeEvent(raw);
      case "story":
        return normalizeStory(raw);
      case "evidence":
        return normalizeEvidence(raw);
      case "map":
        return normalizeMap(raw);
      case "family-lesson":
        return normalizeFamilyLesson(raw);
      case "daily-fact":
        return normalizeFact(raw);
      case "book":
        return normalizeBook(raw);
      case "quiz":
        // A question id — resolve to its synthesized quiz.
        return fetchQuizById((await findQuizForQuestion(id)) ?? "");
      default:
        return null;
    }
  }, null);
}

/* ---------------- Search ---------------- */

export interface SearchHit {
  id: string;
  kind: string;
  title: string;
  summary: string;
  eraId: string;
  premium: boolean;
}

function hitText(hit: SearchHit): string {
  return normalizeForSearch(`${hit.title} ${hit.summary}`);
}

/**
 * Accent-insensitive search across events, stories, evidence, maps and
 * family lessons. Spanish copy keeps its accents on screen; matching
 * ignores them (spec §11).
 */
export async function searchContent(query: string): Promise<SearchHit[]> {
  const q = normalizeForSearch(query.trim());
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const [events, stories, evidence, maps, lessons] = await Promise.all([
    fetchTimelineEvents(),
    fetchStories(),
    fetchEvidence(),
    fetchMaps(),
    fetchFamilyLessons(),
  ]);
  const hits: SearchHit[] = [
    ...events.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      eraId: e.eraId,
      premium: e.premium,
    })),
    ...stories.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      summary: s.summary,
      eraId: s.eraIds[0] ?? "",
      premium: s.premium,
    })),
    ...evidence.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      eraId: e.eraId,
      premium: e.premium,
    })),
    ...maps.map((m) => ({
      id: m.id,
      kind: m.kind,
      title: m.title,
      summary: m.summary,
      eraId: m.eraId,
      premium: m.premium,
    })),
    ...lessons.map((l) => ({
      id: l.id,
      kind: l.kind,
      title: l.title,
      summary: l.summary,
      eraId: l.eraId,
      premium: l.premium,
    })),
  ];
  return hits.filter((hit) => {
    const text = hitText(hit);
    return tokens.every((t) => text.includes(t));
  });
}
