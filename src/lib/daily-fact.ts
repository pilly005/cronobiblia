/**
 * CronoBiblia — "Un día como hoy" daily fact.
 *
 * Picks the fact for today's calendar date from the 365-item daily-facts
 * pack (item `day` is 1–365). Deterministic: the same date always yields
 * the same fact, on every device, with no network.
 */

import { fetchDailyFacts, type DailyFactModel } from "@/lib/content-model";

export interface TodayFact {
  id: string;
  title: string;
  text: string;
  day: number;
}

function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** 1-based day-of-year mapped onto 1..365 (leap days wrap). */
export function todayDayNumber(date: Date = new Date()): number {
  const doy = dayOfYear(date);
  return ((doy - 1) % 365) + 1;
}

function toTodayFact(m: DailyFactModel): TodayFact {
  return { id: m.id, title: m.title, text: m.text, day: m.day };
}

let cache: DailyFactModel[] | null = null;

/** The fact for today, from the canonical pack. Never throws. */
export async function getTodaysFact(
  date: Date = new Date(),
): Promise<TodayFact | null> {
  try {
    if (!cache) cache = await fetchDailyFacts();
    if (!cache || cache.length === 0) return null;
    const n = todayDayNumber(date);
    const hit =
      cache.find((f) => f.day === n) ?? cache[(n - 1) % cache.length];
    return hit ? toTodayFact(hit) : null;
  } catch {
    return null;
  }
}

/** Spanish long date for the card header, e.g. "5 de octubre". */
export function spanishDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "long",
    }).format(date);
  } catch {
    return "";
  }
}
