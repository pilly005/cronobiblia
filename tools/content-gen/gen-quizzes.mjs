// Generates 150 quiz questions (quiz-001..quiz-150).
// Types: multiple-choice, order-events, identify-place.
// 12 story-checkpoint quizzes carry fixed IDs referenced by stories.
import { base, SRC, rng, shuffle, pick } from "./common.mjs";
import { events12 } from "./data-timeline-1.mjs";
import { events34 } from "./data-timeline-2.mjs";
import { events57 } from "./data-timeline-3.mjs";
import { evidence } from "./data-evidence.mjs";
import { books } from "./data-books.mjs";
import { maps } from "./data-maps.mjs";
import { eras } from "./data-eras.mjs";

const R = "original-illustration-needed";
const events = [...events12, ...events34, ...events57];
const eraTitle = Object.fromEntries(eras.map((e) => [e.id, e.title]));
const rand = rng(20261003);

function mcq({ title, prompt, era, options, correctIdx, explanation, related_ids, certainty, confidence, sources, tier, qtype = "multiple-choice" }) {
  const ids = ["a", "b", "c", "d"];
  const order = shuffle([0, 1, 2, 3], rand);
  return base(null, title, {
    type: "quiz", quiz_type: qtype, prompt, era,
    options: order.map((oi, i) => ({ id: ids[i], text: options[oi] })),
    correct_option_id: ids[order.indexOf(correctIdx)],
    explanation, related_ids,
    certainty, confidence, sources, tier,
  });
}

function trunc(s, n = 150) {
  if (s.length <= n) return s;
  const cut = s.lastIndexOf(" ", n);
  return s.slice(0, cut > 0 ? cut : n) + "…";
}

// ---------- 12 fixed story-checkpoint quizzes ----------
const fixed = [];
function addFixed(id, q) { q.id = id; fixed.push(q); }

