import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  CERTAINTY_LABEL,
  stepCoordinates,
  type JourneyMap,
  type RouteCertainty,
} from "./mapData";

/**
 * BaseMap — local vector map renderer (Track C).
 * Hand-built STYLIZED SVG of the ancient Mediterranean / Near East:
 * schematic coastlines, NO modern political borders, no tile libraries, no
 * network requests. Custom pan/zoom (pointer drag, wheel, buttons, keyboard).
 * Routes are drawn as polylines styled by certainty:
 * documented = solid, reconstructed = dashed, debated = dotted.
 *
 * Accessibility: decorative geography is aria-hidden; every place marker is a
 * real keyboard-operable button with a Spanish VoiceOver label; the SVG as a
 * whole is complemented by the full text alternative rendered by MapsScreen.
 */

const VIEW_W = 800;
const VIEW_H = 520;

const WATER = "#cfdde7";
const LAND = "#ece1c8";
const LAND_STROKE = "#c9b98f";
const RIVER = "#2f6f8f";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/** Static stylized geography — schematic, not to scale. */
function Geography() {
  return (
    <g aria-hidden="true">
      {/* water base */}
      <rect x={-2000} y={-2000} width={4800} height={4520} fill={WATER} />

      {/* North landmass: Europe + Anatolia */}
      <path
        d="M -10,-10 H 810 V 92
           C 740,80 700,92 660,88
           C 615,84 595,96 555,92
           C 515,88 500,104 462,104
           C 425,104 408,92 378,96
           C 348,100 334,116 308,112
           C 282,108 268,94 242,100
           C 216,106 202,126 172,122
           C 138,117 118,100 88,106
           C 54,112 20,100 -10,110 Z"
        fill={LAND}
        stroke={LAND_STROKE}
        strokeWidth={2}
      />
      {/* Africa landmass */}
      <path
        d="M -10,196
           C 60,188 122,200 182,214
           C 214,222 228,238 248,248
           C 284,266 344,278 404,290
           C 444,298 474,302 494,306
           L 486,530 L -10,530 Z"
        fill={LAND}
        stroke={LAND_STROKE}
        strokeWidth={2}
      />
      {/* East landmass: Levant + Mesopotamia + Arabia */}
      <path
        d="M 462,104
           C 488,158 494,208 500,254
           C 504,280 500,296 508,308
           C 545,318 585,310 620,328
           C 662,350 695,385 708,428
           C 716,462 708,498 702,530
           L 430,530
           C 438,492 432,452 436,418
           C 440,384 458,364 462,332
           C 466,300 460,250 461,200
           C 461,162 460,130 462,104 Z"
        fill={LAND}
        stroke={LAND_STROKE}
        strokeWidth={2}
      />

      {/* Inland seas drawn over land */}
      <ellipse cx={648} cy={42} rx={52} ry={20} fill={WATER} />
      <ellipse cx={742} cy={42} rx={20} ry={34} fill={WATER} />
      {/* Red Sea */}
      <path
        d="M 470,330 C 462,370 454,410 448,470"
        fill="none"
        stroke={WATER}
        strokeWidth={13}
        strokeLinecap="round"
      />
      {/* Persian Gulf */}
      <path
        d="M 628,348 C 648,378 668,410 688,442"
        fill="none"
        stroke={WATER}
        strokeWidth={15}
        strokeLinecap="round"
      />

      {/* Islands */}
      <ellipse cx={465} cy={193} rx={16} ry={7} fill={LAND} stroke={LAND_STROKE} strokeWidth={1.5} />
      <ellipse cx={388} cy={214} rx={32} ry={7} fill={LAND} stroke={LAND_STROKE} strokeWidth={1.5} />
      <ellipse cx={284} cy={178} rx={13} ry={6} fill={LAND} stroke={LAND_STROKE} strokeWidth={1.5} />
      <circle cx={270} cy={207} r={4.5} fill={LAND} stroke={LAND_STROKE} strokeWidth={1.5} />

      {/* Rivers */}
      <g fill="none" stroke={RIVER} strokeWidth={3} strokeLinecap="round" opacity={0.75}>
        <path d="M 482,308 C 477,340 470,368 463,398 C 458,418 455,432 454,444" />
        <path d="M 548,150 C 565,190 575,230 585,270 C 592,305 610,335 632,358" />
        <path d="M 588,150 C 600,195 610,240 620,285 C 627,318 632,340 638,356" />
      </g>

      {/* Water labels */}
      <g fill="#245a75" opacity={0.75} fontStyle="italic" fontSize={15}>
        <text x={268} y={262}>Mar Mediterráneo</text>
        <text x={392} y={418}>Mar Rojo</text>
        <text x={636} y={420}>Golfo Pérsico</text>
      </g>
      {/* Region labels */}
      <g
        fill="#17212b"
        opacity={0.38}
        fontSize={13}
        letterSpacing={3}
        fontWeight={600}
      >
        <text x={300} y={70}>GRECIA</text>
        <text x={500} y={62}>ANATOLIA</text>
        <text x={590} y={285}>MESOPOTAMIA</text>
        <text x={560} y={470}>ARABIA</text>
        <text x={330} y={400}>EGIPTO</text>
      </g>
    </g>
  );
}

