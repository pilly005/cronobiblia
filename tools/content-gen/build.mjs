// Builds all JSON packs into src/content/packs/*.json
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DRAFT } from "./common.mjs";
import { eras } from "./data-eras.mjs";
import { events12 } from "./data-timeline-1.mjs";
import { events34 } from "./data-timeline-2.mjs";
import { events57 } from "./data-timeline-3.mjs";
import { maps } from "./data-maps.mjs";
import { evidence } from "./data-evidence.mjs";
import { books } from "./data-books.mjs";
import { stories } from "./data-stories.mjs";
import { quizzes } from "./gen-quizzes.mjs";
import { dailyFacts } from "./gen-facts.mjs";
import { family } from "./data-family.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const packsDir = join(root, "src", "content", "packs");
mkdirSync(packsDir, { recursive: true });

const packs = {
  eras: { items: eras, notes: "7 eras, ordenadas cronológicamente." },
  "timeline-events": { items: [...events12, ...events34, ...events57], notes: "90 eventos con rangos de fecha, capas texto/historia/interpretación y contexto mundial." },
  maps: { items: maps, notes: "10 mapas con lugares, rutas GeoJSON, certeza por ruta, narración paso a paso y alternativa textual." },
  evidence: { items: evidence, notes: "30 tarjetas de evidencia con 'Qué aporta' y 'Qué no demuestra'." },
  books: { items: books, notes: "66 tarjetas de autoría. V1 usa el canon de 66 libros; la cobertura deuterocanónica queda planificada tras la revisión editorial." },
  stories: { items: stories, notes: "12 recorridos guiados con secuencias de tarjetas y narración." },
  quizzes: { items: quizzes, notes: "150 preguntas: opción múltiple, ordenar eventos e identificar lugares, con explicación." },
  "daily-facts": { items: dailyFacts, notes: "365 datos diarios generados de forma determinista desde el corpus." },
  "family-lessons": { items: family, notes: "8 lecciones familiares: párrafos breves y preguntas para conversar. Sin cuentas de niños." },
};

for (const [name, { items, notes }] of Object.entries(packs)) {
  const doc = {
    meta: {
      pack: name,
      version: 1,
      status: DRAFT,
      generated: "2026-10-03",
      count: items.length,
      notes,
      review: "AI-DRAFT-AWAITING-REVIEW: borrador generado por IA. Requiere revisión histórica, de neutralidad y de estilo antes de publicarse. Nunca presentarlo como verificado.",
    },
    items,
  };
  writeFileSync(join(packsDir, `${name}.json`), JSON.stringify(doc, null, 2) + "\n");
  console.log(`${name}.json: ${items.length} items`);
}
