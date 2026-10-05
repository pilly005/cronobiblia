// Validator for CronoBiblia content packs.
// Checks:
//  1. Every JSON file in src/content/packs parses.
//  2. ID uniqueness across ALL packs (including nested place/route IDs).
//  3. Every story card / quiz reference / map step reference resolves to an existing ID.
//  4. Every item has: id, version, status, certainty|confidence, >=1 source, Spanish title.
//  5. status === "DRAFT-AWAITING-REVIEW" and version === 1 (draft gate).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const packsDir = join(root, "src", "content", "packs");

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ---- 1. parse ----
const files = readdirSync(packsDir).filter((f) => f.endsWith(".json"));
const packs = {};
for (const f of files) {
  try {
    packs[f] = JSON.parse(readFileSync(join(packsDir, f), "utf8"));
  } catch (e) {
    fail(`PARSE: ${f}: ${e.message}`);
  }
}

// ---- collect items + IDs ----
const idToFile = new Map();   // id -> file (top-level items)
const nestedIds = new Map();  // nested id (place/route) -> "file:item"
const allItems = [];          // {file, item}

for (const [f, doc] of Object.entries(packs)) {
  const items = Array.isArray(doc) ? doc : doc.items;
  if (!Array.isArray(items)) { fail(`STRUCT: ${f} has no items array`); continue; }
  for (const item of items) {
    allItems.push({ file: f, item });
    if (typeof item.id === "string") {
      if (idToFile.has(item.id)) fail(`DUP-ID: ${item.id} in ${f} and ${idToFile.get(item.id)}`);
      else idToFile.set(item.id, f);
    }
    // nested ids: map places + routes
    for (const p of item.places || []) {
      if (nestedIds.has(p.id)) fail(`DUP-NESTED-ID: ${p.id} (${f}:${item.id})`);
      else nestedIds.set(p.id, `${f}:${item.id}`);
    }
    for (const r of item.routes || []) {
      if (nestedIds.has(r.id)) fail(`DUP-NESTED-ID: ${r.id} (${f}:${item.id})`);
      else nestedIds.set(r.id, `${f}:${item.id}`);
    }
  }
}
// cross-check top-level vs nested collisions
for (const [id, where] of nestedIds) {
  if (idToFile.has(id)) fail(`DUP-ID: nested ${id} (${where}) collides with top-level item`);
}

// ---- 4. per-item required fields ----
for (const { file, item } of allItems) {
  const tag = `${file}:${item.id || "?"}`;
  if (!item.id || typeof item.id !== "string") fail(`FIELD: ${tag} missing id`);
  if (item.version !== 1) fail(`FIELD: ${tag} version !== 1`);
  if (item.status !== "DRAFT-AWAITING-REVIEW") fail(`FIELD: ${tag} status !== DRAFT-AWAITING-REVIEW`);
  if (!item.certainty && !item.confidence) fail(`FIELD: ${tag} missing certainty/confidence`);
  if (!Array.isArray(item.sources) || item.sources.length < 1) fail(`FIELD: ${tag} needs >=1 source`);
  if (!item.title || typeof item.title !== "string" || item.title.trim().length === 0)
    fail(`FIELD: ${tag} missing Spanish title`);
  if (item.places) for (const p of item.places) {
    if (!p.id || !p.ancient_name || !p.modern_name || !Array.isArray(p.coords) || p.coords.length !== 2)
      fail(`FIELD: ${tag} place ${p.id || "?"} incomplete`);
  }
  if (item.routes) for (const r of item.routes) {
    if (!["documented", "reconstructed", "debated"].includes(r.certainty))
      fail(`FIELD: ${tag} route ${r.id} bad certainty '${r.certainty}'`);
    if (!Array.isArray(r.polyline) || r.polyline.length < 2)
      fail(`FIELD: ${tag} route ${r.id} polyline needs >=2 points`);
  }
}

const exists = (id) => idToFile.has(id) || nestedIds.has(id);

// ---- 3. reference checks ----
for (const { file, item } of allItems) {
  const tag = `${file}:${item.id}`;
  // stories
  for (const c of item.cards || []) {
    if (c.content_id && !exists(c.content_id)) fail(`REF: ${tag} card ${c.order} -> missing ${c.content_id}`);
  }
  // quizzes
  for (const rid of item.related_ids || []) {
    if (!exists(rid)) fail(`REF: ${tag} related_id -> missing ${rid}`);
  }
  if (item.quiz_type === "order-events") {
    for (const oid of item.correct_order || []) if (!exists(oid)) fail(`REF: ${tag} correct_order -> missing ${oid}`);
    for (const it of item.items || []) if (!exists(it.event_id)) fail(`REF: ${tag} order item -> missing ${it.event_id}`);
  }
  // maps: steps
  for (const r of item.routes || []) {
    for (const s of r.steps || []) {
      if (s.place_id && !nestedIds.has(s.place_id)) fail(`REF: ${tag} step ${s.order} -> missing place ${s.place_id}`);
      for (const rid of s.related_ids || []) if (!exists(rid)) fail(`REF: ${tag} step ${s.order} -> missing ${rid}`);
    }
  }
  // timeline events: era must exist
  if (item.type === "timeline-event" && item.era && !exists(item.era))
    fail(`REF: ${tag} era -> missing ${item.era}`);
  // maps/stories/family: era(s) must exist
  for (const er of [].concat(item.era || [], item.eras || [])) {
    if (er && !exists(er)) fail(`REF: ${tag} era -> missing ${er}`);
  }
}

// ---- counts ----
const counts = {};
for (const [id, f] of idToFile) {
  const t = f.replace(".json", "");
  counts[t] = (counts[t] || 0) + 1;
}

console.log("=== per-file top-level item counts ===");
for (const f of Object.keys(packs).sort()) {
  const doc = packs[f];
  const items = Array.isArray(doc) ? doc : doc.items;
  console.log(`  ${f}: ${items.length} items (meta.count=${doc.meta?.count ?? "n/a"})`);
}
console.log(`\nTotal unique top-level IDs: ${idToFile.size}`);
console.log(`Total nested IDs (places/routes): ${nestedIds.size}`);

const expected = {
  "eras.json": 7, "timeline-events.json": 90, "maps.json": 10, "evidence.json": 30,
  "books.json": 66, "stories.json": 12, "quizzes.json": 150,
  "daily-facts.json": 365, "family-lessons.json": 8,
};
console.log("\n=== target counts ===");
for (const [f, n] of Object.entries(expected)) {
  const doc = packs[f];
  const got = doc ? (Array.isArray(doc) ? doc.length : doc.items.length) : 0;
  const ok = got === n ? "OK " : "FAIL";
  console.log(`  [${ok}] ${f}: expected ${n}, got ${got}`);
  if (got !== n) fail(`COUNT: ${f} expected ${n}, got ${got}`);
}

if (warnings.length) { console.log(`\nWarnings (${warnings.length}):`); warnings.slice(0, 20).forEach((w) => console.log("  ! " + w)); }
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach((e) => console.log("  X " + e));
  process.exit(1);
} else {
  console.log("\nVALIDATION PASSED: all checks green.");
}
