/**
 * ContentCard — safe renderer for spec §10 structured content blocks (Track B).
 *
 * Named export (resolved by Track A's lazy-feature `getContentCard()`).
 * Renders: paragraph, heading, callout, scripture, image, timeline_comparison,
 * map_step, evidence_claim, quiz_checkpoint.
 *
 * Safety: every block renders as React text nodes — never raw HTML injection.
 * Accessibility: text alternatives for images, labeled confidence states,
 * quiz checkpoints as real buttons.
 */

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitCompareArrows,
  Image as ImageIcon,
  Info,
  Landmark,
  MapPin,
  ScrollText,
  XCircle,
} from "lucide-react";
import type { Block } from "@/lib/content-model";
import { cn } from "@/lib/utils";

const TONE_LABEL: Record<string, string> = {
  texto: "El texto bíblico presenta…",
  historia: "La evidencia externa indica…",
  interpretacion: "Una interpretación común…",
};

const TONE_STYLES: Record<string, string> = {
  texto: "border-l-gold bg-gold/10",
  historia: "border-l-sea bg-sea/10",
  interpretacion: "border-l-terracotta bg-terracotta/10",
};

function Paragraph({ block }: { block: Block }) {
  if (!block.text) return null;
  return <p className="text-base leading-relaxed text-ink/90">{block.text}</p>;
}

function Heading({ block }: { block: Block }) {
  if (!block.text) return null;
  if (block.level === 3) {
    return (
      <h3 className="font-display text-lg font-semibold text-ink">{block.text}</h3>
    );
  }
  return (
    <h2 className="font-display text-xl font-semibold text-ink">{block.text}</h2>
  );
}

function Callout({ block }: { block: Block }) {
  if (!block.text) return null;
  const tone = block.tone ?? "interpretacion";
  return (
    <aside
      className={cn("rounded-r-xl border-l-4 px-4 py-3", TONE_STYLES[tone])}
      aria-label={TONE_LABEL[tone]}
    >
      <p className="flex items-start gap-2 text-sm leading-relaxed text-ink/90">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">{TONE_LABEL[tone]} </strong>
          {block.text}
        </span>
      </p>
    </aside>
  );
}

function Scripture({ block }: { block: Block }) {
  if (!block.text && !block.reference) return null;
  return (
    <figure className="rounded-xl bg-parchment px-4 py-3 ring-1 ring-ink/10">
      <ScrollText className="h-5 w-5 text-gold-deep" aria-hidden="true" />
      {block.text ? (
        <blockquote className="mt-2 font-display text-base italic leading-relaxed text-ink/90">
          {block.text}
        </blockquote>
      ) : null}
      {block.reference ? (
        <figcaption className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
          {block.reference} · Reina-Valera 1909
        </figcaption>
      ) : null}
    </figure>
  );
}

