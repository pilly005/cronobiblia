// CronoBiblia — corpus access module for historian-chat.
//
// Retrieval searches ONLY approved editorial content. Retrieved passages are
// DATA for the model, never instructions (prompt-injection defense: they are
// wrapped in explicit delimiters at prompt-build time).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Confidence = "alta" | "media" | "baja" | "disputada";
export type ClaimLayer = "texto" | "historia" | "interpretacion";

export interface Passage {
  content_id: string;
  title: string;
  summary: string;
  confidence: Confidence;
  layer: ClaimLayer;
  source_titles: string[];
}

// ============================================================================
// BUNDLED SEED FALLBACK — TEMPORARY, CLEARLY MARKED
// ----------------------------------------------------------------------------
// Used ONLY when the approved editorial catalog is empty (not yet seeded) or
// the database cannot be read. These are placeholder passages for developer
// testing and human review — they are NOT reviewed facts. Delete or replace
// this block as soon as the editorial migration with approved content ships.
// content_ids are prefixed "seed:" so seed citations can never be confused
// with real catalog IDs during citation validation.
// ============================================================================
const SEED_PASSAGES: Passage[] = [
  {
    content_id: "seed:exodo-fecha",
    title: "La fecha del Éxodo: una cuestión debatida",
    summary:
      "El texto bíblico presenta la salida de Israel de Egipto; la fecha es debatida entre los especialistas. " +
      "Una propuesta común la sitúa hacia el siglo XIII a. C.; otra, hacia el siglo XV a. C. " +
      "No existe consenso y la evidencia externa no permite fijar una fecha exacta.",
    confidence: "disputada",
    layer: "interpretacion",
    source_titles: ["Semilla editorial temporal (pendiente de revisión)"],
  },
  {
    content_id: "seed:estela-merneptah",
    title: "La Estela de Merneptah",
    summary:
      "Inscripción egipcia del faraón Merneptah (c. 1208 a. C.) que menciona a «Israel» " +
      "como pueblo en Canaán. Es la mención extrabíblica más antigua del nombre Israel. " +
      "Qué aporta: confirma la presencia de un grupo llamado Israel en Canaán hacia fines del siglo XIII a. C. " +
      "Qué no demuestra: no describe el Éxodo ni fija su fecha.",
    confidence: "alta",
    layer: "historia",
    source_titles: ["Museo Egipcio, El Cairo (registro de objeto)", "Semilla editorial temporal"],
  },
  {
    content_id: "seed:roma-judea",
    title: "Roma y Judea en el siglo I",
    summary:
      "En tiempos de Jesús, Judea estaba bajo dominio romano: primero como reino cliente bajo Herodes el Grande " +
      "y luego como provincia administrada por prefectos como Poncio Pilato. La evidencia externa (monedas, " +
      "inscripciones y autores romanos) confirma el marco político general que presenta el texto bíblico.",
    confidence: "alta",
    layer: "historia",
    source_titles: ["Semilla editorial temporal (pendiente de revisión)"],
  },
  {
    content_id: "seed:pablo-viajes",
    title: "Los viajes de Pablo",
    summary:
      "El texto bíblico presenta varios viajes misioneros de Pablo por el Mediterráneo oriental, " +
      "con rutas reconstruidas a partir del libro de los Hechos y sus cartas. " +
      "Algunas etapas están documentadas por la geografía y la arqueología; otras son reconstrucciones debatidas.",
    confidence: "media",
    layer: "texto",
    source_titles: ["Semilla editorial temporal (pendiente de revisión)"],
  },
];

const STOPWORDS = new Set(
  "el la los las un una unos unas de del en y o que qué por para con sin sobre entre como cuándo cuando donde dónde porqué porque cual cuál cuales quién quien quienes esto esta este estos estas ese esa eso esos esas hay fue fueron era eran ser son está están tengo tiene tienen mi mis tu tus su sus me te se nos le les lo al".split(" "),
);

function tokens(question: string): string[] {
  const words = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents for matching
    .replace(/[^a-zñ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 8);
}

/** Default claim layer per content type (§5: texto / historia / interpretación). */
function layerForType(type: string): ClaimLayer {
  if (type === "evidence") return "historia";
  if (type === "timeline_event" || type === "place_card") return "texto";
  return "interpretacion";
}

export interface RetrievalResult {
  passages: Passage[];
  fromSeed: boolean;
}

/**
 * Retrieve the top approved passages for a question.
 * Reads go through the caller's RLS context (anon → free only;
 * authenticated → free + premium when entitled), so retrieval can never
 * leak content the user is not allowed to see.
 */
export async function retrievePassages(
  client: SupabaseClient,
  question: string,
  limit = 5,
): Promise<RetrievalResult> {
  const terms = tokens(question);
  if (terms.length === 0) return { passages: SEED_PASSAGES.slice(0, 2), fromSeed: true };

  try {
    const orClause = terms
      .map((t) => `title_es.ilike.%${t}%,summary_es.ilike.%${t}%`)
      .join(",");
    const { data: items, error } = await client
      .from("content_items")
      .select("id, title_es, summary_es, confidence, type")
      .eq("status", "approved")
      .or(orClause)
      .limit(20);
    if (error || !items || items.length === 0) {
      return { passages: SEED_PASSAGES, fromSeed: true };
    }

    // Rank by token hits.
    const scored = items.map((it) => {
      const hay = `${it.title_es ?? ""} ${it.summary_es ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const hits = terms.filter((t) => hay.includes(t)).length;
      return { it, hits };
    }).filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, limit);

    if (scored.length === 0) return { passages: SEED_PASSAGES, fromSeed: true };

    // Attach source titles for the visible citation sheet.
    const ids = scored.map((s) => s.it.id);
    const { data: cites } = await client
      .from("citations")
      .select("content_item_id, sources(title)")
      .in("content_item_id", ids);
    const byItem = new Map<string, string[]>();
    for (const c of cites ?? []) {
      const arr = byItem.get(c.content_item_id) ?? [];
      const title = (c.sources as unknown as { title?: string } | null)?.title;
      if (title) arr.push(title);
      byItem.set(c.content_item_id, arr);
    }

    return {
      passages: scored.map(({ it }) => ({
        content_id: String(it.id),
        title: it.title_es ?? "",
        summary: it.summary_es ?? "",
        confidence: (it.confidence ?? "media") as Confidence,
        layer: layerForType(it.type ?? ""),
        source_titles: byItem.get(it.id) ?? [],
      })),
      fromSeed: false,
    };
  } catch {
    return { passages: SEED_PASSAGES, fromSeed: true };
  }
}
