/**
 * Bookmarks, quiz attempts and review queue (Track B).
 *
 * Guest-first: localStorage is always written. When the user is signed in,
 * we mirror to Supabase (`bookmarks`, `quiz_attempts`) and treat the local
 * copy as the offline cache. Every Supabase call is guarded — a missing
 * table or network failure never breaks the UI.
 */

import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

const BOOKMARKS_KEY = "cronobiblia:bookmarks:v1";
const ATTEMPTS_KEY = "cronobiblia:quiz-attempts:v1";
const REVIEW_KEY = "cronobiblia:review-queue:v1";

function readLocal(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* storage unavailable — stay in memory only */
  }
}

export interface QuizAttempt {
  quizId: string;
  era?: string;
  score: number;
  total: number;
  wrong: Array<{ index: number; prompt: string }>;
  date: string;
}

function readAttemptsLocal(): QuizAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as QuizAttempt[]) : [];
  } catch {
    return [];
  }
}

function writeAttemptsLocal(attempts: QuizAttempt[]): void {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    /* ignore */
  }
}

export interface ReviewItem {
  quizId: string;
  prompt: string;
  date: string;
}

function readReviewLocal(): ReviewItem[] {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ReviewItem[]) : [];
  } catch {
    return [];
  }
}

function writeReviewLocal(items: ReviewItem[]): void {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/* ---------------- Bookmarks ---------------- */

/** Current bookmark ids (local cache; synced from server when signed in). */
export function getBookmarkIdsLocal(): string[] {
  return readLocal(BOOKMARKS_KEY);
}

export function isBookmarkedLocal(itemId: string): boolean {
  return readLocal(BOOKMARKS_KEY).includes(itemId);
}

async function syncBookmarksFromServer(user: User): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("item_id")
      .eq("user_id", user.id);
    if (error || !data) return;
    const serverIds = data
      .map((row) => (row as { item_id?: unknown }).item_id)
      .filter((id): id is string => typeof id === "string");
    const merged = Array.from(new Set([...readLocal(BOOKMARKS_KEY), ...serverIds]));
    writeLocal(BOOKMARKS_KEY, merged);
  } catch {
    /* server unavailable — local cache stays authoritative */
  }
}

async function mirrorBookmarkToServer(
  user: User,
  itemId: string,
  bookmarked: boolean,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .upsert(
          { user_id: user.id, item_id: itemId },
          { onConflict: "user_id,item_id" },
        );
    } else {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", itemId);
    }
  } catch {
    /* offline or table missing — local copy already updated */
  }
}

/**
 * Toggle a bookmark. Always updates localStorage first; mirrors to Supabase
 * when signed in. Returns the new bookmarked state.
 */
export async function toggleBookmark(
  user: User | null,
  itemId: string,
): Promise<boolean> {
  const current = readLocal(BOOKMARKS_KEY);
  const bookmarked = !current.includes(itemId);
  writeLocal(
    BOOKMARKS_KEY,
    bookmarked ? [...current, itemId] : current.filter((id) => id !== itemId),
  );
  if (user) {
    await mirrorBookmarkToServer(user, itemId, bookmarked);
  }
  return bookmarked;
}

/** Best-effort: pull the server bookmark list into the local cache. */
export async function refreshBookmarks(user: User | null): Promise<string[]> {
  if (user) await syncBookmarksFromServer(user);
  return readLocal(BOOKMARKS_KEY);
}

/* ---------------- Quiz attempts & era mastery ---------------- */

export function getAttemptsLocal(): QuizAttempt[] {
  return readAttemptsLocal();
}

export function getBestScore(quizId: string): QuizAttempt | null {
  const attempts = readAttemptsLocal().filter((a) => a.quizId === quizId);
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) => (a.score > best.score ? a : best));
}

/**
 * Persist a quiz attempt. Local copy is authoritative; mirrors to Supabase
 * `quiz_attempts` when signed in (best-effort). Returns the attempt.
 */
export async function saveQuizAttempt(
  user: User | null,
  attempt: Omit<QuizAttempt, "date">,
): Promise<QuizAttempt> {
  const full: QuizAttempt = {
    ...attempt,
    date: new Date().toISOString(),
  };
  const attempts = readAttemptsLocal();
  attempts.push(full);
  writeAttemptsLocal(attempts.slice(-200));

  if (user && isSupabaseConfigured && supabase) {
    try {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        quiz_id: full.quizId,
        score: full.score,
        total: full.total,
        created_at: full.date,
      });
    } catch {
      /* offline or table missing */
    }
  }
  return full;
}

const PASS_THRESHOLD = 0.7;

/**
 * Era mastery: fraction of quizzes in the era with a passing attempt
 * (≥ 70%). Returns 0–1. Driven by the local attempt log (which mirrors
 * the server for signed-in users).
 */
export function eraMastery(eraSlug: string, quizIds: string[]): number {
  if (quizIds.length === 0) return 0;
  const attempts = readAttemptsLocal();
  let passed = 0;
  for (const quizId of quizIds) {
    const best = attempts
      .filter((a) => a.quizId === quizId)
      .reduce((max, a) => Math.max(max, a.score / Math.max(1, a.total)), 0);
    if (best >= PASS_THRESHOLD) passed += 1;
  }
  return passed / quizIds.length;
}

/* ---------------- Review queue ---------------- */

/** Items the user answered wrong — the "repaso" queue (spec §3). */
export function getReviewQueue(): ReviewItem[] {
  return readReviewLocal();
}

export function addToReviewQueue(items: ReviewItem[]): void {
  if (items.length === 0) return;
  const current = readReviewLocal();
  const seen = new Set(current.map((i) => `${i.quizId}:${i.prompt}`));
  const merged = [...current];
  for (const item of items) {
    const key = `${item.quizId}:${item.prompt}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  writeReviewLocal(merged.slice(-100));
}

export function removeFromReviewQueue(quizId: string, prompt: string): void {
  writeReviewLocal(
    readReviewLocal().filter(
      (i) => !(i.quizId === quizId && i.prompt === prompt),
    ),
  );
}

export function clearReviewQueue(): void {
  writeReviewLocal([]);
}