addFixed("quiz-001", mcq({
  title: "Repaso: el viaje de Abraham", prompt: "Según el relato bíblico, ¿de qué ciudad partió Abraham?",
  era: "era-01", options: ["Ur de los caldeos", "Harán", "Babilonia", "Nínive"], correctIdx: 0,
  explanation: "El texto bíblico presenta la partida desde Ur de los caldeos (Génesis 11:28-31), la metrópoli sumeria.",
  related_ids: ["evt-001", "map-01"], certainty: "traditional", confidence: "medium",
  sources: [SRC.RVR09, SRC.AYBD], tier: "free",
}));
addFixed("quiz-010", mcq({
  title: "Repaso: el Éxodo y la evidencia", prompt: "¿Qué objeto confirma externamente el nombre 'Israel' hacia el 1207 a. C.?",
  era: "era-02", options: ["La estela de Merneptah", "El Código de Hammurabi", "Las cartas de Amarna", "La piedra Rosetta"], correctIdx: 0,
  explanation: "La estela de Merneptah (c. 1207 a. C.) contiene la mención más antigua de 'Israel' fuera de la Biblia.",
  related_ids: ["evid-001", "evt-022"], certainty: "consensus", confidence: "high",
  sources: [SRC.EGIPCIO_CAIRO, SRC.AYBD], tier: "free",
}));
addFixed("quiz-020", mcq({
  title: "Repaso: David y Tel Dan", prompt: "¿Qué demuestra la estela de Tel Dan?",
  era: "era-03", options: ["Que 'la casa de David' era el nombre reconocido de la dinastía de Judá", "Que David construyó el primer Templo", "La fecha exacta del reinado de David", "El tamaño del reino unido"], correctIdx: 0,
  explanation: "La estela (siglo IX a. C.) menciona la 'casa de David'. No demuestra la existencia individual de David ni el tamaño de su reino.",
  related_ids: ["evid-006", "evt-033"], certainty: "consensus", confidence: "high",
  sources: [SRC.MUSEO_ISRAEL, SRC.IAA], tier: "free",
}));
addFixed("quiz-025", mcq({
  title: "Repaso: Salomón y Tiro", prompt: "¿Qué ciudad aportó el cedro y los artesanos para el Templo de Salomón?",
  era: "era-03", options: ["Tiro", "Sidón", "Damasco", "Gaza"], correctIdx: 0,
  explanation: "El texto bíblico presenta a Hiram de Tiro enviando cedro, oro y artesanos (1 Reyes 5).",
  related_ids: ["evt-031", "evt-036"], certainty: "traditional", confidence: "medium",
  sources: [SRC.RVR09, SRC.AYBD], tier: "free",
}));
addFixed("quiz-030", mcq({
  title: "Repaso: Elías en el Carmelo", prompt: "En el monte Carmelo, Elías se enfrentó a los profetas de…",
  era: "era-04", options: ["Baal", "Quemos", "Moloc", "Dagón"], correctIdx: 0,
  explanation: "El texto bíblico presenta el desafío contra los 450 profetas de Baal (1 Reyes 18).",
  related_ids: ["evt-041"], certainty: "traditional", confidence: "medium",
  sources: [SRC.RVR09, SRC.AYBD], tier: "premium",
}));
addFixed("quiz-035", mcq({
  title: "Repaso: Senaquerib ante Jerusalén", prompt: "¿En qué coinciden el prisma de Senaquerib y el texto bíblico sobre el 701 a. C.?",
  era: "era-04", options: ["En que Jerusalén no cayó", "En la causa del levantamiento del asedio", "En el número de defensores", "En la fecha exacta del asedio"], correctIdx: 0,
  explanation: "Ambas fuentes describen la campaña devastadora; ambas coinciden en que Jerusalén sobrevivió. La causa del levantamiento se debate.",
  related_ids: ["evt-048", "evid-004"], certainty: "consensus", confidence: "high",
  sources: [SRC.BRITISH_MUSEUM, SRC.RVR09], tier: "premium",
}));
addFixed("quiz-040", mcq({
  title: "Repaso: el Cilindro de Ciro", prompt: "¿Qué proclama el Cilindro de Ciro?",
  era: "era-05", options: ["La restauración de templos y el retorno de pueblos deportados", "Un tributo anual de Judá a Persia", "La construcción del Segundo Templo por orden de Ciro", "La derrota de Babilonia ante Egipto"], correctIdx: 0,
  explanation: "El cilindro (538 a. C.) proclama tolerancia imperial general; no menciona a los judíos por nombre.",
  related_ids: ["evt-059", "evid-005"], certainty: "consensus", confidence: "high",
  sources: [SRC.BRITISH_MUSEUM, SRC.OUP], tier: "premium",
}));
addFixed("quiz-045", mcq({
  title: "Repaso: Nehemías", prompt: "Según el texto bíblico, ¿en cuántos días se reconstruyeron los muros de Jerusalén?",
  era: "era-05", options: ["52 días", "40 días", "7 meses", "3 años"], correctIdx: 0,
  explanation: "Nehemías 6:15 presenta la obra terminada en 52 días, pese a la oposición vecina.",
  related_ids: ["evt-064"], certainty: "traditional", confidence: "medium",
  sources: [SRC.RVR09, SRC.AYBD], tier: "premium",
}));
addFixed("quiz-050", mcq({
  title: "Repaso: Juan el Bautista", prompt: "¿Qué historiador no cristiano del siglo I menciona a Juan el Bautista?",
  era: "era-06", options: ["Flavio Josefo", "Tácito", "Suetonio", "Filón de Alejandría"], correctIdx: 0,
  explanation: "Josefo (Antigüedades 18) describe a Juan como figura popular ejecutada por Herodes Antipas.",
  related_ids: ["evt-072"], certainty: "consensus", confidence: "medium",
  sources: [SRC.AYBD, SRC.OUP], tier: "premium",
}));
addFixed("quiz-055", mcq({
  title: "Repaso: el título de Pilato", prompt: "¿Qué título correcto de Pilato reveló la inscripción de Cesarea?",
  era: "era-06", options: ["Prefecto de Judea", "Procónsul de Siria", "Rey de Judea", "Sumo sacerdote"], correctIdx: 0,
  explanation: "La inscripción dice 'prefecto', corrigiendo el 'procurador' de textos posteriores.",
  related_ids: ["evt-074", "evid-021"], certainty: "consensus", confidence: "high",
  sources: [SRC.MUSEO_ISRAEL, SRC.IAA], tier: "premium",
}));
addFixed("quiz-060", mcq({
  title: "Repaso: el concilio de Jerusalén", prompt: "¿Qué decidió el concilio de Jerusalén (c. 49 d. C.)?",
  era: "era-07", options: ["No imponer la circuncisión a los gentiles creyentes", "Exigir la ley mosaica a todos", "Separar a Pablo de la misión", "Trasladar la iglesia a Antioquía"], correctIdx: 0,
  explanation: "Hechos 15 presenta el acuerdo: solo unas abstinencias básicas para los gentiles.",
  related_ids: ["evt-083"], certainty: "consensus", confidence: "medium",
  sources: [SRC.RVR09, SRC.AYBD], tier: "premium",
}));
addFixed("quiz-065", mcq({
  title: "Repaso: Pablo en Corinto", prompt: "¿Qué inscripción permite fechar la estancia de Pablo en Corinto en el 51–52 d. C.?",
  era: "era-07", options: ["La de Galión en Delfos", "La de Pilato en Cesarea", "La de Erasto en Corinto", "La piedra Rosetta"], correctIdx: 0,
  explanation: "La carta de Claudio que menciona a Galión como procónsul de Acaya es el anclaje cronológico de Pablo.",
  related_ids: ["evt-084", "evid-022"], certainty: "consensus", confidence: "high",
  sources: [SRC.DELFOS, SRC.ASOR], tier: "premium",
}));

