# CronoBiblia — Paquete de contenido de lanzamiento (Track E)

> **ESTADO: BORRADOR GENERADO POR IA — PENDIENTE DE REVISIÓN**
> Todo el contenido de `packs/*.json` tiene `status: "DRAFT-AWAITING-REVIEW"`.
> **Nunca debe presentarse como verificado ni publicarse sin pasar por el flujo editorial.**
> Solo los registros con `status: "APPROVED"` (tras revisión humana) son legibles por la app pública.

Generado el 2026-10-03 con `tools/content-gen/` (compiladores deterministas; semilla fija).
Regenerar con: `node tools/content-gen/build.mjs` · Validar con: `node tools/content-gen/validate.mjs`

## Contenido por archivo

| Archivo | Ítems | Clave de IDs |
|---|---|---|
| `eras.json` | 7 | `era-01`…`era-07` |
| `timeline-events.json` | 90 | `evt-001`…`evt-090` |
| `maps.json` | 10 | `map-01`…`map-10` |
| `evidence.json` | 30 | `evid-001`…`evid-030` |
| `books.json` | 66 | `book-001`…`book-066` |
| `stories.json` | 12 | `story-01`…`story-12` |
| `quizzes.json` | 150 | `quiz-001`…`quiz-150` |
| `daily-facts.json` | 365 | `fact-001`…`fact-365` |
| `family-lessons.json` | 8 | `fam-01`…`fam-08` |

IDs de lugares y rutas anidados en mapas: `map-NN-pl-<lugar>`, `map-NN-rt-<ruta>` (únicos globalmente).

## Esquema

Cada archivo es `{ "meta": {...}, "items": [...] }`. Campos comunes a **todo** ítem:

| Campo | Reglas |
|---|---|
| `id` | Estable y único en todo el corpus |
| `version` | `1` (incrementar en cada revisión editorial) |
| `status` | `DRAFT-AWAITING-REVIEW` hasta aprobación humana |
| `title` | Título en español, redactado de forma nativa |
| `certainty` | `consensus` / `disputed` / `traditional` |
| `confidence` | `high` / `medium` / `low` / `disputed` |
| `sources` | ≥1 fuente, **a nivel institución/obra** (p. ej. `Museo de Israel`, `Israel Antiquities Authority`, `Anchor Yale Bible Dictionary`). Sin títulos de artículos inventados ni URLs |
| `tier` | `free` / `premium` (según la tabla de alcance de la spec §3) |
| `image_rights` | `original-illustration-needed` (sin fotos con derechos enlazadas) |

Campos por tipo:

- **timeline-event**: `summary`, `era`, `year_min`/`year_max` (negativo = a. C.; **rangos** en fechas debatidas), `date_label`, `figures[]`, `scripture_refs[]`, `quote?` (`{text, ref}`, solo Reina-Valera 1909, 1–2 versículos), `world_context` ("meanwhile in the world"), `layers: {texto, historia, interpretacion}`, `facets[]` (`narrativa-biblica`, `imperio`, `persona`, `arqueologia`, `mundo`).
- **map**: `places[]` (`{id, ancient_name, modern_name, coords:[lon,lat], description}`), `routes[]` (`{id, name, certainty: documented|reconstructed|debated, polyline:[[lon,lat]…], steps:[{order, place_id, text, related_ids}]}`), `text_alternative` (descripción completa para lector de pantalla).
- **evidence**: `category` (`artifact`/`inscription`/`site`), `discovery`, `dating`, `present_location`, `contributes` ("Qué aporta"), `does_not_prove` ("Qué no demuestra"), `related_ids[]`.
- **book**: `testament` (`AT`/`NT`), `section`, `summary`, `traditional_attribution` ("La tradición…"), `date_label`, `scholarly_note` (etiquetada), `related_ids[]`.
- **story**: `eras[]`, `duration_minutes`, `cards[]` (`{order, kind: event|map|evidence|quiz|text, content_id, narration}`).
- **quiz**: `quiz_type` (`multiple-choice`/`order-events`/`identify-place`), `prompt`, `options[]`/`correct_option_id` o `items[]`/`correct_order`, `explanation` (siempre en español), `related_ids[]`.
- **daily-fact**: `day` (1–365), `text`, `related_id`.
- **family-lesson**: `paragraphs[]` (breves), `read_together[]` (preguntas para conversar), `related_ids[]`. Sin cuentas de niños ni datos de menores (spec §6).

## Lenguaje de neutralidad (obligatorio)

- `El texto bíblico presenta…` · `La evidencia externa indica…` · `La fecha es debatida…`
- `Una interpretación común…` · `No existe consenso…`
- Prohibido: "prueba la Biblia", fechas o rutas disputadas presentadas como ciertas.

## Política de citas bíblicas

- Solo Reina-Valera 1909 (dominio público), citas **breves** (1–2 versículos) para orientar, nunca capítulos completos.
- Nunca copiar texto de Bible.com ni de otra app. Antes de publicar, verificar las citas contra el archivo digital licenciado de RVR09.

## Nota sobre el canon (books.json)

V1 usa el canon de 66 libros. La cobertura deuterocanónica queda planificada para después de la revisión editorial; la ficha debe explicarlo con neutralidad cuando la app la muestre.

## Flujo de revisión editorial

```
idea → borrador IA (ESTE PAQUETE) → verificación de fuentes →
revisión histórica → revisión de neutralidad → corrección de estilo →
APPROVED → publicado
```

Criterios de aprobación por ítem: fechas como rangos donde hay debate; certeza de rutas documentada; fuentes reales y comprobables; español nativo; citas RVR09 verificadas; derechos de imagen resueltos (ilustración original o licencia verificada).

## Loader

`src/lib/content.ts` expone `getTimelineEvents, getEras, getMaps, getEvidence, getBooks, getQuizzes, getDailyFacts, getStories, getFamilyLessons, getContentById` — todas `() => Promise<any[]>`, con `try/catch` interno; resuelven `[]` (o `null` para `getContentById`) ante cualquier fallo. La app accede a través de `src/lib/content-safe.ts`.