function ImageBlock({ block }: { block: Block }) {
  if (!block.src) {
    return (
      <figure
        className="flex items-center gap-3 rounded-xl bg-ink/5 px-4 py-4"
        role="img"
        aria-label={block.alt ?? "Ilustración pendiente de publicación"}
      >
        <ImageIcon className="h-8 w-8 shrink-0 text-ink/40" aria-hidden="true" />
        <figcaption className="text-sm text-ink/60">
          {block.alt ?? "Ilustración pendiente de publicación."}
          {block.attribution ? (
            <span className="mt-1 block text-xs">
              Derechos: {block.attribution}
              {block.license ? ` · ${block.license}` : ""}
            </span>
          ) : null}
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-xl ring-1 ring-ink/10">
      <img
        src={block.src}
        alt={block.alt ?? ""}
        className="w-full object-cover"
        loading="lazy"
      />
      <figcaption className="bg-parchment px-4 py-2 text-xs text-ink/60">
        {block.alt}
        {block.attribution ? (
          <span className="mt-0.5 block">
            Derechos: {block.attribution}
            {block.license ? ` · ${block.license}` : ""}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} a. C.` : `${year} d. C.`;
}

function TimelineComparison({ block }: { block: Block }) {
  const rows = block.rows ?? [];
  if (rows.length === 0) return null;
  const biblico = rows.filter((r) => r.side === "biblico");
  const mundial = rows.filter((r) => r.side === "mundial");
  const lane = (
    title: string,
    items: typeof rows,
    badgeClass: string,
  ) => (
    <div className="flex-1 rounded-xl bg-parchment p-3 ring-1 ring-ink/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((row, i) => (
          <li key={`${row.label}-${i}`} className="text-sm text-ink/90">
            <span
              className={cn(
                "mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                badgeClass,
              )}
            >
              {row.yearMin === row.yearMax
                ? formatYear(row.yearMin)
                : `${formatYear(row.yearMin)} – ${formatYear(row.yearMax)}`}
            </span>
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div
      className="rounded-xl bg-ink/5 p-3"
      aria-label="Comparación cronológica: mundo bíblico y contexto mundial"
    >
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
        Comparación cronológica
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {lane("Mundo bíblico", biblico, "bg-terracotta/15 text-terracotta-deep")}
        {lane("Contexto mundial", mundial, "bg-sea/15 text-sea-deep")}
      </div>
    </div>
  );
}

function MapStep({ block }: { block: Block }) {
  if (!block.place && !block.text) return null;
  return (
    <div className="flex gap-3 rounded-xl bg-parchment px-4 py-3 ring-1 ring-ink/10">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sea/15 text-sm font-bold text-sea-deep"
        aria-hidden="true"
      >
        {block.step ?? "·"}
      </span>
      <div>
        {block.place ? (
          <p className="flex items-center gap-1 text-sm font-semibold text-ink">
            <MapPin className="h-4 w-4 text-terracotta" aria-hidden="true" />
            {block.place}
          </p>
        ) : null}
        {block.text ? (
          <p className="mt-1 text-sm leading-relaxed text-ink/80">{block.text}</p>
        ) : null}
      </div>
    </div>
  );
}

function EvidenceClaim({ block }: { block: Block }) {
  if (!block.claim) return null;
  return (
    <section
      className="rounded-xl bg-evidence/10 p-4 ring-1 ring-evidence/25"
      aria-label="Análisis de la evidencia"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-evidence-deep">
        <Landmark className="h-4 w-4" aria-hidden="true" />
        {block.claim}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-parchment p-3 ring-1 ring-ink/10">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-evidence-deep">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Qué aporta
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/85">
            {block.aporta ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-parchment p-3 ring-1 ring-ink/10">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink/60">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Qué no demuestra
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/85">
            {block.noDemuestra ?? "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

function QuizCheckpoint({ block }: { block: Block }) {
  if (!block.quizId) return null;
  return (
    <Link
      to="/quiz/$id"
      params={{ id: block.quizId }}
      className="tap-target flex items-center justify-between gap-3 rounded-xl bg-terracotta px-4 text-ivory"
      aria-label={`Abrir cuestionario: ${block.text ?? "pon a prueba lo aprendido"}`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
        {block.text ?? "Pon a prueba lo aprendido"}
      </span>
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

function renderBlock(block: Block, index: number) {
  const key = `${block.type}-${index}`;
  switch (block.type) {
    case "paragraph":
      return <Paragraph key={key} block={block} />;
    case "heading":
      return <Heading key={key} block={block} />;
    case "callout":
      return <Callout key={key} block={block} />;
    case "scripture":
      return <Scripture key={key} block={block} />;
    case "image":
      return <ImageBlock key={key} block={block} />;
    case "timeline_comparison":
      return <TimelineComparison key={key} block={block} />;
    case "map_step":
      return <MapStep key={key} block={block} />;
    case "evidence_claim":
      return <EvidenceClaim key={key} block={block} />;
    case "quiz_checkpoint":
      return <QuizCheckpoint key={key} block={block} />;
    default:
      return null;
  }
}

/**
 * Named export. Renders a content item's structured blocks safely.
 * Items without blocks degrade to title + summary (+ sources if present).
 */
export function ContentCard({ item }: { item: any }) {
  if (!item) return null;
  const blocks: Block[] = Array.isArray(item?.body) ? item.body : [];
  const sources: Array<{ title?: string; detail?: string }> = Array.isArray(
    item?.sources,
  )
    ? item.sources
    : [];

  return (
    <article className="space-y-4" aria-label={item?.title ?? "Contenido"}>
      {item?.title ? (
        <h1 className="font-display text-2xl font-semibold text-ink">
          {item.title}
        </h1>
      ) : null}
      {item?.summary && blocks.length === 0 ? (
        <p className="text-base leading-relaxed text-ink/85">{item.summary}</p>
      ) : null}
      {blocks.map((block, index) => renderBlock(block, index))}
      {sources.length > 0 ? (
        <section aria-label="Fuentes" className="rounded-xl bg-ink/5 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            Fuentes
          </h2>
          <ul className="mt-2 space-y-1.5">
            {sources.map((source, i) => (
              <li key={i} className="text-sm text-ink/80">
                <span className="font-medium">{source.title}</span>
                {source.detail ? (
                  <span className="text-ink/60"> · {source.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export default ContentCard;