function certaintyStroke(certainty: RouteCertainty): {
  dash: string | undefined;
  linecap: "round" | "butt";
  width: number;
} {
  switch (certainty) {
    case "documented":
      return { dash: undefined, linecap: "butt", width: 4.5 };
    case "reconstructed":
      return { dash: "12 7", linecap: "butt", width: 4.5 };
    case "debated":
      return { dash: "0.1 10", linecap: "round", width: 6 };
  }
}

export interface BaseMapProps {
  route: JourneyMap;
  /** Steps the user has already visited (0-based count). */
  visitedCount: number;
  /** Animated traveler position in viewBox coords. */
  markerPos: [number, number];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  onSelectStep: (index: number) => void;
  reducedMotion: boolean;
}

export function BaseMap({
  route,
  visitedCount,
  markerPos,
  selectedPlaceId,
  onSelectPlace,
  onSelectStep,
  reducedMotion,
}: BaseMapProps) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);

  const coords = stepCoordinates(route);
  const stroke = certaintyStroke(route.certainty);
  const pathD = route.path.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");

  // Visited portion of the route: polyline through visited step coordinates.
  const visitedD =
    visitedCount > 1
      ? coords
          .slice(0, Math.min(visitedCount, coords.length))
          .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`)
          .join(" ")
      : null;

  const clampView = useCallback((v: { x: number; y: number; k: number }) => {
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
    // Keep some part of the map visible: clamp translation loosely.
    const marginX = VIEW_W * k * 0.6;
    const marginY = VIEW_H * k * 0.6;
    return {
      k,
      x: Math.min(marginX, Math.max(-marginX, v.x)),
      y: Math.min(marginY, Math.max(-marginY, v.y)),
    };
  }, []);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setView((v) => {
        const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
        if (k === v.k) return v;
        if (cx === undefined || cy === undefined) return clampView({ ...v, k });
        // Zoom around (cx, cy) in container pixels.
        const s = k / v.k;
        return clampView({ k, x: cx - (cx - v.x) * s, y: cy - (cy - v.y) * s });
      });
    },
    [clampView],
  );

  const resetView = useCallback(() => setView({ x: 0, y: 0, k: 1 }), []);

  // Reset zoom when the route changes.
  useEffect(() => {
    setView({ x: 0, y: 0, k: 1 });
  }, [route.id]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setView((v) =>
      clampView({ ...v, x: d.x + (e.clientX - d.sx), y: d.y + (e.clientY - d.sy) }),
    );
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 40;
    if (e.key === "ArrowLeft") setView((v) => clampView({ ...v, x: v.x + step }));
    else if (e.key === "ArrowRight") setView((v) => clampView({ ...v, x: v.x - step }));
    else if (e.key === "ArrowUp") setView((v) => clampView({ ...v, y: v.y + step }));
    else if (e.key === "ArrowDown") setView((v) => clampView({ ...v, y: v.y - step }));
    else if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-" || e.key === "_") zoomBy(1 / 1.25);
    else if (e.key === "0") resetView();
    else return;
    e.preventDefault();
  };

  const mapLabel = `Mapa estilizado de ${route.title}. ${CERTAINTY_LABEL[route.certainty]}: ${route.summary} Usa los botones de zoom o arrastra para explorar.`;

  return (
    <div>
      <div
        ref={containerRef}
        role="application"
        aria-label={mapLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="relative aspect-[800/520] w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-ink/10 bg-[#cfdde7] select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-terracotta"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full"
          role="img"
          aria-label={`Mapa: ${route.title}`}
        >
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            <Geography />

            {/* Full route, styled by certainty */}
            <path
              d={pathD}
              fill="none"
              stroke="#b85c38"
              strokeWidth={stroke.width}
              strokeDasharray={stroke.dash}
              strokeLinecap={stroke.linecap}
              opacity={0.85}
              aria-hidden="true"
            />
            {/* Visited portion — solid terracotta overlay (never color-alone: step numbers also mark progress) */}
            {visitedD && (
              <path
                d={visitedD}
                fill="none"
                stroke="#9a4a2c"
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.9}
                aria-hidden="true"
              />
            )}

            {/* Step markers */}
            {coords.map(([x, y], i) => {
              const visited = i < visitedCount;
              return (
                <g key={i}>
                  <circle
                    role="button"
                    tabIndex={0}
                    aria-label={`Paso ${i + 1}: ${route.steps[i]?.title ?? ""}${visited ? "" : " (no visitado)"}`}
                    cx={x}
                    cy={y}
                    r={13 / Math.sqrt(view.k)}
                    fill={visited ? "#9a4a2c" : "#f7f1e5"}
                    stroke="#9a4a2c"
                    strokeWidth={2.5}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStep(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectStep(i);
                      }
                    }}
                  />
                  <text
                    x={x}
                    y={y + 4.5 / Math.sqrt(view.k)}
                    textAnchor="middle"
                    fontSize={13 / Math.sqrt(view.k)}
                    fontWeight={700}
                    fill={visited ? "#f7f1e5" : "#9a4a2c"}
                    pointerEvents="none"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Place markers (route places) */}
            {route.places.map((p) => {
              const isStep = route.steps.some((s) => s.placeId === p.id);
              if (isStep) return null; // step markers already cover these
              const selected = selectedPlaceId === p.id;
              return (
                <g key={p.id}>
                  <circle
                    role="button"
                    tabIndex={0}
                    aria-label={`Lugar: ${p.ancient}${p.modern ? `, ${p.modern}` : ""}`}
                    cx={p.x}
                    cy={p.y}
                    r={selected ? 10 : 7}
                    fill={selected ? "#2f6f8f" : "#f7f1e5"}
                    stroke="#2f6f8f"
                    strokeWidth={2.5}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlace(selected ? null : p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectPlace(selected ? null : p.id);
                      }
                    }}
                  />
                  <text
                    x={p.x}
                    y={p.y - 12}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="#17212b"
                    pointerEvents="none"
                    aria-hidden="true"
                    style={{ paintOrder: "stroke", stroke: "#f7f1e5", strokeWidth: 3 }}
                  >
                    {p.ancient}
                  </text>
                </g>
              );
            })}

            {/* Step place labels */}
            {route.steps.map((s, i) => {
              const p = route.places.find((pl) => pl.id === s.placeId);
              if (!p) return null;
              return (
                <text
                  key={`label-${i}`}
                  x={p.x}
                  y={p.y - 18}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={700}
                  fill="#17212b"
                  pointerEvents="none"
                  aria-hidden="true"
                  style={{ paintOrder: "stroke", stroke: "#f7f1e5", strokeWidth: 3.5 }}
                >
                  {p.ancient}
                </text>
              );
            })}

            {/* Traveler marker (hidden from AT; step list carries the info) */}
            {!reducedMotion && (
              <g aria-hidden="true" pointerEvents="none">
                <circle cx={markerPos[0]} cy={markerPos[1]} r={9} fill="#c49a45" stroke="#17212b" strokeWidth={2} />
                <circle cx={markerPos[0]} cy={markerPos[1]} r={3.5} fill="#17212b" />
              </g>
            )}
          </g>
        </svg>

        {/* Zoom controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => zoomBy(1.3)}
            className="tap-target flex items-center justify-center rounded-xl bg-ivory/95 text-ink shadow-md"
            aria-label="Acercar el mapa"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.3)}
            className="tap-target flex items-center justify-center rounded-xl bg-ivory/95 text-ink shadow-md"
            aria-label="Alejar el mapa"
          >
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="tap-target flex items-center justify-center rounded-xl bg-ivory/95 text-ink shadow-md"
            aria-label="Restablecer la vista del mapa"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Certainty legend — visible, never color-alone */}
      <div
        className="mt-3 flex items-start gap-3 rounded-xl bg-parchment p-3 text-xs leading-relaxed text-ink/75"
        role="note"
        aria-label={`Nivel de certeza de la ruta: ${CERTAINTY_LABEL[route.certainty]}`}
      >
        <svg width={56} height={16} viewBox="0 0 56 16" aria-hidden="true" className="mt-0.5 shrink-0">
          <line
            x1={2}
            y1={8}
            x2={54}
            y2={8}
            stroke="#b85c38"
            strokeWidth={stroke.width}
            strokeDasharray={stroke.dash}
            strokeLinecap={stroke.linecap}
          />
        </svg>
        <p>
          <strong className="text-ink">Ruta {CERTAINTY_LABEL[route.certainty].toLowerCase()}.</strong>{" "}
          {route.certainty === "documented"
            ? "Trazo continuo: lugares y recorrido con respaldo sólido."
            : route.certainty === "reconstructed"
              ? "Trazo discontinuo: reconstrucción probable; algunos tramos son interpretación."
              : "Trazo punteado: existen varias propuestas; esta es una interpretación común."}
        </p>
      </div>
    </div>
  );
}
