// Common helpers + shared source constants for CronoBiblia content generation.
// Sources are cited at INSTITUTION/WORK level only (per build-spec §5).
// No invented article titles, no URLs.

export const DRAFT = "DRAFT-AWAITING-REVIEW";

export const SRC = {
  MUSEO_ISRAEL: "Museo de Israel, Jerusalén",
  IAA: "Israel Antiquities Authority (Autoridad de Antigüedades de Israel)",
  BRITISH_MUSEUM: "Museo Británico, Londres",
  LOUVRE: "Museo del Louvre, París — Departamento de Antigüedades Orientales",
  MET: "Museo Metropolitano de Arte, Nueva York",
  PERGAMON: "Museo de Pérgamo (Vorderasiatisches Museum), Berlín",
  EGIPCIO_BERLIN: "Museo Egipcio, Berlín",
  EGIPCIO_CAIRO: "Museo Egipcio, El Cairo",
  ESTAMBUL: "Museos Arqueológicos de Estambul",
  DELFOS: "Museo Arqueológico de Delfos, Grecia",
  CORINTO: "Museo Arqueológico de la Antigua Corinto",
  AYBD: "Anchor Yale Bible Dictionary",
  EERDMANS_DICT: "Eerdmans Dictionary of the Bible",
  OUP: "Oxford University Press — obras de referencia de historia antigua",
  BAS: "Biblical Archaeology Society",
  ASOR: "American Schools of Oriental Research (ASOR)",
  ZONDERVAN: "Zondervan — recursos de referencia bíblica",
  RVR09: "Reina-Valera 1909 (texto bíblico de dominio público; solo citas breves)",
  UNESCO: "UNESCO — Lista del Patrimonio Mundial",
};

// Base factory for every content item.
export function base(id, title, fields = {}) {
  return {
    id,
    version: 1,
    status: DRAFT,
    title,
    ...fields,
  };
}

// Deterministic seeded RNG (mulberry32) so builds are reproducible.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr, n, rand) {
  return shuffle(arr, rand).slice(0, n);
}

// BCE/CE year helpers: negative = a. C., positive = d. C.
export const AC = (y) => -y;

export function check(cond, msg) {
  if (!cond) throw new Error("GEN ERROR: " + msg);
}