// ---------- 48 event multiple-choice ----------
const gen = [];
const evPool = shuffle(events, rand);
for (let i = 0; i < 48; i++) {
  const e = evPool[i % evPool.length];
  const stem = i % 4;
  if (stem === 0) {
    const others = pick(eras.filter((x) => x.id !== e.era), 3, rand).map((x) => x.title);
    gen.push(mcq({
      title: `Quiz: la era de «${e.title}»`,
      prompt: `«${e.title}» pertenece a la era de…`,
      era: e.era, options: [eraTitle[e.era], ...others], correctIdx: 0,
      explanation: `«${e.title}» (${e.date_label}) pertenece a «${eraTitle[e.era]}».`,
      related_ids: [e.id], certainty: e.certainty, confidence: e.confidence,
      sources: e.sources, tier: "premium",
    }));
  } else if (stem === 1) {
    const others = pick(events.filter((x) => x.id !== e.id && x.era !== e.era), 3, rand).map((x) => x.date_label);
    gen.push(mcq({
      title: `Quiz: fecha de «${e.title}»`,
      prompt: `¿En qué rango de fechas se sitúa «${e.title}»?`,
      era: e.era, options: [e.date_label, ...others], correctIdx: 0,
      explanation: `«${e.title}»: ${e.date_label}. ${e.certainty === "disputed" ? "La fecha es debatida." : ""}`,
      related_ids: [e.id], certainty: e.certainty, confidence: e.confidence,
      sources: e.sources, tier: "premium",
    }));
  } else if (stem === 2 && e.figures.length > 0) {
    const fig = e.figures[0];
    const others = pick(events.filter((x) => x.id !== e.id && x.figures.length > 0 && !x.figures.includes(fig)), 3, rand).map((x) => x.figures[0]);
    gen.push(mcq({
      title: `Quiz: personaje de «${e.title}»`,
      prompt: `¿Qué personaje se asocia principalmente con «${e.title}»?`,
      era: e.era, options: [fig, ...others], correctIdx: 0,
      explanation: `«${e.title}» se asocia con ${fig} (${e.scripture_refs.join("; ") || "sin referencia bíblica directa"}).`,
      related_ids: [e.id], certainty: e.certainty, confidence: e.confidence,
      sources: e.sources, tier: "premium",
    }));
  } else {
    const ref = e.scripture_refs[0] || "Sin referencia bíblica";
    const others = pick(events.filter((x) => x.id !== e.id && x.scripture_refs.length > 0 && x.scripture_refs[0] !== ref), 3, rand).map((x) => x.scripture_refs[0]);
    const opts = [ref, ...others];
    gen.push(mcq({
      title: `Quiz: pasaje de «${e.title}»`,
      prompt: `¿Qué pasaje bíblico se asocia con «${e.title}»?`,
      era: e.era, options: opts, correctIdx: 0,
      explanation: `«${e.title}» → ${ref}.`,
      related_ids: [e.id], certainty: e.certainty, confidence: e.confidence,
      sources: e.sources, tier: "premium",
    }));
  }
}

