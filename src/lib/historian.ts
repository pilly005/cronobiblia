/**
 * Ask a Historian — client for the `historian-chat` Supabase Edge Function
 * (Track D).
 *
 * Spec §7:
 *   - Free users get 3 lifetime sample questions; premium users get 20 per
 *     rolling day. The server enforces the real limits — the client only
 *     implements the UX routing (after 3 lifetime questions, free users are
 *     routed to /paywall with a Spanish explanation).
 *   - The insufficient-evidence answer
 *     ("No encuentro suficiente respaldo en la biblioteca revisada para
 *     responder con confianza.") renders distinctly from errors.
 *   - Question text is never written to logs (spec §11 data minimization).
 *   - Apple IAP / RevenueCat is the only purchase path — never Stripe.
 */

import { isPremiumActive } from "./purchases";
import { isSupabaseConfigured, supabase } from "./supabase";

/** Sentinel returned by the server when the corpus cannot support an answer. */
export const INSUFFICIENT_EVIDENCE =
  "No encuentro suficiente respaldo en la biblioteca revisada para responder con confianza.";

/** Client-side UX limit for free users (server enforces the real limit). */
export const FREE_LIFETIME_LIMIT = 3;

const FREE_COUNT_KEY = "cronobiblia:historian-free-count:v1";
const MAX_QUESTION_LENGTH = 500;

export interface HistorianCitation {
  id: string;
  title: string;
}

export interface HistorianSuggestedLesson {
  id: string;
  title: string;
}

export interface HistorianResponse {
  answer: string;
  confidence: string;
  citations: HistorianCitation[];
  suggestedLesson: HistorianSuggestedLesson | null;
  /** True when the server answered with the insufficient-evidence response. */
  insufficientEvidence: boolean;
}

/** Thrown when a usage limit is hit — the UI routes the user to /paywall. */
export class HistorianLimitError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Has usado tus 3 preguntas gratuitas de muestra. Con Premium tienes 20 preguntas al día y acceso completo al Historiador.",
    );
    this.name = "HistorianLimitError";
  }
}

/** Thrown for network / server failures (Spanish messages for the UI). */
export class HistorianError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistorianError";
  }
}

export function isHistorianLimitError(error: unknown): boolean {
  return error instanceof HistorianLimitError;
}

// ---------------------------------------------------------------------------
// Free-question counter (local, client-side UX only)
// ---------------------------------------------------------------------------

export function getHistorianQuestionsUsed(): number {
  try {
    const raw = localStorage.getItem(FREE_COUNT_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function getHistorianQuestionsRemaining(): number {
  return Math.max(0, FREE_LIFETIME_LIMIT - getHistorianQuestionsUsed());
}

function incrementFreeCount(): void {
  try {
    localStorage.setItem(
      FREE_COUNT_KEY,
      String(getHistorianQuestionsUsed() + 1),
    );
  } catch {
    /* storage unavailable — server still enforces the real limit */
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

interface HistorianServerPayload {
  answer?: unknown;
  confidence?: unknown;
  citations?: unknown;
  suggestedLesson?: unknown;
  insufficientEvidence?: unknown;
}

function normalizeCitations(value: unknown): HistorianCitation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (c): c is { id: unknown; title: unknown } =>
        !!c && typeof c === "object",
    )
    .map((c) => ({
      id: String(c.id ?? ""),
      title: String(c.title ?? ""),
    }))
    .filter((c) => c.id.length > 0);
}

function normalizeSuggestedLesson(
  value: unknown,
): HistorianSuggestedLesson | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { id?: unknown; title?: unknown };
  if (!v.id) return null;
  return { id: String(v.id), title: String(v.title ?? "") };
}

/**
 * Asks the Historian a historical-context question.
 *
 * Sends the question to `${VITE_SUPABASE_URL}/functions/v1/historian-chat`
 * with the Supabase anon key and, when signed in, the user's access token.
 * Free (non-premium) users are stopped after 3 lifetime questions with a
 * `HistorianLimitError` so the UI can route them to /paywall.
 */
export async function askHistorian(
  question: string,
): Promise<HistorianResponse> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new HistorianError(
      "Escribe tu pregunta para que el Historiador pueda ayudarte.",
    );
  }
  if (!isSupabaseConfigured) {
    throw new HistorianError(
      "El Historiador no está disponible en este momento. Inténtalo más tarde.",
    );
  }

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

  // Client-side UX limit. The premium check may fail (offline, key missing);
  // in that case we don't block — the server enforces the real limit.
  let premium = false;
  let premiumUnknown = false;
  try {
    premium = await isPremiumActive();
  } catch {
    premiumUnknown = true;
  }
  if (!premium && !premiumUnknown && getHistorianQuestionsUsed() >= FREE_LIFETIME_LIMIT) {
    throw new HistorianLimitError();
  }

  let accessToken: string | null = null;
  try {
    const { data } = await supabase!.auth.getSession();
    accessToken = data.session?.access_token ?? null;
  } catch {
    accessToken = null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/historian-chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question: trimmed.slice(0, MAX_QUESTION_LENGTH) }),
    });
  } catch {
    throw new HistorianError(
      "No hay conexión. Revisa tu internet e inténtalo de nuevo.",
    );
  }

  if (res.status === 402 || res.status === 403 || res.status === 429) {
    throw new HistorianLimitError(
      "Llegaste al límite de preguntas. Con Premium tienes 20 preguntas al día.",
    );
  }
  if (res.status === 401) {
    throw new HistorianError(
      "Tu sesión caducó. Inicia sesión de nuevo para continuar.",
    );
  }
  if (!res.ok) {
    throw new HistorianError(
      "El Historiador no pudo responder. Inténtalo de nuevo en un momento.",
    );
  }

  let payload: HistorianServerPayload;
  try {
    payload = (await res.json()) as HistorianServerPayload;
  } catch {
    throw new HistorianError(
      "La respuesta del Historiador no llegó completa. Inténtalo de nuevo.",
    );
  }

  const answer =
    typeof payload.answer === "string" ? payload.answer.trim() : "";
  if (!answer) {
    throw new HistorianError(
      "El Historiador no pudo responder. Inténtalo de nuevo en un momento.",
    );
  }

  const insufficientEvidence =
    payload.insufficientEvidence === true ||
    answer.startsWith(INSUFFICIENT_EVIDENCE);

  if (!premium && !premiumUnknown) {
    incrementFreeCount();
  }

  return {
    answer,
    confidence:
      typeof payload.confidence === "string" ? payload.confidence : "media",
    citations: normalizeCitations(payload.citations),
    suggestedLesson: normalizeSuggestedLesson(payload.suggestedLesson),
    insufficientEvidence,
  };
}
