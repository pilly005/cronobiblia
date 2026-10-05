// Unit tests for the historian-chat citation validator.
// Runnable WITHOUT any API key or network: `node tests/validate.test.ts`
// (Node 22+ strips types natively; no build step needed.)

import { strict as assert } from "node:assert";
import {
  INSUFFICIENT_EVIDENCE,
  validateCitations,
  isValidConfidence,
  extractJsonObject,
  sanitizeOutput,
  insufficientEvidenceFallback,
  looksLikePastoralRequest,
} from "../validate.ts";

const RETRIEVED = new Set(["seed:exodo-fecha", "seed:estela-merneptah"]);
let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`FAIL - ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

// --- validateCitations ---
test("accepts citations that are all in the retrieved set", () => {
  const r = validateCitations(["seed:exodo-fecha"], RETRIEVED);
  assert.deepEqual(r, { valid: ["seed:exodo-fecha"], invalid: [] });
});

test("flags an unknown citation ID as fabricated", () => {
  const r = validateCitations(["seed:exodo-fecha", "evt:fake-123"], RETRIEVED);
  assert.deepEqual(r.valid, ["seed:exodo-fecha"]);
  assert.deepEqual(r.invalid, ["evt:fake-123"]);
});

test("flags non-string and duplicate citations", () => {
  const r = validateCitations(["seed:exodo-fecha", "seed:exodo-fecha", 42], RETRIEVED);
  assert.deepEqual(r.valid, ["seed:exodo-fecha"]);
  assert.equal(r.invalid.length, 2);
});

test("rejects non-array citations", () => {
  const r = validateCitations("seed:exodo-fecha", RETRIEVED);
  assert.equal(r.valid.length, 0);
  assert.equal(r.invalid.length, 1);
});

test("empty citations array is valid (allowed for refusals)", () => {
  const r = validateCitations([], RETRIEVED);
  assert.deepEqual(r, { valid: [], invalid: [] });
});

// --- confidence ---
test("accepts the four spec confidence labels", () => {
  for (const c of ["alta", "media", "baja", "disputada"]) assert.ok(isValidConfidence(c));
  assert.ok(!isValidConfidence("certain"));
  assert.ok(!isValidConfidence("ALTA"));
});

// --- extractJsonObject ---
test("extracts JSON from fenced model output", () => {
  const o = extractJsonObject('```json\n{"respuesta":"hola","confianza":"alta"}\n```');
  assert.equal(o.respuesta, "hola");
});
test("returns {} for non-JSON text", () => {
  assert.deepEqual(extractJsonObject("no json here"), {});
});

// --- sanitizeOutput ---
test("accepts a well-formed grounded answer", () => {
  const out = sanitizeOutput(
    {
      answer: "La evidencia externa indica presencia israelita hacia 1208 a. C.",
      confidence: "alta",
      citations: ["seed:estela-merneptah"],
      suggested_lesson: "seed:estela-merneptah",
    },
    RETRIEVED,
  );
  assert.ok(out);
  assert.deepEqual(out!.citations, ["seed:estela-merneptah"]);
  assert.equal(out!.suggested_lesson, "seed:estela-merneptah");
});

test("REJECTS an answer with a fabricated citation (hallucination trap)", () => {
  const out = sanitizeOutput(
    {
      answer: "El casco de Goliat está en el museo de Estambul según los registros.",
      confidence: "alta",
      citations: ["evt:casco-goliat-2019"],
      suggested_lesson: null,
    },
    RETRIEVED,
  );
  assert.equal(out, null);
});

test("REJECTS answers with bad confidence or too-short text", () => {
  assert.equal(
    sanitizeOutput({ answer: "ok", confidence: "alta", citations: [], suggested_lesson: null }, RETRIEVED),
    null,
  );
  assert.equal(
    sanitizeOutput(
      { answer: "Respuesta suficientemente larga para pasar el filtro.", confidence: "segura", citations: [], suggested_lesson: null },
      RETRIEVED,
    ),
    null,
  );
});

test("nulls out a suggested_lesson that is not a retrieved ID", () => {
  const out = sanitizeOutput(
    {
      answer: "Respuesta suficientemente larga para pasar el filtro de longitud mínima.",
      confidence: "media",
      citations: [],
      suggested_lesson: "evt:inventada",
    },
    RETRIEVED,
  );
  assert.ok(out);
  assert.equal(out!.suggested_lesson, null);
});

// --- fallback ---
test("fallback uses the EXACT spec sentence and suggests the first passage", () => {
  const f = insufficientEvidenceFallback(RETRIEVED);
  assert.equal(f.answer, INSUFFICIENT_EVIDENCE);
  assert.equal(
    f.answer,
    "No encuentro suficiente respaldo en la biblioteca revisada para responder con confianza.",
  );
  assert.deepEqual(f.citations, []);
  assert.equal(f.suggested_lesson, "seed:exodo-fecha");
});

test("fallback handles an empty retrieved set", () => {
  const f = insufficientEvidenceFallback(new Set());
  assert.equal(f.suggested_lesson, null);
});

// --- pastoral screen ---
test("flags explicit prophecy / life-counseling requests", () => {
  assert.ok(looksLikePastoralRequest("Dame una profecía sobre mi futuro"));
  assert.ok(looksLikePastoralRequest("¿Debo dejar mi trabajo?"));
});

test("does NOT flag historical questions", () => {
  assert.ok(!looksLikePastoralRequest("¿En qué año ocurrió el Éxodo?"));
  assert.ok(!looksLikePastoralRequest("¿Qué aporta la Estela de Merneptah?"));
  assert.ok(!looksLikePastoralRequest("¿Debo estudiar hebreo para entender mejor?"));
});

console.log(`\n${passed} tests passed`);
