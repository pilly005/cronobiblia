/**
 * Defensive content API adapter (Track A).
 *
 * Track B owns `src/lib/content.ts` with the named content functions below.
 * That module may not exist yet when this build runs, so we resolve it
 * through `import.meta.glob` (a static, bundler-supported lookup that yields
 * an empty record when the file is absent) and degrade to null-safe stubs.
 *
 * When the real module lands and the app is rebuilt, the glob picks it up
 * automatically — no code changes needed here.
 */

export interface ContentApi {
  getTimelineEvents: () => Promise<any[]>;
  getEras: () => Promise<any[]>;
  getMaps: () => Promise<any[]>;
  getEvidence: () => Promise<any[]>;
  getBooks: () => Promise<any[]>;
  getQuizzes: () => Promise<any[]>;
  getDailyFacts: () => Promise<any[]>;
  getStories: () => Promise<any[]>;
  getFamilyLessons: () => Promise<any[]>;
  getContentById: (id: string) => Promise<any | null>;
}

const LIST_FUNCTIONS = [
  "getTimelineEvents",
  "getEras",
  "getMaps",
  "getEvidence",
  "getBooks",
  "getQuizzes",
  "getDailyFacts",
  "getStories",
  "getFamilyLessons",
] as const;

// Static lookup: empty record at build time when Track B hasn't landed yet.
const contentModules = import.meta.glob("/src/lib/content.ts");

let cached: ContentApi | null | undefined;

function stubApi(): ContentApi {
  const api = {} as ContentApi;
  const apiRecord = api as unknown as Record<string, unknown>;
  for (const name of LIST_FUNCTIONS) {
    apiRecord[name] = async () => [];
  }
  api.getContentById = async () => null;
  return api;
}

/** Resolves the Track B content module, or null when it isn't bundled yet. */
export async function getContentApi(): Promise<ContentApi | null> {
  if (cached !== undefined) return cached;
  const key = Object.keys(contentModules)[0];
  if (!key) {
    cached = null;
    return cached;
  }
  try {
    const mod = (await contentModules[key]()) as Record<string, unknown>;
    const api = stubApi();
    const apiRecord = api as unknown as Record<string, unknown>;
    for (const name of LIST_FUNCTIONS) {
      if (typeof mod[name] === "function") {
        apiRecord[name] = mod[name];
      }
    }
    if (typeof mod.getContentById === "function") {
      api.getContentById = mod.getContentById as ContentApi["getContentById"];
    }
    cached = api;
  } catch {
    cached = null;
  }
  return cached;
}

/** Runs a content fetch defensively: empty array on any failure. */
export async function safeList(
  api: ContentApi | null,
  fn: keyof Omit<ContentApi, "getContentById">,
): Promise<any[]> {
  if (!api) return [];
  try {
    const items = await api[fn]();
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/** Runs getContentById defensively: null on any failure. */
export async function safeGetById(
  api: ContentApi | null,
  id: string,
): Promise<any | null> {
  if (!api) return null;
  try {
    return (await api.getContentById(id)) ?? null;
  } catch {
    return null;
  }
}
