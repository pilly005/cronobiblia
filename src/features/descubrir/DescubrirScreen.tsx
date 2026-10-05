import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flame,
  Landmark,
  Map as MapIcon,
  Play,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  getContentApi,
  safeList,
  type ContentApi,
} from "@/lib/content-safe";
import {
  currentStreak,
  loadProgress,
  recordVisit,
  totalCompleted,
} from "@/lib/local-progress";

/** Starter eras from the product spec — shown until Track B content lands. */
const STARTER_ERAS = [
  { id: "origenes", title: "Orígenes y patriarcas", subtitle: "Abraham, Isaac, Jacob, José" },
  { id: "exodo", title: "Éxodo y asentamiento", subtitle: "Cronología y rutas en debate" },
  { id: "monarquia", title: "Monarquía unida", subtitle: "Saúl, David y Salomón" },
  { id: "reinos", title: "Reinos divididos", subtitle: "Israel, Judá y Asiria" },
  { id: "exilio", title: "Exilio y retorno", subtitle: "Babilonia, Persia y el regreso" },
  { id: "jesus", title: "Mundo de Jesús", subtitle: "Roma, Judea y Galilea" },
  { id: "iglesia", title: "Iglesia primitiva", subtitle: "Hechos y los viajes de Pablo" },
];

/**
 * Curated fallback for "Hoy en la historia". Every item states a range or a
 * discovery context — never an exact modern-calendar date where none exists.
 */
const DAILY_FACTS = [
  {
    tag: "Arqueología",
    title: "La estela de Tel Dan",
    text: "Descubierta en 1993, contiene la referencia extrabíblica más antigua conocida a la «casa de David» (siglo IX a. C.).",
  },
  {
    tag: "Historia",
    title: "Ciro el Grande y el retorno",
    text: "El Cilindro de Ciro (539 a. C.) ilustra la política persa que permitió el regreso del exilio a Judá.",
  },
  {
    tag: "Arqueología",
    title: "Los rollos del Mar Muerto",
    text: "Copiados entre los siglos III a. C. y I d. C. en Qumrán; algunos textos son unos mil años más antiguos que las copias medievales.",
  },
  {
    tag: "Historia",
    title: "Herodes el Grande",
    text: "Rey de Judea bajo Roma (aprox. 37–4 a. C.); reconstruyó el Segundo Templo a una escala monumental.",
  },
  {
    tag: "Arqueología",
    title: "La piedra de Pilato",
    text: "Hallada en Cesarea Marítima en 1961, esta inscripción confirma al prefecto mencionado en los evangelios.",
  },
  {
    tag: "Historia",
    title: "La caída de Nínive",
    text: "En 612 a. C. cayó la capital asiria, marcando el fin del imperio que había conquistado el reino del norte.",
  },
  {
    tag: "Texto",
    title: "El fragmento más antiguo del Nuevo Testamento",
    text: "El papiro 𝔓52, con parte del Evangelio de Juan, se data en la primera mitad del siglo II: acerca las copias a la época de los hechos.",
  },
];

function pickDailyFact() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / 86_400_000,
  );
  return DAILY_FACTS[dayOfYear % DAILY_FACTS.length];
}

