/**
 * AprendeScreen — the "Aprende" tab (Track B).
 *
 * Story list, quiz list, era-mastery summary, review queue, family lessons
 * and the daily fact. Premium items route to /paywall. Completion and
 * mastery come from the local progress log (mirrored to Supabase for
 * signed-in users). Content comes from the canonical packs through
 * `src/lib/content-model.ts`.
 *
 * Default export; the route wrapper passes no props.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Lock,
  Play,
  RefreshCcw,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  fetchDailyFacts,
  fetchEras,
  fetchFamilyLessons,
  fetchQuizzes,
  fetchStories,
  searchContent,
  type DailyFactModel,
  type EraModel,
  type FamilyLessonModel,
  type QuizModel,
  type SearchHit,
  type StoryModel,
} from "@/lib/content-model";
import {
  clearReviewQueue,
  eraMastery,
  getAttemptsLocal,
  getBestScore,
  getReviewQueue,
  removeFromReviewQueue,
  type ReviewItem,
} from "@/lib/bookmarks";
import { loadProgress } from "@/lib/local-progress";
import { usePremium } from "@/lib/premium";
import { cn } from "@/lib/utils";

const STORY_POS_KEY = "cronobiblia:story-position:v1";

function readStoryPosition(storyId: string): number {
  try {
    const raw = localStorage.getItem(STORY_POS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return typeof map[storyId] === "number" ? map[storyId] : 0;
  } catch {
    return 0;
  }
}

export default function AprendeScreen() {
  const [stories, setStories] = useState<StoryModel[]>([]);
  const [quizzes, setQuizzes] = useState<QuizModel[]>([]);
  const [eras, setEras] = useState<EraModel[]>([]);
  const [lessons, setLessons] = useState<FamilyLessonModel[]>([]);
  const [facts, setFacts] = useState<DailyFactModel[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [progress, setProgress] = useState(() => loadProgress());

  const { premium } = usePremium();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [st, qz, er, le, fa] = await Promise.all([
          fetchStories(),
          fetchQuizzes(),
          fetchEras(),
          fetchFamilyLessons(),
          fetchDailyFacts(),
        ]);
        if (!cancelled) {
          setStories(st);
          setQuizzes(qz);
          setEras(er);
          setLessons(le);
          setFacts(fa);
          setReview(getReviewQueue());
          setProgress(loadProgress());
        }
      } catch {
        /* empty states below */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const results = await searchContent(q);
      if (!cancelled) setHits(results);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const fact = useMemo(() => {
    if (facts.length === 0) return null;
    const visible = facts.filter((f) => !f.premium || premium);
    const pool = visible.length > 0 ? visible : facts;
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    return pool[dayOfYear % pool.length] ?? null;
  }, [facts, premium]);

  const inProgressStory = useMemo(() => {
    const id = progress.currentStoryId;
    if (!id || progress.completedStories.includes(id)) return null;
    const story = stories.find((s) => s.id === id);
    if (!story) return null;
    return { story, position: readStoryPosition(id) };
  }, [progress, stories]);

  const masteryByEra = useMemo(
    () =>
      eras.map((era) => {
        const eraQuizIds = quizzes
          .filter((q) => q.eraId === era.id)
          .map((q) => q.id);
        return {
          era,
          mastery: eraMastery(era.id, eraQuizIds),
          quizCount: eraQuizIds.length,
        };
      }),
    [eras, quizzes],
  );

  const totalAttempts = getAttemptsLocal().length;

  const isLocked = (item: { premium: boolean }) => item.premium && !premium;

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Cargando Aprende"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-terracotta/30 border-t-terracotta" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Aprende</h1>
      <p className="mt-1 text-sm text-ink/65">
        Recorridos guiados, cuestionarios con explicación inmediata y tu
        progreso por época.
      </p>

      {/* Search across content */}
      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar recorridos, eventos, evidencia…"
          aria-label="Buscar en todo el contenido (ignora acentos)"
          className="tap-target w-full rounded-xl bg-parchment pl-10 pr-10 text-base text-ink ring-1 ring-ink/15 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-terracotta"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setHits(null);
            }}
            aria-label="Limpiar búsqueda"
            className="tap-target absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg text-ink/50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {hits ? (
        <SearchResults hits={hits} premium={premium} onClear={() => { setQuery(""); setHits(null); }} />
      ) : (
        <>
          {/* Daily fact */}
          {fact ? (
            <section
              aria-label="Dato del día"
              className="mt-4 rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/30"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-deep">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Dato del día
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/90">
                {fact.text}
              </p>
            </section>
          ) : null}

          {/* Continue */}
          {inProgressStory ? (
            <section aria-label="Continuar recorrido" className="mt-4">
              <Link
                to="/story/$id"
                params={{ id: inProgressStory.story.id }}
                className="tap-target flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 text-ivory"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta">
                    <Play className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-wide text-ivory/60">
                      Continuar recorrido
                    </span>
                    <span className="block font-semibold">
                      {inProgressStory.story.title}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </section>
          ) : null}

          {/* Stories */}
          <section aria-labelledby="stories-heading" className="mt-6">
            <h2
              id="stories-heading"
              className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
            >
              <BookOpen className="h-5 w-5 text-terracotta" aria-hidden="true" />
              Recorridos
            </h2>
            <ul className="mt-3 space-y-2">
              {stories.map((story) => (
                <StoryRow
                  key={story.id}
                  story={story}
                  done={progress.completedStories.includes(story.id)}
                  locked={isLocked(story)}
                />
              ))}
              {stories.length === 0 ? (
                <EmptyState text="Los recorridos están en camino." />
              ) : null}
            </ul>
          </section>

          {/* Quizzes */}
          <section aria-labelledby="quizzes-heading" className="mt-6">
            <h2
              id="quizzes-heading"
              className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
            >
              <GraduationCap className="h-5 w-5 text-sea" aria-hidden="true" />
              Cuestionarios
            </h2>
            <ul className="mt-3 space-y-2">
              {quizzes.map((quiz) => (
                <QuizRow
                  key={quiz.id}
                  quiz={quiz}
                  locked={isLocked(quiz)}
                />
              ))}
              {quizzes.length === 0 ? (
                <EmptyState text="Los cuestionarios están en camino." />
              ) : null}
            </ul>
          </section>

          {/* Era mastery */}
          <section aria-labelledby="mastery-heading" className="mt-6">
            <h2
              id="mastery-heading"
              className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
            >
              <Award className="h-5 w-5 text-gold-deep" aria-hidden="true" />
              Dominio por época
            </h2>
            <p className="mt-1 text-xs text-ink/60">
              Completa los cuestionarios de cada época con al menos 70% para
              dominarla.
              {totalAttempts > 0 ? ` Llevas ${totalAttempts} intentos.` : ""}
            </p>
            <ul className="mt-3 space-y-2">
              {masteryByEra.map(({ era, mastery, quizCount }) => {
                const pct = Math.round(mastery * 100);
                const locked = era.premium && !premium;
                return (
                  <li
                    key={era.id}
                    className="rounded-2xl bg-parchment p-4 ring-1 ring-ink/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        {locked ? (
                          <Lock className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                        ) : null}
                        {era.title}
                      </p>
                      <p
                        className="text-sm font-semibold text-ink"
                        aria-label={`Dominio: ${pct} por ciento`}
                      >
                        {pct}%
                      </p>
                    </div>
                    <div
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Dominio de ${era.title}`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct >= 70 ? "bg-evidence" : "bg-gold",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      {quizCount === 0
                        ? "Sin cuestionarios todavía"
                        : pct >= 70
                          ? "Época dominada"
                          : `${quizCount} cuestionario(s) en esta época`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Review queue */}
          <section aria-labelledby="review-heading" className="mt-6">
            <div className="flex items-center justify-between">
              <h2
                id="review-heading"
                className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
              >
                <RefreshCcw className="h-5 w-5 text-terracotta" aria-hidden="true" />
                Repaso
              </h2>
              {review.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    clearReviewQueue();
                    setReview([]);
                  }}
                  className="tap-target rounded-lg px-3 text-sm font-medium text-ink/60 ring-1 ring-ink/15"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
            {review.length === 0 ? (
              <p className="mt-2 text-sm text-ink/60">
                Las preguntas que falles aparecerán aquí para repasarlas. Sin
                castigos: repasar es parte de aprender.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {review.map((item) => (
                  <li
                    key={`${item.quizId}:${item.prompt}`}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-parchment p-3 ring-1 ring-ink/10"
                  >
                    <p className="text-sm text-ink/85">{item.prompt}</p>
                    <div className="flex shrink-0 gap-1">
                      <Link
                        to="/quiz/$id"
                        params={{ id: item.quizId }}
                        aria-label={`Repasar: ${item.prompt}`}
                        className="tap-target flex items-center rounded-lg bg-terracotta/10 px-3 text-sm font-medium text-terracotta-deep"
                      >
                        Repasar
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromReviewQueue(item.quizId, item.prompt);
                          setReview(getReviewQueue());
                        }}
                        aria-label={`Marcar como repasado: ${item.prompt}`}
                        className="tap-target flex items-center justify-center rounded-lg ring-1 ring-ink/15"
                      >
                        <CheckCircle2
                          className="h-5 w-5 text-evidence-deep"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Family lessons */}
          {lessons.length > 0 ? (
            <section aria-labelledby="family-heading" className="mt-6">
              <h2
                id="family-heading"
                className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
              >
                <Users className="h-5 w-5 text-evidence-deep" aria-hidden="true" />
                En familia
              </h2>
              <ul className="mt-3 space-y-2">
                {lessons.map((lesson) => {
                  const locked = isLocked(lesson);
                  return (
                    <li
                      key={lesson.id}
                      className="rounded-2xl bg-parchment ring-1 ring-ink/10"
                    >
                      <Link
                        to={locked ? "/paywall" : "/story/$id"}
                        params={locked ? undefined : { id: lesson.id }}
                        className="tap-target block px-4"
                        aria-label={
                          locked
                            ? `${lesson.title}: contenido premium. Ver planes.`
                            : `Lección familiar: ${lesson.title}`
                        }
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>
                            <span className="flex items-center gap-1.5 font-medium text-ink">
                              {locked ? (
                                <Lock className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                              ) : null}
                              {lesson.title}
                            </span>
                            <span className="block text-xs text-ink/60">
                              {lesson.summary}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-5 w-5 shrink-0 text-ink/40"
                            aria-hidden="true"
                          />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function StoryRow({
  story,
  done,
  locked,
}: {
  story: StoryModel;
  done: boolean;
  locked: boolean;
}) {
  const inner = (
    <span className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            done ? "bg-evidence/15" : "bg-terracotta/10",
          )}
          aria-hidden="true"
        >
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-evidence-deep" />
          ) : locked ? (
            <Lock className="h-5 w-5 text-gold-deep" />
          ) : (
            <Clock3 className="h-5 w-5 text-terracotta" />
          )}
        </span>
        <span>
          <span className="block font-medium text-ink">{story.title}</span>
          <span className="block text-xs text-ink/60">
            {done
              ? "Completado"
              : locked
                ? "Contenido premium"
                : `${story.durationMinutes} minutos`}
            {" · "}
            {story.summary}
          </span>
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink/40" aria-hidden="true" />
    </span>
  );
  return (
    <li className="rounded-2xl bg-parchment ring-1 ring-ink/10">
      <Link
        to={locked ? "/paywall" : "/story/$id"}
        params={locked ? undefined : { id: story.id }}
        aria-label={
          locked
            ? `${story.title}: contenido premium. Ver planes.`
            : `${story.title}${done ? " (completado)" : ""}`
        }
        className="tap-target block px-4"
      >
        {inner}
      </Link>
    </li>
  );
}

function QuizRow({ quiz, locked }: { quiz: QuizModel; locked: boolean }) {
  const best = getBestScore(quiz.id);
  return (
    <li className="rounded-2xl bg-parchment ring-1 ring-ink/10">
      <Link
        to={locked ? "/paywall" : "/quiz/$id"}
        params={locked ? undefined : { id: quiz.id }}
        aria-label={
          locked
            ? `${quiz.title}: contenido premium. Ver planes.`
            : `Abrir cuestionario: ${quiz.title}`
        }
        className="tap-target block px-4"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sea/10"
              aria-hidden="true"
            >
              {locked ? (
                <Lock className="h-5 w-5 text-gold-deep" />
              ) : (
                <Trophy className="h-5 w-5 text-sea" />
              )}
            </span>
            <span>
              <span className="block font-medium text-ink">{quiz.title}</span>
              <span className="block text-xs text-ink/60">
                {locked
                  ? "Contenido premium"
                  : best
                    ? `Mejor resultado: ${best.score}/${best.total}`
                    : `${quiz.questions.length} preguntas · con explicación`}
              </span>
            </span>
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-ink/40"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  );
}

const KIND_LABEL: Record<string, string> = {
  "timeline-event": "Cronología",
  story: "Recorrido",
  evidence: "Evidencia",
  map: "Mapa",
  "family-lesson": "En familia",
};

function SearchResults({
  hits,
  premium,
  onClear,
}: {
  hits: SearchHit[];
  premium: boolean;
  onClear: () => void;
}) {
  return (
    <section aria-label="Resultados de búsqueda" className="mt-4">
      <p className="text-sm text-ink/60" role="status">
        {hits.length === 0
          ? "Sin resultados para esta búsqueda."
          : `${hits.length} resultado(s).`}
      </p>
      <ul className="mt-3 space-y-2">
        {hits.slice(0, 30).map((hit) => {
          const locked = hit.premium && !premium;
          const label = KIND_LABEL[hit.kind] ?? "Contenido";
          const inner = (
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink/50">
                  {locked ? (
                    <Lock className="h-3.5 w-3.5 text-gold-deep" aria-hidden="true" />
                  ) : null}
                  {label}
                </span>
                <span className="block font-medium text-ink">{hit.title}</span>
                <span className="block text-xs text-ink/60">{hit.summary}</span>
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-ink/40"
                aria-hidden="true"
              />
            </span>
          );
          if (hit.kind === "story" || hit.kind === "family-lesson") {
            return (
              <li key={hit.id} className="rounded-2xl bg-parchment ring-1 ring-ink/10">
                <Link
                  to={locked ? "/paywall" : "/story/$id"}
                  params={locked ? undefined : { id: hit.id }}
                  className="tap-target block px-4"
                  aria-label={`${label}: ${hit.title}`}
                >
                  {inner}
                </Link>
              </li>
            );
          }
          // Timeline events, evidence and maps open in their own tabs (Track A/C).
          return (
            <li
              key={hit.id}
              className="rounded-2xl bg-parchment px-4 py-3 ring-1 ring-ink/10"
            >
              {inner}
              <span className="mt-1 block text-xs text-ink/50">
                {hit.kind === "timeline-event"
                  ? "Ver en la pestaña Cronología"
                  : hit.kind === "map"
                    ? "Ver en la pestaña Mapas"
                    : "Ver en la pestaña de evidencia"}
              </span>
            </li>
          );
        })}
      </ul>
      {hits.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="tap-target mt-3 w-full rounded-xl text-sm font-medium text-ink/60 ring-1 ring-ink/15"
        >
          Limpiar búsqueda
        </button>
      ) : null}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <li className="rounded-2xl bg-parchment p-6 text-center ring-1 ring-ink/10">
      <p className="text-sm text-ink/60">{text}</p>
    </li>
  );
}
