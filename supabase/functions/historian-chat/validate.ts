// CronoBiblia — historian-chat validation helpers (PURE, no I/O).
// Safe to unit-test without any API key or network.

/** Exact insufficient-evidence sentence required by spec §7. */
export const INSUFFICIENT_EVIDENCE =
  "No encuentro suficiente respaldo en la biblioteca revisada para responder con confianza.";

export const VALID_CONFIDENCES = ["alta", "media", "baja", "disputada"] as const;
export type ConfidenceLabel = (typeof VALID_CONFIDENCES)[number];

export interface HistorianOutput {
  answer: string;
  confidence: string;
  citations: string[];
  suggested_lesson: string | null;
}

export interface CitationCheck {
  valid: string[];
  invalid: string[];
}

/**
 * Server-side citation validation (spec §7 step 6): every cited ID must be a
 * member of the retrieved set. Anything else is treated as a fabricated
 * citation and triggers the insufficient-evidence fallback.
 */
export function validateCitations(
  citations: unknown,
  retrievedIds: Set<string> | string[],
): CitationCheck {
  const ids = retrievedIds instanceof Set ? retrievedIds : new Set(retrievedIds);
  const valid: string[] = [];
  const invalid: string[] = [];
  if (!Array.isArray(citations)) return { valid, invalid: ["<not-an-array>"] };
  const seen = new Set<string>();
  for (const c of citations) {
    if (typeof c !== "string" || c.length === 0 || seen.has(c)) {
      invalid.push(String(c));
      continue;
    }
    seen.add(c);
    if (ids.has(c)) valid.push(c);
    else invalid.push(c);
  }
  return { valid, invalid };
}

export function isValidConfidence(value: unknown): value is ConfidenceLabel {
  return typeof value === "string" &&
    (VALID_CONFIDENCES as readonly string[]).includes(value);
}

/** Extract a JSON object from model text that may include fences or prose. */
export function extractJsonObject(text: string): Record<string, unknown> {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return {};
  try {
    const parsed: unknown = JSON.parse(clean.slice(start, end + 1));
    return (typeof parsed === "object" && parsed !== null)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Validate the model's raw output object against the required schema.
 * Returns a sanitized HistorianOutput, or null when the output is unusable
 * (caller must then use the insufficient-evidence fallback).
 */
export function sanitizeOutput(
  raw: Record<string, unknown>,
  retrievedIds: Set<string> | string[],
): HistorianOutput | null {
  if (typeof raw.answer !== "string" || raw.answer.trim().length < 10) return null;
  if (!isValidConfidence(raw.confidence)) return null;
  const ids = retrievedIds instanceof Set ? retrievedIds : new Set(retrievedIds);
  const check = validateCitations(raw.citations, ids);
  // Fabricated citation → reject the whole answer (spec §7: citation validity).
  if (check.invalid.length > 0) return null;
  let lesson: string | null = null;
  if (typeof raw.suggested_lesson === "string" && ids.has(raw.suggested_lesson)) {
    lesson = raw.suggested_lesson;
  }
  return {
    answer: raw.answer.trim(),
    confidence: raw.confidence,
    citations: check.valid,
    suggested_lesson: lesson,
  };
}

/** Build the insufficient-evidence fallback response. */
export function insufficientEvidenceFallback(
  retrievedIds: Set<string> | string[],
): HistorianOutput {
  const ids = [...(retrievedIds instanceof Set ? retrievedIds : new Set(retrievedIds))];
  return {
    answer: INSUFFICIENT_EVIDENCE,
    confidence: "baja",
    citations: [],
    suggested_lesson: ids.length > 0 ? ids[0] : null,
  };
}

/**
 * Conservative server-side screen for pastoral/prophecy requests.
 * Only matches explicit first-person guidance or prophecy phrasing to avoid
 * false positives on historical questions.
 */
const PASTORAL_PATTERNS = [
  /profec[ií]a sobre m[ií]/i,
  /qu[eé] me depara el futuro/i,
  /debo (hacer|dejar|elegir|casarme|divorciarme)/i,
  /aconsejame sobre mi vida/i,
  /dame una palabra (prof[eé]tica|para mi)/i,
  /ora por m[ií]/i,
  /\bpecado\b.*\bmi\b/i,
];

export function looksLikePastoralRequest(question: string): boolean {
  return PASTORAL_PATTERNS.some((re) => re.test(question));
}