// ---------- 30 evidence multiple-choice ----------
for (let i = 0; i < 30; i++) {
  const v = evidence[i % evidence.length];
  if (i % 2 === 0) {
    const others = pick(evidence.filter((x) => x.id !== v.id), 3, rand).map((x) => x.present_location);
    gen.push(mcq({
      title: `Quiz: dónde está «${v.title}»`,
      prompt: `¿Dónde se conserva hoy «${v.title}»?`,
      era: v.era || "era-04", options: [v.present_location, ...others], correctIdx: 0,
      explanation: `«${v.title}» (${v.dating}) se conserva en: ${v.present_location}.`,
      related_ids: [v.id, ...(v.related_ids || [])], certainty: v.certainty, confidence: v.confidence,
      sources: v.sources, tier: "premium",
    }));
  } else {
    const others = pick(evidence.filter((x) => x.id !== v.id), 3, rand).map((x) => trunc(x.does_not_prove, 120));
    gen.push(mcq({
      title: `Quiz: límites de «${v.title}»`,
      prompt: `¿Qué NO demuestra «${v.title}»?`,
      era: v.era || "era-04", options: [trunc(v.does_not_prove, 120), ...others], correctIdx: 0,
      explanation: `Qué aporta: ${trunc(v.contributes, 160)} Qué no demuestra: ${trunc(v.does_not_prove, 160)}`,
      related_ids: [v.id, ...(v.related_ids || [])], certainty: v.certainty, confidence: v.confidence,
      sources: v.sources, tier: "premium",
    }));
  }
}

// ---------- 18 order-events ----------
for (let i = 0; i < 18; i++) {
  const eraPool = shuffle(eras, rand).slice(0, 4);
  const chosen = eraPool.map((er) => pick(events.filter((e) => e.era === er.id), 1, rand)[0]).filter(Boolean);
  if (chosen.length < 4) continue;
  const ordered = [...chosen].sort((a, b) => a.year_min - b.year_min || a.year_max - b.year_max);
  const shown = shuffle(chosen, rand);
  gen.push(base(null, `Quiz: ordena estos eventos`, {
    type: "quiz", quiz_type: "order-events",
    prompt: "Ordena estos eventos del más antiguo al más reciente.",
    era: ordered[0].era,
    items: shown.map((e) => ({ event_id: e.id, label: e.title })),
    correct_order: ordered.map((e) => e.id),
    explanation: "Orden correcto: " + ordered.map((e) => `«${e.title}» (${e.date_label})`).join(" → "),
    related_ids: ordered.map((e) => e.id),
    certainty: "consensus", confidence: "medium",
    sources: [SRC.RVR09, SRC.AYBD], tier: "premium",
  }));
}

