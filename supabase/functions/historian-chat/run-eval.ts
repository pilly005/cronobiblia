// CronoBiblia — historian-chat evaluation runner.
//
// Reads target URL + key from env and executes eval-set.json against a
// deployed historian-chat function. Requires a valid user JWT with enough
// remaining AI quota (use a dedicated eval user).
//
//   HISTORIAN_URL=https://<ref>.supabase.co/functions/v1/historian-chat \
//   HISTORIAN_KEY=<anon key> \
//   EVAL_JWT=<user access token> \
//   deno run --allow-env --allow-net run-eval.ts
//
// Checks per case:
//  - expected "insufficient_evidence": answer contains the EXACT sentence,
//    citations is empty.
//  - all other expectations: structural (answer/citations/confidence present,
//    confidence in enum). Semantic expectations (denominational neutrality,
//    Spanish clarity, certainty labels) are flagged for HUMAN review — the
//    script prints the answer for grading, it does not auto-pass them.

import { INSUFFICIENT_EVIDENCE } from "./validate.ts";

const HISTORIAN_URL = Deno.env.get("HISTORIAN_URL");
const HISTORIAN_KEY = Deno.env.get("HISTORIAN_KEY");
const EVAL_JWT = Deno.env.get("EVAL_JWT");

if (!HISTORIAN_URL || !HISTORIAN_KEY || !EVAL_JWT) {
  console.error("Missing env: HISTORIAN_URL, HISTORIAN_KEY, EVAL_JWT are required.");
  Deno.exit(1);
}

interface EvalCase {
  id: string;
  category: string;
  question: string;
  expected: string;
  notes: string;
}

const evalSet = JSON.parse(await Deno.readTextFile("./eval-set.json"));
const cases: EvalCase[] = evalSet.cases;
const EXPECTED_SENTENCE: string =
  evalSet.expected_insufficient_sentence ?? INSUFFICIENT_EVIDENCE;

const VALID_CONF = ["alta", "media", "baja", "disputada"];
const HUMAN_REVIEW = new Set([
  "answered_with_disputed_label",
  "answered_with_range",
  "no_declaration",
  "answered_with_citations",
  "answered_with_nuance",
  "answered_clear_spanish",
  "answered_with_certainty_label",
  "copyright_refusal",
  "pastoral_redirect",
  "no_instruction_following",
]);

let autoPass = 0;
let autoFail = 0;
const humanQueue: { id: string; expected: string; answer: string; citations: string[] }[] = [];

for (const c of cases) {
  let verdict = "ERROR";
  let detail = "";
  let body: Record<string, unknown> = {};
  try {
    const res = await fetch(HISTORIAN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: HISTORIAN_KEY,
        Authorization: `Bearer ${EVAL_JWT}`,
      },
      body: JSON.stringify({ question: c.question }),
    });
    body = await res.json();
    if (!res.ok) {
      verdict = "FAIL";
      detail = `HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`;
    } else if (c.expected === "insufficient_evidence") {
      const answer = typeof body.answer === "string" ? body.answer : "";
      const citations = Array.isArray(body.citations) ? body.citations : null;
      if (answer.includes(EXPECTED_SENTENCE) && citations !== null && citations.length === 0) {
        verdict = "PASS";
      } else {
        verdict = "FAIL";
        detail = `expected exact sentence + empty citations; got answer=${answer.slice(0, 120)}… citations=${JSON.stringify(citations)}`;
      }
    } else if (HUMAN_REVIEW.has(c.expected)) {
      // Structural gate first; semantics go to a human grader.
      const ok =
        typeof body.answer === "string" && body.answer.length > 20 &&
        VALID_CONF.includes(String(body.confidence)) &&
        Array.isArray(body.citations);
      if (!ok) {
        verdict = "FAIL";
        detail = `structural check failed: ${JSON.stringify(body).slice(0, 200)}`;
      } else {
        verdict = "HUMAN";
        humanQueue.push({
          id: c.id,
          expected: c.expected,
          answer: String(body.answer),
          citations: body.citations as string[],
        });
      }
    } else {
      verdict = "FAIL";
      detail = `unknown expectation "${c.expected}"`;
    }
  } catch (e) {
    detail = String(e).slice(0, 200);
  }

  if (verdict === "PASS") autoPass++;
  else if (verdict === "FAIL") autoFail++;
  console.log(`[${verdict}] ${c.id} (${c.category})${detail ? " — " + detail : ""}`);
}

console.log("\n==============================");
console.log(`Auto PASS: ${autoPass}   Auto FAIL: ${autoFail}   HUMAN REVIEW: ${humanQueue.length}`);
for (const h of humanQueue) {
  console.log(`\n--- HUMAN: ${h.id} — expected: ${h.expected}`);
  console.log(`citations: ${JSON.stringify(h.citations)}`);
  console.log(h.answer);
}
if (autoFail > 0) Deno.exit(2);
