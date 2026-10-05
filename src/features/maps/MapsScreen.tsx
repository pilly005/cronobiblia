import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Lock,
  Map as MapIcon,
  Pause,
  Play,
  X,
} from "lucide-react";
import { BaseMap } from "./BaseMap";
import {
  CERTAINTY_DESCRIPTION,
  CERTAINTY_LABEL,
  JOURNEY_MAPS,
  findPlace,
  stepCoordinates,
  type JourneyMap,
  type RouteCertainty,
} from "./mapData";
import {
  getContentApi,
  safeList,
  type ContentApi,
} from "@/lib/content-safe";
import { isPremiumActive } from "@/lib/purchases";
import { loadProgress, saveProgress } from "@/lib/local-progress";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * MapsScreen — Track C (default export, zero-arg).
 *
 * Map list + local vector map renderer. All content access goes through the
 * Track B content functions via the defensive content-safe adapter, with the
 * curated local pack as fallback so the maps work fully offline.
 */

function field(item: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

/** Normalizes a content-pack map record into the local JourneyMap shape. */
function normalizeMap(item: any): JourneyMap | null {
  try {
    const id = field(item, "id", "slug");
    const title = field(item, "title", "name");
    if (!id || !title) return null;
    const certaintyRaw = field(item, "certainty").toLowerCase();
    const certainty: RouteCertainty =
      certaintyRaw === "documented"
        ? "documented"
        : certaintyRaw === "debated"
          ? "debated"
          : "reconstructed";
    const path = Array.isArray(item.path ?? item.route)
      ? (item.path ?? item.route).filter(
          (p: any) => Array.isArray(p) && p.length >= 2,
        )
      : [];
    const places = Array.isArray(item.places)
      ? item.places
          .map((p: any) => ({
            id: field(p, "id", "slug") || field(p, "ancient", "name"),
            ancient: field(p, "ancient", "name"),
            modern: field(p, "modern") || undefined,
            x: Number(p.x) || 0,
            y: Number(p.y) || 0,
            note: field(p, "note") || undefined,
          }))
          .filter((p: any) => p.id && p.ancient)
      : [];
    const steps = Array.isArray(item.steps)
      ? item.steps
          .map((s: any) => ({
            placeId: field(s, "placeId", "place_id", "place"),
            title: field(s, "title", "name"),
            narration: field(s, "narration", "text", "description"),
            reference: field(s, "reference") || undefined,
          }))
          .filter((s: any) => s.placeId && s.title && s.narration)
      : [];
    if (path.length === 0 || steps.length === 0) return null;
    return {
      id,
      title,
      subtitle: field(item, "subtitle") || "",
      era: field(item, "era") || "",
      certainty,
      isFree: toBool(item.isFree ?? item.is_free ?? true),
      summary: field(item, "summary", "description"),
      path,
      places,
      steps,
    };
  } catch {
    return null;
  }
}

function CertaintyBadge({ certainty }: { certainty: RouteCertainty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        certainty === "documented" && "bg-evidence/15 text-evidence-deep",
        certainty === "reconstructed" && "bg-gold/15 text-gold-deep",
        certainty === "debated" && "bg-terracotta/15 text-terracotta-deep",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-2 w-6 rounded-full",
          certainty === "documented" && "bg-evidence",
          certainty === "reconstructed" &&
            "bg-gold bg-[repeating-linear-gradient(90deg,transparent,transparent_3px,rgba(255,255,255,0.7)_3px,rgba(255,255,255,0.7)_5px)]",
          certainty === "debated" &&
            "bg-terracotta bg-[radial-gradient(circle,rgba(255,255,255,0.85)_1.6px,transparent_1.8px)] bg-[length:5px_5px]",
        )}
      />
      Ruta {CERTAINTY_LABEL[certainty].toLowerCase()}
    </span>
  );
}

