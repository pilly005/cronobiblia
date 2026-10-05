// Generates 365 daily facts (fact-001..fact-365), deterministic.
import { base, SRC, rng, shuffle } from "./common.mjs";
import { events12 } from "./data-timeline-1.mjs";
import { events34 } from "./data-timeline-2.mjs";
import { events57 } from "./data-timeline-3.mjs";
import { evidence } from "./data-evidence.mjs";
import { books } from "./data-books.mjs";
import { maps } from "./data-maps.mjs";

const events = [...events12, ...events34, ...events57];
const rand = rng(777);

function trunc(s, n = 220) {
  if (!s) return "";
  if (s.length <= n) return s;
  const cut = s.lastIndexOf(" ", n);
  return s.slice(0, cut > 0 ? cut : n) + "…";
}
function lc(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

const pool = [];
for (const e of events) {
  pool.push({
    related_id: e.id, certainty: e.certainty, confidence: e.confidence, sources: e.sources,
    text: `«${e.title}» (${e.date_label}): ${trunc(e.summary)}`,
  });
  pool.push({
    related_id: e.id, certainty: e.certainty, confidence: e.confidence, sources: e.sources,
    text: `De la época de «${e.title}»: ${lc(trunc(e.world_context))}`,
  });
}
for (const v of evidence) {
  pool.push({
    related_id: v.id, certainty: v.certainty, confidence: v.confidence, sources: v.sources,
    text: `${v.title} (${v.dating}): ${trunc(v.contributes)}`,
  });
  pool.push({
    related_id: v.id, certainty: v.certainty, confidence: v.confidence, sources: v.sources,
    text: `Ojo crítico — ${v.title}: ${lc(trunc(v.does_not_prove))}`,
  });
}
for (const b of books) {
  pool.push({
    related_id: b.id, certainty: b.certainty, confidence: b.confidence, sources: b.sources,
    text: `${b.title} (${b.section}): ${trunc(b.summary)} ${b.traditional_attribution}`,
  });
  pool.push({
    related_id: b.id, certainty: b.certainty, confidence: b.confidence, sources: b.sources,
    text: `Sobre la autoría de ${b.title}: ${lc(trunc(b.scholarly_note))}`,
  });
}
for (const m of maps) {
  const rt = m.routes[0];
  pool.push({
    related_id: m.id, certainty: m.certainty, confidence: m.confidence, sources: m.sources,
    text: `Mapa «${m.title}»: ${trunc(m.summary)}`,
  });
  pool.push({
    related_id: m.id, certainty: m.certainty, confidence: m.confidence, sources: m.sources,
    text: `En el mapa «${m.title}» la ruta se clasifica como «${rt.certainty}». ${trunc(rt.steps[0].text)}`,
  });
}

const picked = shuffle(pool, rand).slice(0, 365);
if (picked.length !== 365) throw new Error("fact pool too small");

export const dailyFacts = picked.map((f, i) =>
  base(`fact-${String(i + 1).padStart(3, "0")}`, `Dato del día ${i + 1}`, {
    type: "daily-fact",
    day: i + 1,
    text: f.text,
    related_id: f.related_id,
    certainty: f.certainty,
    confidence: f.confidence,
    sources: f.sources,
    tier: "free",
  })
);
