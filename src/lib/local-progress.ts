/**
 * Local (on-device) progress state for CronoBiblia (Track A).
 *
 * Guest-first: streaks, interests and completed items live in localStorage
 * until the user signs in (Track B will sync to Supabase `progress`).
 * No punitive messaging — a broken streak simply restarts at zero with an
 * encouraging line.
 */

const STORAGE_KEY = "cronobiblia:progress:v1";

export interface LocalProgress {
  onboardingDone: boolean;
  interests: string[];
  familyMode: boolean;
  currentStoryId: string | null;
  currentStoryTitle: string | null;
  completedStories: string[];
  completedQuizzes: string[];
  completedMaps: string[];
  /** ISO date strings (YYYY-MM-DD) the app was opened. */
  activeDays: string[];
  textScale: "normal" | "large" | "xlarge";
  reduceMotion: boolean;
}

const DEFAULTS: LocalProgress = {
  onboardingDone: false,
  interests: [],
  familyMode: false,
  currentStoryId: null,
  currentStoryTitle: null,
  completedStories: [],
  completedQuizzes: [],
  completedMaps: [],
  activeDays: [],
  textScale: "normal",
  reduceMotion: false,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LocalProgress>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveProgress(p: LocalProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — stay in memory only */
  }
}

/** Record today's visit; returns the updated progress. */
export function recordVisit(): LocalProgress {
  const p = loadProgress();
  const t = todayKey();
  if (!p.activeDays.includes(t)) {
    p.activeDays = [...p.activeDays.slice(-89), t];
    saveProgress(p);
  }
  return p;
}

/** Consecutive-day streak ending today (or yesterday if today hasn't been
 *  recorded yet — never shames the user for a gap). */
export function currentStreak(p: LocalProgress): number {
  const days = new Set(p.activeDays);
  let streak = 0;
  const d = new Date();
  // Allow "today not yet counted" to keep counting from yesterday.
  if (!days.has(d.toISOString().slice(0, 10))) {
    d.setDate(d.getDate() - 1);
  }
  while (days.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function totalCompleted(p: LocalProgress): number {
  return (
    p.completedStories.length +
    p.completedQuizzes.length +
    p.completedMaps.length
  );
}

/** Interest options shown in onboarding (spec §4). */
export const INTEREST_OPTIONS = [
  { id: "jesus", label: "Jesús", description: "Su mundo, su ministerio, su época" },
  { id: "antiguo-testamento", label: "Antiguo Testamento", description: "Patriarcas, reyes y profetas" },
  { id: "pablo", label: "Pablo", description: "Sus viajes y la iglesia primitiva" },
  { id: "arqueologia", label: "Arqueología", description: "Artefactos, inscripciones y sitios" },
  { id: "historia-mundial", label: "Historia mundial", description: "Imperios y culturas alrededor" },
] as const;