function MapList({
  maps,
  premium,
  premiumUnknown,
  onOpen,
}: {
  maps: JourneyMap[];
  premium: boolean;
  premiumUnknown: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {maps.map((m) => {
        const locked = !m.isFree && !premium;
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpen(m.id)}
              className="tap-target block w-full rounded-2xl bg-parchment p-4 text-left shadow-[0_1px_2px_rgba(23,33,43,0.06)] transition-colors hover:bg-gold/10"
              aria-label={`${m.title}. ${m.subtitle}. Ruta ${CERTAINTY_LABEL[m.certainty].toLowerCase()}.${locked ? " Contenido Premium." : ""}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {m.title}
                    {locked && (
                      <Lock className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink/60">
                    {m.subtitle}
                    {m.era ? ` · ${m.era}` : ""}
                  </span>
                </span>
                {!m.isFree && !premiumUnknown && (
                  <span className="shrink-0 rounded-full bg-gold/20 px-2.5 py-1 text-[11px] font-semibold text-gold-deep">
                    Premium
                  </span>
                )}
              </span>
              <span className="mt-2.5 block">
                <CertaintyBadge certainty={m.certainty} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MapDetail({
  map,
  onBack,
}: {
  map: JourneyMap;
  onBack: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const coords = useMemo(() => stepCoordinates(map), [map]);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [markerPos, setMarkerPos] = useState<[number, number]>(coords[0] ?? [0, 0]);
  const [visitedCount, setVisitedCount] = useState(1);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef<[number, number]>(coords[0] ?? [0, 0]);

  const lastIndex = map.steps.length - 1;

  // Animate the traveler marker toward the current step (instant when reduced motion).
  useEffect(() => {
    const target = coords[stepIndex] ?? coords[0];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (reducedMotion || !target) {
      posRef.current = target ?? [0, 0];
      setMarkerPos(posRef.current);
      return;
    }
    const from = posRef.current;
    const to = target;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const p: [number, number] = [
        from[0] + (to[0] - from[0]) * eased,
        from[1] + (to[1] - from[1]) * eased,
      ];
      posRef.current = p;
      setMarkerPos(p);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stepIndex, coords, reducedMotion]);

  // Autoplay: disabled entirely under reduced motion.
  useEffect(() => {
    if (!playing || reducedMotion) return;
    if (stepIndex >= lastIndex) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => Math.min(lastIndex, i + 1)), 4500);
    return () => clearTimeout(t);
  }, [playing, stepIndex, lastIndex, reducedMotion]);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(lastIndex, i));
      setStepIndex(next);
      setVisitedCount((v) => Math.max(v, next + 1));
      setSelectedPlaceId(null);
    },
    [lastIndex],
  );

  // Record completion locally when the last step is reached.
  useEffect(() => {
    if (stepIndex !== lastIndex) return;
    try {
      const p = loadProgress();
      if (!p.completedMaps.includes(map.id)) {
        saveProgress({ ...p, completedMaps: [...p.completedMaps, map.id] });
      }
    } catch {
      /* stay read-only */
    }
  }, [stepIndex, lastIndex, map.id]);

  const step = map.steps[stepIndex];
  const stepPlace = step ? findPlace(map, step.placeId) : undefined;
  const selectedPlace = selectedPlaceId ? findPlace(map, selectedPlaceId) : undefined;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="tap-target inline-flex items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-sea"
        aria-label="Volver a la lista de mapas"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mapas
      </button>

      <header className="mt-2">
        <h1 className="font-display text-3xl">{map.title}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {map.subtitle}
          {map.era ? ` · ${map.era}` : ""}
        </p>
        <div className="mt-3">
          <CertaintyBadge certainty={map.certainty} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink/60">
          {CERTAINTY_DESCRIPTION[map.certainty]}
        </p>
      </header>

      <div className="mt-4">
        <BaseMap
          route={map}
          visitedCount={visitedCount}
          markerPos={markerPos}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onSelectStep={goTo}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Playback controls */}
      <div
        className="mt-4 flex items-center justify-between gap-2"
        role="group"
        aria-label="Controles de la ruta"
      >
        <button
          type="button"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
          className="tap-target inline-flex items-center gap-1 rounded-xl bg-parchment px-4 text-sm font-semibold text-ink disabled:opacity-40"
          aria-label="Paso anterior"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          Anterior
        </button>

        {!reducedMotion && (
          <button
            type="button"
            onClick={() => {
              if (stepIndex >= lastIndex) {
                goTo(0);
                setPlaying(true);
              } else {
                setPlaying((p) => !p);
              }
            }}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory"
            aria-label={playing ? "Pausar el recorrido" : stepIndex >= lastIndex ? "Repetir el recorrido" : "Reproducir el recorrido"}
            aria-pressed={playing}
          >
            {playing ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="h-5 w-5" aria-hidden="true" />
            )}
            {playing ? "Pausar" : stepIndex >= lastIndex ? "Repetir" : "Reproducir"}
          </button>
        )}

        <button
          type="button"
          onClick={() => goTo(stepIndex + 1)}
          disabled={stepIndex >= lastIndex}
          className="tap-target inline-flex items-center gap-1 rounded-xl bg-parchment px-4 text-sm font-semibold text-ink disabled:opacity-40"
          aria-label="Paso siguiente"
        >
          Siguiente
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-ink/55" role="status" aria-live="polite">
        Paso {stepIndex + 1} de {map.steps.length}: {step?.title}
        {reducedMotion && " (movimiento reducido: avanza paso a paso)"}
      </p>

      {/* Current step narration */}
      {step && (
        <article aria-labelledby="step-title" className="mt-4 rounded-2xl bg-ink p-5 text-ivory">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Paso {stepIndex + 1}
            {stepPlace ? ` · ${stepPlace.ancient}` : ""}
          </p>
          <h2 id="step-title" className="mt-1 font-display text-2xl">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ivory/85">{step.narration}</p>
          {step.reference && (
            <p className="mt-3 text-xs font-medium text-gold">{step.reference}</p>
          )}
        </article>
      )}

      {/* Place card */}
      {selectedPlace && (
        <article
          aria-labelledby="place-title"
          className="mt-4 rounded-2xl border border-sea/25 bg-sea/8 p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="place-title" className="font-display text-xl">
              {selectedPlace.ancient}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedPlaceId(null)}
              className="tap-target -mr-2 -mt-2 flex items-center justify-center rounded-xl px-2 text-ink/60"
              aria-label={`Cerrar la tarjeta de ${selectedPlace.ancient}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {selectedPlace.modern && (
            <p className="mt-1 text-sm font-medium text-sea-deep">
              Hoy: {selectedPlace.modern}
            </p>
          )}
          {selectedPlace.note && (
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{selectedPlace.note}</p>
          )}
        </article>
      )}

      {/* Text alternative toggle */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowText((s) => !s)}
          aria-expanded={showText}
          aria-controls="route-text-version"
          className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink/15 bg-parchment px-4 text-sm font-semibold text-ink"
        >
          <List className="h-5 w-5 text-terracotta" aria-hidden="true" />
          {showText ? "Ocultar versión texto" : "Versión texto de la ruta"}
        </button>

        {/* Screen-reader step list: always in the DOM as the route's text alternative. */}
        <ol className="sr-only" aria-label={`Pasos de la ruta: ${map.title}`}>
          {map.steps.map((s, i) => {
            const p = findPlace(map, s.placeId);
            return (
              <li key={i}>
                Paso {i + 1}: {s.title}
                {p ? ` (${p.ancient}${p.modern ? `, hoy ${p.modern}` : ""})` : ""}.{" "}
                {s.narration}
                {s.reference ? ` Referencia: ${s.reference}.` : ""}
              </li>
            );
          })}
        </ol>

        {showText && (
          <div
            id="route-text-version"
            className="mt-3 rounded-2xl border border-ink/10 bg-parchment p-5"
          >
            <h2 className="font-display text-xl">La ruta, paso a paso</h2>
            <p className="mt-1 text-xs text-ink/60">
              La misma narración del mapa, en texto. Ruta{" "}
              {CERTAINTY_LABEL[map.certainty].toLowerCase()}:{" "}
              {CERTAINTY_DESCRIPTION[map.certainty]}
            </p>
            <ol className="mt-4 flex flex-col gap-4">
              {map.steps.map((s, i) => {
                const p = findPlace(map, s.placeId);
                return (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-sm font-bold text-ivory"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">
                        {s.title}
                        {p && (
                          <span className="font-normal text-ink/60">
                            {" "}
                            · {p.ancient}
                            {p.modern ? ` (hoy ${p.modern})` : ""}
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink/75">
                        {s.narration}
                      </p>
                      {s.reference && (
                        <p className="mt-1 text-xs font-medium text-terracotta-deep">
                          {s.reference}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {/* Summary */}
      <section aria-labelledby="map-summary" className="mt-6">
        <h2 id="map-summary" className="sr-only">
          Resumen del mapa
        </h2>
        <p className="text-sm leading-relaxed text-ink/70">{map.summary}</p>
      </section>
    </div>
  );
}

function LockedMapNotice({ map, onBack }: { map: JourneyMap; onBack: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 text-center">
      <button
        type="button"
        onClick={onBack}
        className="tap-target mb-6 inline-flex items-center gap-1.5 self-start rounded-xl px-2 text-sm font-medium text-sea"
        aria-label="Volver a la lista de mapas"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mapas
      </button>
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep"
      >
        <Lock className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-display text-2xl">{map.title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/70">
        Este mapa forma parte de CronoBiblia Premium. Los dos primeros mapas
        están incluidos gratis.
      </p>
      <Link
        to="/paywall"
        className="tap-target mt-6 inline-flex items-center justify-center rounded-xl bg-terracotta px-6 text-sm font-semibold text-ivory"
      >
        Ver planes Premium
      </Link>
    </div>
  );
}

export default function MapsScreen() {
  const [api, setApi] = useState<ContentApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [maps, setMaps] = useState<JourneyMap[]>(JOURNEY_MAPS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [premiumUnknown, setPremiumUnknown] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Content only through the Track B named functions, defensive.
      let list: any[] = [];
      try {
        const contentApi = await getContentApi();
        if (!cancelled) setApi(contentApi);
        list = await safeList(contentApi, "getMaps");
      } catch {
        list = [];
      }
      if (cancelled) return;
      const normalized = list
        .map(normalizeMap)
        .filter((m): m is JourneyMap => m !== null);
      if (normalized.length > 0) setMaps(normalized);
      // Premium state: the stub throws until Track D lands — treat as not premium.
      try {
        const p = await isPremiumActive();
        if (!cancelled) {
          setPremium(p);
          setPremiumUnknown(false);
        }
      } catch {
        if (!cancelled) {
          setPremium(false);
          setPremiumUnknown(false);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openMap = maps.find((m) => m.id === openId) ?? null;
  const locked = openMap ? !openMap.isFree && !premium : false;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6">
      {loading ? (
        <div role="status" aria-live="polite" aria-label="Cargando mapas">
          <div className="animate-pulse rounded-2xl bg-ink/5 p-5" aria-hidden="true">
            <div className="h-5 w-1/2 rounded bg-ink/10" />
            <div className="mt-3 h-3 w-full rounded bg-ink/10" />
            <div className="mt-2 h-3 w-5/6 rounded bg-ink/10" />
          </div>
        </div>
      ) : openMap ? (
        locked ? (
          <LockedMapNotice map={openMap} onBack={() => setOpenId(null)} />
        ) : (
          <MapDetail key={openMap.id} map={openMap} onBack={() => setOpenId(null)} />
        )
      ) : (
        <>
          <header>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-terracotta">
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              Mapas
            </p>
            <h1 className="mt-1 font-display text-3xl">Sigue los viajes</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Diez rutas por el Mediterráneo antiguo y el Cercano Oriente, con
              mapas vectoriales propios que funcionan sin conexión. Cada ruta
              indica su nivel de certeza: documentada, reconstruida o debatida.
            </p>
          </header>

          {maps.length === 0 ? (
            <div
              className="mt-8 rounded-2xl bg-parchment p-8 text-center"
              role="status"
            >
              <p className="font-display text-xl">Aún no hay mapas disponibles</p>
              <p className="mt-2 text-sm text-ink/60">
                Vuelve pronto: estamos preparando las rutas de Abraham, el
                éxodo y Pablo.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <MapList
                maps={maps}
                premium={premium}
                premiumUnknown={premiumUnknown}
                onOpen={setOpenId}
              />
            </div>
          )}

          <p className="mt-8 text-center text-xs leading-relaxed text-ink/50">
            Mapas esquemáticos con fines educativos: las costas son
            aproximadas y no se usan fronteras políticas modernas como
            territorios antiguos.
          </p>
        </>
      )}
    </div>
  );
}