function field(item: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Icon className="h-5 w-5 text-terracotta" aria-hidden="true" />
        {title}
      </h2>
      {action && (
        <Link
          to={action.to}
          className="tap-target inline-flex items-center gap-1 rounded-lg px-2 text-sm font-medium text-sea"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl bg-ink/5 p-5"
    >
      <div className="h-4 w-2/3 rounded bg-ink/10" />
      <div className="mt-3 h-3 w-full rounded bg-ink/10" />
      <div className="mt-2 h-3 w-5/6 rounded bg-ink/10" />
    </div>
  );
}

/**
 * Descubrir — home tab (Track A).
 * Continue story · Hoy en la historia · recommendations · progress + streak.
 * All content calls are defensive: when Track B/C modules aren't bundled yet,
 * curated Spanish fallbacks keep every section useful.
 */
export default function DescubrirScreen() {
  const [api, setApi] = useState<ContentApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [eras, setEras] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [dailyFacts, setDailyFacts] = useState<any[]>([]);
  const [progress, setProgress] = useState(() => recordVisit());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const contentApi = await getContentApi();
      if (cancelled) return;
      setApi(contentApi);
      const [e, s, f] = await Promise.all([
        safeList(contentApi, "getEras"),
        safeList(contentApi, "getStories"),
        safeList(contentApi, "getDailyFacts"),
      ]);
      if (cancelled) return;
      setEras(e);
      setStories(s);
      setDailyFacts(f);
      setProgress(loadProgress());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const streak = currentStreak(progress);
  const completed = totalCompleted(progress);
  const hasCurrent = Boolean(progress.currentStoryId);
  const starterStory = stories[0];
  const fact = dailyFacts[0];
  const factTitle = fact ? field(fact, "title", "name") : pickDailyFact().title;
  const factText = fact
    ? field(fact, "summary", "text", "description")
    : pickDailyFact().text;
  const factTag = fact ? field(fact, "tag", "category", "type") : pickDailyFact().tag;
  const recommendedEras = eras.length > 0 ? eras.slice(0, 7) : STARTER_ERAS;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">
            CronoBiblia
          </p>
          <h1 className="mt-1 font-display text-3xl">Descubrir</h1>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-2"
          role="status"
          aria-label={`Racha de ${streak} ${streak === 1 ? "día" : "días"}`}
        >
          <Flame
            className="h-4 w-4 text-gold-deep"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-ink">
            {streak} {streak === 1 ? "día" : "días"}
          </span>
        </div>
      </header>

      {/* Continue story */}
      <section aria-labelledby="continue-heading" className="mt-6">
        <h2 id="continue-heading" className="sr-only">
          Continuar
        </h2>
        {loading ? (
          <SkeletonCard />
        ) : hasCurrent ? (
          <Link
            to="/story/$id"
            params={{ id: progress.currentStoryId! }}
            className="tap-target group block rounded-2xl bg-ink p-5 text-ivory transition-transform"
            aria-label={`Continuar: ${progress.currentStoryTitle ?? "tu recorrido"}`}
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
              <Play className="h-4 w-4" aria-hidden="true" />
              Continúa tu recorrido
            </p>
            <p className="mt-2 font-display text-2xl leading-snug">
              {progress.currentStoryTitle ?? "Tu recorrido en curso"}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ivory/80 group-hover:text-ivory">
              Seguir donde quedaste
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        ) : (
          <Link
            to={starterStory ? "/story/$id" : "/tabs/aprende"}
            params={starterStory ? { id: field(starterStory, "id", "slug") || "inicio" } : undefined}
            className="tap-target group block rounded-2xl bg-terracotta p-5 text-ivory"
            aria-label="Comenzar tu primer recorrido"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ivory/85">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Empieza aquí
            </p>
            <p className="mt-2 font-display text-2xl leading-snug">
              {starterStory
                ? field(starterStory, "title", "name") || "Tu primer recorrido"
                : "Tu primer recorrido de 5 minutos"}
            </p>
            <p className="mt-1 text-sm text-ivory/80">
              Una historia visual corta para conocer cómo funciona CronoBiblia.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold group-hover:underline">
              Comenzar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        )}
      </section>

      {/* Hoy en la historia */}
      <section aria-labelledby="today-heading" className="mt-8">
        <SectionTitle
          icon={CalendarDays}
          title="Hoy en la historia"
        />
        {loading ? (
          <SkeletonCard />
        ) : (
          <article className="rounded-2xl border border-sea/25 bg-sea/8 p-5">
            <p className="inline-block rounded-full bg-sea/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sea">
              {factTag || "Dato del día"}
            </p>
            <h3 className="mt-2 font-display text-xl">{factTitle}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
              {factText}
            </p>
          </article>
        )}
      </section>

      {/* Recommendations */}
      <section aria-labelledby="eras-heading" className="mt-8">
        <SectionTitle
          icon={BookOpen}
          title="Explora por época"
          action={{ to: "/tabs/cronologia", label: "Ver cronología" }}
        />
        {loading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <SkeletonCard />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recommendedEras.map((era: any, i: number) => {
              const id = field(era, "id", "slug") || `era-${i}`;
              const title = field(era, "title", "name") || era.title;
              const subtitle =
                field(era, "subtitle", "description", "summary") || era.subtitle;
              return (
                <li key={id}>
                  <Link
                    to="/tabs/cronologia"
                    className="tap-target flex items-center justify-between gap-3 rounded-2xl bg-parchment px-4 py-3 shadow-[0_1px_2px_rgba(23,33,43,0.06)] transition-colors hover:bg-gold/10"
                  >
                    <span>
                      <span className="block text-base font-semibold">
                        {title}
                      </span>
                      {subtitle && (
                        <span className="block text-xs text-ink/60">
                          {subtitle}
                        </span>
                      )}
                    </span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-terracotta"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* More paths */}
      <section aria-labelledby="more-heading" className="mt-8">
        <h2 id="more-heading" className="sr-only">
          Más formas de explorar
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/tabs/mapas"
            className="tap-target flex flex-col gap-2 rounded-2xl bg-parchment p-4 shadow-[0_1px_2px_rgba(23,33,43,0.06)] transition-colors hover:bg-sea/8"
          >
            <MapIcon className="h-6 w-6 text-sea" aria-hidden="true" />
            <span className="text-sm font-semibold">Seguir un viaje</span>
            <span className="text-xs text-ink/60">
              Rutas animadas paso a paso
            </span>
          </Link>
          <Link
            to="/tabs/aprende"
            className="tap-target flex flex-col gap-2 rounded-2xl bg-parchment p-4 shadow-[0_1px_2px_rgba(23,33,43,0.06)] transition-colors hover:bg-evidence/8"
          >
            <Landmark className="h-6 w-6 text-evidence" aria-hidden="true" />
            <span className="text-sm font-semibold">Probar lo aprendido</span>
            <span className="text-xs text-ink/60">
              Cuestionarios con explicación
            </span>
          </Link>
        </div>
      </section>

      {/* Progress summary */}
      <section aria-labelledby="progress-heading" className="mt-8">
        <SectionTitle icon={Trophy} title="Tu progreso" />
        <div className="rounded-2xl bg-ink p-5 text-ivory">
          <div className="flex items-center gap-6">
            <div>
              <p className="font-display text-4xl">{completed}</p>
              <p className="text-xs text-ivory/70">
                {completed === 1 ? "lección completada" : "lecciones completadas"}
              </p>
            </div>
            <div className="h-12 w-px bg-ivory/15" aria-hidden="true" />
            <div>
              <p className="font-display text-4xl">{streak}</p>
              <p className="text-xs text-ivory/70">
                {streak === 1 ? "día de racha" : "días de racha"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ivory/80">
            {completed === 0
              ? "Cada día cuenta: completa tu primer recorrido y empieza tu racha."
              : streak > 0
                ? "¡Buen ritmo! Unos minutos al día bastan para avanzar."
                : "Retoma cuando quieras: tu progreso te espera aquí."}
          </p>
        </div>
      </section>

      {/* Editorial promise */}
      <p className="mt-8 text-center text-xs leading-relaxed text-ink/50">
        Historia antes que opinión: separamos lo que dice el texto, lo que
        indica la evidencia y lo que es interpretación.
      </p>
    </div>
  );
}