// ---------- 20 identify-place ----------
const allPlaces = maps.flatMap((m) => m.places.map((p) => ({ ...p, map_id: m.id, map_title: m.title })));
for (let i = 0; i < 20; i++) {
  const pl = allPlaces[Math.floor(rand() * allPlaces.length)];
  if (i % 2 === 0) {
    const others = pick(allPlaces.filter((x) => x.id !== pl.id), 3, rand).map((x) => x.modern_name);
    gen.push(mcq({
      title: `Quiz: el lugar «${pl.ancient_name}»`,
      prompt: `¿Cuál es el nombre moderno de «${pl.ancient_name}»?`,
      era: maps.find((m) => m.id === pl.map_id).era,
      options: [pl.modern_name, ...others], correctIdx: 0,
      explanation: `«${pl.ancient_name}» → ${pl.modern_name}. ${pl.description}`,
      related_ids: [pl.map_id], certainty: "consensus", confidence: "high",
      sources: [SRC.AYBD, SRC.OUP], tier: "premium", qtype: "identify-place",
    }));
  } else {
    const others = pick(allPlaces.filter((x) => x.id !== pl.id), 3, rand).map((x) => x.ancient_name);
    gen.push(mcq({
      title: `Quiz: identifica el lugar`,
      prompt: `En el mapa «${pl.map_title}», ¿qué lugar antiguo es hoy «${pl.modern_name}»?`,
      era: maps.find((m) => m.id === pl.map_id).era,
      options: [pl.ancient_name, ...others], correctIdx: 0,
      explanation: `«${pl.modern_name}» es el nombre moderno de «${pl.ancient_name}». ${pl.description}`,
      related_ids: [pl.map_id], certainty: "consensus", confidence: "high",
      sources: [SRC.AYBD, SRC.OUP], tier: "premium", qtype: "identify-place",
    }));
  }
}

// ---------- 22 book multiple-choice ----------
const bookPool = shuffle(books, rand);
for (let i = 0; i < 22; i++) {
  const b = bookPool[i % bookPool.length];
  if (i % 2 === 0) {
    const sections = ["Pentateuco", "Históricos", "Poéticos", "Profetas Mayores", "Profetas Menores", "Evangelios", "Historia", "Cartas de Pablo", "Cartas generales", "Otras cartas", "Profecía"];
    const others = pick(sections.filter((s) => s !== b.section), 3, rand);
    gen.push(mcq({
      title: `Quiz: la sección de ${b.title}`,
      prompt: `¿A qué sección pertenece el libro de ${b.title}?`,
      era: b.testament === "AT" ? "era-04" : "era-07",
      options: [b.section, ...others], correctIdx: 0,
      explanation: `${b.title} (${b.testament === "AT" ? "Antiguo" : "Nuevo"} Testamento) pertenece a ${b.section}. ${b.traditional_attribution}`,
      related_ids: [b.id], certainty: b.certainty, confidence: b.confidence,
      sources: b.sources, tier: "premium",
    }));
  } else {
    const others = pick(books.filter((x) => x.id !== b.id && x.date_label !== b.date_label), 3, rand).map((x) => x.date_label);
    gen.push(mcq({
      title: `Quiz: fecha de ${b.title}`,
      prompt: `¿Cómo se fecha tradicionalmente el libro de ${b.title}?`,
      era: b.testament === "AT" ? "era-04" : "era-07",
      options: [b.date_label, ...others], correctIdx: 0,
      explanation: `${b.title}: ${b.date_label}. Nota académica: ${b.scholarly_note}`,
      related_ids: [b.id], certainty: b.certainty, confidence: b.confidence,
      sources: b.sources, tier: "premium",
    }));
  }
}

// ---------- assign IDs: fixed first, then remaining numbers in order ----------
const fixedIds = new Set(fixed.map((q) => q.id));
const usedNums = new Set([...fixedIds].map((id) => parseInt(id.split("-")[1], 10)));
const remaining = gen;
let n = 1;
const byId = new Map();
for (const q of fixed) byId.set(q.id, q);
for (const q of remaining) {
  while (usedNums.has(n)) n++;
  const id = `quiz-${String(n).padStart(3, "0")}`;
  usedNums.add(n);
  q.id = id;
  byId.set(id, q);
  n++;
}

// Tier: first 25 quizzes free (by numeric id), rest premium
for (const [id, q] of byId) {
  const num = parseInt(id.split("-")[1], 10);
  q.tier = num <= 25 ? "free" : "premium";
}

const ordered = [...byId.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, q]) => q);

if (ordered.length !== 150) throw new Error(`expected 150 quizzes, got ${ordered.length}`);

export const quizzes = ordered;
