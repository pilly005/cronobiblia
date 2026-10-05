/**
 * TimelineScreen — interactive timeline (Track B).
 *
 * Horizontal zoom era → event, category filters (relato bíblico, imperios,
 * personajes, arqueología, contexto mundial), uncertainty BANDS for date
 * ranges (never false precision), a compare mode (mundo bíblico vs.
 * contexto y evidencia), event detail cards with sources + certainty
 * labels, and bodies rendered via ContentCard. Premium events route to
 * /paywall. Content comes from the canonical packs through
 * `src/lib/content-model.ts`.
 *
 * Default export; the route wrapper passes no props.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Landmark,
  Lock,
  Minus,
  Plus,
  Search,
  Swords,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  fetchStories,
  fetchTimelineEvents,
  fetchEras,
  type Category,
  type Confidence,
  type EraModel,
  type TimelineEventModel,
} from "@/lib/content-model";
import { normalizeForSearch } from "@/lib/search";
import {
  refreshBookmarks,
  toggleBookmark,
} from "@/lib/bookmarks";
import { useSupabaseSession } from "@/lib/auth";
import { usePremium } from "@/lib/premium";
import { ContentCard } from "@/content-renderer/ContentCard";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<Category, string> = {
  relato: "Relato bíblico",
  imperios: "Imperios",
  personajes: "Personajes",
  arqueologia: "Arqueología",
  mundo: "Contexto mundial",
};

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  relato: BookOpen,
  imperios: Swords,
  personajes: Users,
  arqueologia: Landmark,
  mundo: Globe2,
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  alta: "Alta certeza",
  media: "Certeza media",
  baja: "Certeza baja",
  debatida: "Fecha debatida",
};

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  alta: "bg-evidence/15 text-evidence-deep",
  media: "bg-gold/15 text-gold-deep",
  baja: "bg-ink/10 text-ink/70",
  debatida: "bg-terracotta/15 text-terracotta-deep",
};

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} a. C.` : `${year} d. C.`;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const fromClass =
      document.documentElement.classList.contains("reduce-motion");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(fromClass || mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const ALL_MIN = -2200;
const ALL_MAX = 150;

const ALL_CATEGORIES: Category[] = [
  "relato",
  "imperios",
  "personajes",
  "arqueologia",
  "mundo",
];

export default function TimelineScreen() {
  const [events, setEvents] = useState<TimelineEventModel[]>([]);
  const [eras, setEras] = useState<EraModel[]>([]);
  const [storyRefs, setStoryRefs] = useState<Map<string, { id: string; title: string }[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [eraId, setEraId] = useState<string>("todas");
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(ALL_CATEGORIES),
  );
  const [compare, setCompare] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  const { user } = useSupabaseSession();
  const { premium } = usePremium();
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [evs, erList, stories] = await Promise.all([
          fetchTimelineEvents(),
          fetchEras(),
          fetchStories(),
        ]);
        if (cancelled) return;
        setEvents(evs);
        setEras(erList);
        // Index stories by referenced event id (for "seguir explorando").
        const refs = new Map<string, { id: string; title: string }[]>();
        for (const story of stories) {
          for (const card of story.cards) {
            if (card.kind === "event" && card.contentId) {
              const list = refs.get(card.contentId) ?? [];
              list.push({ id: story.id, title: story.title });
              refs.set(card.contentId, list);
            }
          }
        }
        setStoryRefs(refs);
        setBookmarkedIds(await refreshBookmarks(null));
      } catch {
        /* empty state below */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEra = useMemo(
    () => eras.find((e) => e.id === eraId) ?? null,
    [eras, eraId],
  );

  const filtered = useMemo(() => {
    let list = events;
    if (eraId !== "todas") list = list.filter((e) => e.eraId === eraId);
    if (activeCategories.size < ALL_CATEGORIES.length) {
      list = list.filter((e) =>
        e.categories.some((c) => activeCategories.has(c)),
      );
    }
    const q = normalizeForSearch(query.trim());
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((e) => {
        const haystack = normalizeForSearch(
          `${e.title} ${e.summary} ${e.displayDate} ${e.biblicalRefs.join(" ")}`,
        );
        return tokens.every((t) => haystack.includes(t));
      });
    }
    return [...list].sort(
      (a, b) => (a.yearMin + a.yearMax) / 2 - (b.yearMin + b.yearMax) / 2,
    );
  }, [events, eraId, activeCategories, query]);

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  /* Visible window: base range from the era, narrowed by zoom. */
  const [winMin, winMax] = useMemo(() => {
    const baseMin = selectedEra ? selectedEra.yearMin : ALL_MIN;
    const baseMax = selectedEra ? selectedEra.yearMax : ALL_MAX;
    const center = selected
      ? (selected.yearMin + selected.yearMax) / 2
      : (baseMin + baseMax) / 2;
    const width = (baseMax - baseMin) / zoom;
    return [Math.round(center - width / 2), Math.round(center + width / 2)];
  }, [selectedEra, selected, zoom]);

  const ticks = useMemo(() => {
    const span = winMax - winMin;
    const step = span > 1500 ? 500 : span > 700 ? 250 : span > 300 ? 100 : 50;
    const out: number[] = [];
    const first = Math.ceil(winMin / step) * step;
    for (let y = first; y <= winMax; y += step) out.push(y);
    return out;
  }, [winMin, winMax]);

  const toPct = (year: number) =>
    Math.min(100, Math.max(0, ((year - winMin) / (winMax - winMin)) * 100));

  const toggleCategory = (c: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  useEffect(() => {
    if (!selected || !trackRef.current) return;
    const mid = toPct((selected.yearMin + selected.yearMax) / 2);
    trackRef.current.scrollTo({
      left:
        (mid / 100) * trackRef.current.scrollWidth -
        trackRef.current.clientWidth / 2,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, zoom, eraId]);

  const handleToggleBookmark = async (id: string) => {
    const next = await toggleBookmark(user, id);
    setBookmarkedIds((prev) =>
      next ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const isLocked = (e: TimelineEventModel) => e.premium && !premium;

  const relatedFor = (e: TimelineEventModel) => {
    const sameEra = events
      .filter((x) => x.id !== e.id && x.eraId === e.eraId)
      .sort(
        (a, b) =>
          Math.abs((a.yearMin + a.yearMax) / 2 - (e.yearMin + e.yearMax) / 2) -
          Math.abs((b.yearMin + b.yearMax) / 2 - (e.yearMin + e.yearMax) / 2),
      )
      .slice(0, 3);
    return { sameEra, stories: storyRefs.get(e.id) ?? [] };
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Cargando cronología"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-terracotta/30 border-t-terracotta" />
      </div>
    );
  }

  const lanes = compare
    ? [
        {
          title: "Mundo bíblico",
          hint: "Relato y personajes",
          test: (e: TimelineEventModel) =>
            e.categories.some((c) => c === "relato" || c === "personajes"),
        },
        {
          title: "Contexto y evidencia",
          hint: "Imperios, arqueología y mundo",
          test: (e: TimelineEventModel) =>
            e.categories.some((c) =>
              (["imperios", "arqueologia", "mundo"] as Category[]).includes(c),
            ),
        },
      ]
    : [{ title: "Cronología", hint: "", test: () => true }];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Cronología
      </h1>
      <p className="mt-1 text-sm text-ink/65">
        Entiende cuándo ocurrió y qué pasaba alrededor. Las fechas en debate se
        muestran como rangos, nunca como un año exacto.
      </p>

      {/* Search */}
      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar eventos, lugares, personas…"
          aria-label="Buscar en la cronología (ignora acentos)"
          className="tap-target w-full rounded-xl bg-parchment pl-10 pr-10 text-base text-ink ring-1 ring-ink/15 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-terracotta"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="tap-target absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg text-ink/50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Era chips */}
      <div
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Filtrar por época"
      >
        {[
          { id: "todas", title: "Toda la historia", premium: false },
          ...eras,
        ].map((era) => {
          const locked = era.premium && !premium;
          const active = eraId === era.id;
          return (
            <button
              key={era.id}
              type="button"
              onClick={() => {
                setEraId(era.id);
                setZoom(1);
                setSelectedId(null);
              }}
              aria-pressed={active}
              aria-label={`${era.title}${locked ? " (contenido premium)" : ""}`}
              className={cn(
                "tap-target flex shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 transition-colors",
                active
                  ? "bg-ink text-ivory ring-ink"
                  : "bg-parchment text-ink/75 ring-ink/15 hover:bg-ink/5",
              )}
            >
              {locked ? (
                <Lock className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {era.title}
            </button>
          );
        })}
      </div>

      {selectedEra?.premium && !premium ? (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="flex items-start gap-2 text-sm text-ink/85">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <span>
              <strong>«{selectedEra.title}» es contenido premium.</strong>{" "}
              Desbloquea todas las épocas, mapas y cuestionarios con CronoBiblia
              Premium.
            </span>
          </p>
          <Link
            to="/paywall"
            className="tap-target mt-2 inline-flex items-center justify-center rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory"
          >
            Ver planes
          </Link>
        </div>
      ) : null}

      {/* Category filters */}
      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar por categoría"
      >
        {ALL_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c];
          const active = activeCategories.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              aria-pressed={active}
              className={cn(
                "tap-target flex items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 transition-colors",
                active
                  ? "bg-sea/15 text-sea-deep ring-sea/40"
                  : "bg-parchment text-ink/55 ring-ink/15",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {CATEGORY_LABEL[c]}
            </button>
          );
        })}
      </div>

      {/* View controls */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div role="group" aria-label="Modo de vista" className="flex gap-2">
          <button
            type="button"
            onClick={() => setCompare(false)}
            aria-pressed={!compare}
            className={cn(
              "tap-target rounded-full px-4 text-sm font-medium ring-1",
              !compare
                ? "bg-terracotta text-ivory ring-terracotta"
                : "bg-parchment text-ink/70 ring-ink/15",
            )}
          >
            Cronología
          </button>
          <button
            type="button"
            onClick={() => setCompare(true)}
            aria-pressed={compare}
            className={cn(
              "tap-target rounded-full px-4 text-sm font-medium ring-1",
              compare
                ? "bg-terracotta text-ivory ring-terracotta"
                : "bg-parchment text-ink/70 ring-ink/15",
            )}
          >
            Comparar culturas
          </button>
        </div>
        <div role="group" aria-label="Acercar o alejar" className="flex gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 1))}
            disabled={zoom <= 1}
            aria-label="Alejar"
            className="tap-target flex items-center justify-center rounded-lg bg-parchment ring-1 ring-ink/15 disabled:opacity-40"
          >
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, z + 1))}
            disabled={zoom >= 4}
            aria-label="Acercar"
            className="tap-target flex items-center justify-center rounded-lg bg-parchment ring-1 ring-ink/15 disabled:opacity-40"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Timeline track */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl bg-parchment p-6 text-center ring-1 ring-ink/10">
          <AlertCircle className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
          <p className="mt-2 font-medium text-ink">Sin resultados</p>
          <p className="mt-1 text-sm text-ink/65">
            No hay eventos con estos filtros. Prueba con otra época, categoría o
            búsqueda.
          </p>
        </div>
      ) : (
        <div
          ref={trackRef}
          className="mt-4 overflow-x-auto rounded-2xl bg-parchment p-4 ring-1 ring-ink/10"
          role="region"
          aria-label="Línea del tiempo interactiva"
          tabIndex={0}
        >
          {lanes.map((lane) => {
            const laneEvents = filtered.filter(lane.test);
            if (laneEvents.length === 0) return null;
            return (
              <section key={lane.title} aria-label={lane.title} className="mb-6 last:mb-0">
                {compare ? (
                  <h2 className="mb-2 text-sm font-semibold text-ink">
                    {lane.title}
                    <span className="ml-2 font-normal text-ink/55">{lane.hint}</span>
                  </h2>
                ) : null}
                <div
                  className="relative min-w-[560px]"
                  style={{ height: `${Math.max(120, laneEvents.length * 44 + 40)}px` }}
                >
                  <div
                    className="absolute inset-x-0 top-6 border-t-2 border-ink/25"
                    aria-hidden="true"
                  />
                  {ticks.map((t) => (
                    <div
                      key={t}
                      className="absolute top-6"
                      style={{ left: `${toPct(t)}%` }}
                      aria-hidden="true"
                    >
                      <div className="h-2 w-px bg-ink/40" />
                      <span className="absolute left-1 top-2 whitespace-nowrap text-[10px] text-ink/50">
                        {formatYear(t)}
                      </span>
                    </div>
                  ))}
                  <ul className="absolute inset-x-0 top-10 space-y-1">
                    {laneEvents.map((e) => {
                      const mid = (e.yearMin + e.yearMax) / 2;
                      const locked = isLocked(e);
                      const isPoint = e.yearMin === e.yearMax;
                      const label = `${e.title}, ${e.displayDate}, ${CONFIDENCE_LABEL[e.confidence]}${locked ? ", contenido premium" : ""}`;
                      const bandLeft = toPct(e.yearMin);
                      const bandWidth = isPoint
                        ? 0
                        : Math.max(toPct(e.yearMax) - bandLeft, 3);
                      return (
                        <li key={e.id} className="relative" style={{ height: "40px" }}>
                          {!isPoint ? (
                            <div
                              className={cn(
                                "absolute top-1/2 h-3 -translate-y-1/2 rounded-full",
                                selectedId === e.id
                                  ? "bg-terracotta/50"
                                  : "bg-sea/25",
                              )}
                              style={{
                                left: `${bandLeft}%`,
                                width: `${bandWidth}%`,
                              }}
                              aria-hidden="true"
                              title={`Rango de fecha: ${e.displayDate}`}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (locked) return;
                              setSelectedId(selectedId === e.id ? null : e.id);
                            }}
                            aria-label={label}
                            aria-pressed={selectedId === e.id}
                            className={cn(
                              "tap-target absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1",
                              selectedId === e.id
                                ? "bg-terracotta text-ivory ring-terracotta"
                                : "bg-ivory text-ink/85 ring-ink/20 hover:ring-terracotta/60",
                            )}
                            style={{
                              left: `clamp(0%, ${toPct(mid)}%, calc(100% - 8rem))`,
                              maxWidth: "11rem",
                            }}
                          >
                            {locked ? (
                              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            ) : isPoint ? (
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-terracotta"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="truncate">{e.title}</span>
                          </button>
                          {locked ? (
                            <Link
                              to="/paywall"
                              aria-label={`${e.title}: contenido premium. Abrir planes.`}
                              className="absolute inset-0"
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="sr-only">
                    {laneEvents.length} eventos en esta vista. Las bandas
                    horizontales representan rangos de fecha en debate.
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-ink/55">
        Las bandas horizontales indican rangos de fecha. Un punto marca una
        fecha con alta certeza. Toca un evento para abrir su ficha con fuentes.
      </p>

      {/* Event detail */}
      {selected ? (
        <EventDetail
          event={selected}
          related={relatedFor(selected)}
          bookmarked={bookmarkedIds.includes(selected.id)}
          onToggleBookmark={() => handleToggleBookmark(selected.id)}
          onClose={() => setSelectedId(null)}
          onSelectEvent={setSelectedId}
        />
      ) : null}

      {/* Pager */}
      {filtered.length > 1 && !query ? (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const idx = filtered.findIndex((e) => e.id === selectedId);
              const prev = filtered[(idx - 1 + filtered.length) % filtered.length];
              if (prev && !isLocked(prev)) setSelectedId(prev.id);
            }}
            className="tap-target flex items-center gap-1 rounded-xl bg-parchment px-4 text-sm font-medium ring-1 ring-ink/15"
            aria-label="Evento anterior"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => {
              const idx = filtered.findIndex((e) => e.id === selectedId);
              const next = filtered[(idx + 1) % filtered.length];
              if (next && !isLocked(next)) setSelectedId(next.id);
            }}
            className="tap-target flex items-center gap-1 rounded-xl bg-parchment px-4 text-sm font-medium ring-1 ring-ink/15"
            aria-label="Evento siguiente"
          >
            Siguiente
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EventDetail({
  event,
  related,
  bookmarked,
  onToggleBookmark,
  onClose,
  onSelectEvent,
}: {
  event: TimelineEventModel;
  related: {
    sameEra: TimelineEventModel[];
    stories: { id: string; title: string }[];
  };
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
  onSelectEvent: (id: string) => void;
}) {
  return (
    <section
      aria-label={`Detalle: ${event.title}`}
      className="mt-4 rounded-2xl bg-parchment p-5 ring-1 ring-ink/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">
            {event.displayDate}
          </p>
          <h2 className="font-display text-xl font-semibold text-ink">
            {event.title}
          </h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Quitar de guardados" : "Guardar en favoritos"}
            className="tap-target flex items-center justify-center rounded-lg ring-1 ring-ink/15"
          >
            <Bookmark
              className={cn(
                "h-5 w-5",
                bookmarked ? "fill-gold text-gold-deep" : "text-ink/60",
              )}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="tap-target flex items-center justify-center rounded-lg ring-1 ring-ink/15"
          >
            <X className="h-5 w-5 text-ink/60" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            CONFIDENCE_STYLE[event.confidence],
          )}
        >
          {event.confidence === "alta" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {CONFIDENCE_LABEL[event.confidence]}
        </span>
        {event.categories.map((c) => (
          <span
            key={c}
            className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/70 ring-1 ring-ink/10"
          >
            {CATEGORY_LABEL[c]}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <ContentCard
          item={{
            title: undefined,
            summary: undefined,
            body: event.blocks,
            sources: event.sources,
          }}
        />
      </div>

      {event.biblicalRefs.length > 0 ? (
        <p className="mt-3 text-xs text-ink/60">
          <strong className="font-semibold">Referencias bíblicas:</strong>{" "}
          {event.biblicalRefs.join(" · ")}
        </p>
      ) : null}

      {related.sameEra.length > 0 || related.stories.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/55">
            Seguir explorando
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {related.stories.map((s) => (
              <Link
                key={`story-${s.id}`}
                to="/story/$id"
                params={{ id: s.id }}
                className="tap-target inline-flex items-center rounded-full bg-terracotta/10 px-3 text-sm font-medium text-terracotta-deep ring-1 ring-terracotta/25"
              >
                Recorrido: {s.title}
              </Link>
            ))}
            {related.sameEra.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelectEvent(e.id)}
                className="tap-target inline-flex items-center rounded-full bg-sea/10 px-3 text-sm font-medium text-sea-deep ring-1 ring-sea/25"
                aria-label={`Abrir evento: ${e.title}`}
              >
                {e.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
