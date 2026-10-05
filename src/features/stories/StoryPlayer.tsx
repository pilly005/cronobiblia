/**
 * StoryPlayer — guided story player (Track B).
 *
 * Reads the id via useParams({ from: "/story/$id" }). Card sequence mixing
 * timeline/map/evidence content: each card shows the editorial narration
 * plus the referenced content rendered through ContentCard; quiz cards
 * become checkpoint teasers. Family lessons play as block sequences.
 * Pause/resume persisted locally; completion persisted locally and mirrored
 * to Supabase `progress` for signed-in users. End-of-story quiz link and
 * related paths. Premium stories route to /paywall. Content comes from the
 * canonical packs through `src/lib/content-model.ts`.
 *
 * Default export; the route wrapper passes no props.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Lock,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  fetchContentById,
  fetchQuizzes,
  fetchStories,
  findQuizForQuestion,
  type Block,
  type FamilyLessonModel,
  type NormalizedItem,
  type QuizModel,
  type SourceRef,
  type StoryModel,
} from "@/lib/content-model";
import { isBookmarkedLocal, toggleBookmark } from "@/lib/bookmarks";
import { loadProgress, saveProgress } from "@/lib/local-progress";
import { useSupabaseSession } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/premium";
import { ContentCard } from "@/content-renderer/ContentCard";
import { cn } from "@/lib/utils";

const STORY_POS_KEY = "cronobiblia:story-position:v1";

function readPosition(storyId: string): number {
  try {
    const raw = localStorage.getItem(STORY_POS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const v = map[storyId];
    return typeof v === "number" && v >= 0 ? v : 0;
  } catch {
    return 0;
  }
}

function writePosition(storyId: string, index: number): void {
  try {
    const raw = localStorage.getItem(STORY_POS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[storyId] = index;
    localStorage.setItem(STORY_POS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function clearPosition(storyId: string): void {
  try {
    const raw = localStorage.getItem(STORY_POS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    delete map[storyId];
    localStorage.setItem(STORY_POS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

async function mirrorProgressToServer(
  userId: string | null,
  itemId: string,
  state: string,
): Promise<void> {
  if (!userId || !isSupabaseConfigured || !supabase) return;
  try {
    await supabase
      .from("progress")
      .upsert(
        { user_id: userId, item_id: itemId, state },
        { onConflict: "user_id,item_id" },
      );
  } catch {
    /* offline or table missing */
  }
}

interface Page {
  key: string;
  narration?: string;
  title?: string;
  blocks?: Block[];
  sources?: SourceRef[];
  quizTeaser?: { quizId: string; title: string };
}

interface RelatedPath {
  id: string;
  kind: "story" | "quiz";
  label: string;
  title: string;
}

export default function StoryPlayer() {
  const { id } = useParams({ from: "/story/$id" });
  const navigate = useNavigate();
  const { user } = useSupabaseSession();
  const { premium, loading: premiumLoading } = usePremium();

  const [item, setItem] = useState<StoryModel | FamilyLessonModel | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [related, setRelated] = useState<RelatedPath[]>([]);
  const [endQuizId, setEndQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raw = await fetchContentById(id);
        if (cancelled) return;
        if (!raw || (raw.kind !== "story" && raw.kind !== "family-lesson")) {
          setItem(null);
          setPages([]);
          return;
        }
        setItem(raw);

        const builtPages: Page[] = [];
        if (raw.kind === "story") {
          const resolved = await Promise.all(
            raw.cards.map(async (card) => ({
              card,
              content: card.contentId
                ? await fetchContentById(card.contentId)
                : null,
              quizId:
                card.kind === "quiz" && card.contentId
                  ? await findQuizForQuestion(card.contentId)
                  : null,
            })),
          );
          if (cancelled) return;
          for (const { card, content, quizId } of resolved) {
            if (card.kind === "quiz") {
              builtPages.push({
                key: `quiz-${card.contentId}`,
                narration: card.narration,
                quizTeaser: quizId
                  ? { quizId, title: "Cuestionario" }
                  : undefined,
                blocks: quizId
                  ? undefined
                  : [
                      {
                        type: "paragraph",
                        text: "El cuestionario de esta tarjeta aún no está disponible.",
                      },
                    ],
              });
              continue;
            }
            builtPages.push({
              key: card.contentId || `card-${card.order}`,
              narration: card.narration,
              title: titleOf(content),
              blocks: blocksOf(content),
              sources: sourcesOf(content),
            });
          }
          const firstQuiz = resolved.find((r) => r.quizId);
          setEndQuizId(firstQuiz?.quizId ?? null);
        } else {
          // Family lesson: one page per block.
          raw.blocks.forEach((block, i) => {
            builtPages.push({ key: `block-${i}`, blocks: [block] });
          });
          setEndQuizId(null);
        }

        if (cancelled) return;
        setPages(builtPages);

        const done = loadProgress().completedStories.includes(id);
        const pos = readPosition(id);
        setIndex(done ? 0 : Math.min(pos, Math.max(0, builtPages.length - 1)));
        setFinished(false);
        setPaused(false);
        setBookmarked(isBookmarkedLocal(id));

        const p = loadProgress();
        if (p.currentStoryId !== id) {
          p.currentStoryId = id;
          p.currentStoryTitle = raw.title;
          saveProgress(p);
        }
        await mirrorProgressToServer(user?.id ?? null, id, "started");

        // Related paths: sibling stories + quizzes in the same eras.
        const eraIds =
          raw.kind === "story" ? raw.eraIds : [raw.eraId];
        const [allStories, allQuizzes] = await Promise.all([
          fetchStories(),
          fetchQuizzes(),
        ]);
        if (cancelled) return;
        const rel: RelatedPath[] = [];
        for (const s of allStories) {
          if (s.id !== id && s.eraIds.some((e) => eraIds.includes(e))) {
            rel.push({ id: s.id, kind: "story", label: "Recorrido", title: s.title });
          }
        }
        for (const q of allQuizzes) {
          if (eraIds.includes(q.eraId) && q.id !== endQuizId) {
            rel.push({ id: q.id, kind: "quiz", label: "Cuestionario", title: q.title });
          }
        }
        setRelated(rel.slice(0, 6));
      } catch {
        if (!cancelled) {
          setItem(null);
          setPages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const total = pages.length;
  const current: Page | null = pages[index] ?? null;

  const goTo = (next: number) => {
    if (next >= total) {
      complete();
      return;
    }
    const clamped = Math.max(0, Math.min(next, total - 1));
    setIndex(clamped);
    setPaused(false);
    writePosition(id, clamped);
  };

  const complete = () => {
    setFinished(true);
    clearPosition(id);
    const p = loadProgress();
    if (!p.completedStories.includes(id)) {
      p.completedStories = [...p.completedStories, id];
    }
    p.currentStoryId = null;
    p.currentStoryTitle = null;
    saveProgress(p);
    void mirrorProgressToServer(user?.id ?? null, id, "completed");
  };

  const handleToggleBookmark = async () => {
    const next = await toggleBookmark(user, id);
    setBookmarked(next);
  };

  const allSources = useMemo(() => {
    const seen = new Set<string>();
    const out: SourceRef[] = [];
    for (const page of pages) {
      for (const s of page.sources ?? []) {
        if (s.title && !seen.has(s.title)) {
          seen.add(s.title);
          out.push(s);
        }
      }
    }
    return out;
  }, [pages]);

  if (loading || premiumLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Cargando recorrido"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-terracotta/30 border-t-terracotta" />
      </div>
    );
  }

  if (!item || total === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl text-ink">Recorrido no encontrado</h1>
        <p className="mt-2 max-w-sm text-sm text-ink/65">
          Este recorrido no existe o aún no está publicado. Prueba con otro de
          la pestaña Aprende.
        </p>
        <Link
          to="/tabs/aprende"
          className="tap-target mt-6 inline-flex items-center justify-center rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory"
        >
          Ir a Aprende
        </Link>
      </div>
    );
  }

  if (item.premium && !premium) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl text-ink">{item.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-ink/65">
          Este recorrido es parte de CronoBiblia Premium. Desbloquea todos los
          recorridos, mapas y cuestionarios.
        </p>
        <Link
          to="/paywall"
          className="tap-target mt-6 inline-flex items-center justify-center rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8">
        <div className="rounded-2xl bg-parchment p-6 text-center ring-1 ring-ink/10">
          <CheckCircle2
            className="mx-auto h-12 w-12 text-evidence-deep"
            aria-hidden="true"
          />
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
            ¡Recorrido completado!
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/65">
            Terminaste «{item.title}». El progreso se guarda en este
            dispositivo
            {user ? " y en tu cuenta" : ""}.
          </p>
          {endQuizId ? (
            <Link
              to="/quiz/$id"
              params={{ id: endQuizId }}
              className="tap-target mt-5 inline-flex w-full items-center justify-center rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory"
            >
              Pon a prueba lo aprendido
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setFinished(false);
              goTo(0);
            }}
            className="tap-target mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-ink/70 ring-1 ring-ink/15"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Repasar el recorrido
          </button>
        </div>

        {allSources.length > 0 ? (
          <section
            aria-label="Fuentes del recorrido"
            className="mt-6 rounded-2xl bg-ink/5 p-4"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
              Fuentes
            </h2>
            <ul className="mt-2 space-y-1.5">
              {allSources.map((s, i) => (
                <li key={i} className="text-sm text-ink/80">
                  {s.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section aria-label="Rutas relacionadas" className="mt-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Sigue explorando
            </h2>
            <ul className="mt-3 space-y-2">
              {related.map((r) => (
                <li
                  key={`${r.kind}-${r.id}`}
                  className="rounded-2xl bg-parchment ring-1 ring-ink/10"
                >
                  <Link
                    to={r.kind === "story" ? "/story/$id" : "/quiz/$id"}
                    params={{ id: r.id }}
                    className="tap-target flex items-center justify-between gap-3 px-4"
                    aria-label={`${r.label}: ${r.title}`}
                  >
                    <span>
                      <span className="block text-xs uppercase tracking-wide text-ink/50">
                        {r.label}
                      </span>
                      <span className="block font-medium text-ink">
                        {r.title}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-ink/40"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => navigate({ to: "/tabs/aprende" })}
          className="tap-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-ink/70 ring-1 ring-ink/15"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a Aprende
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/tabs/aprende" })}
          aria-label="Volver a Aprende (se guarda tu posición)"
          className="tap-target flex items-center justify-center rounded-lg ring-1 ring-ink/15"
        >
          <ArrowLeft className="h-5 w-5 text-ink/70" aria-hidden="true" />
        </button>
        <p className="truncate text-sm font-medium text-ink/70">{item.title}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Reanudar recorrido" : "Pausar recorrido"}
            className="tap-target flex items-center justify-center rounded-lg ring-1 ring-ink/15"
          >
            {paused ? (
              <Play className="h-5 w-5 text-ink/70" aria-hidden="true" />
            ) : (
              <Pause className="h-5 w-5 text-ink/70" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleBookmark}
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
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={Math.max(1, total)}
          aria-label={`Tarjeta ${index + 1} de ${total}`}
        >
          <div
            className="h-full rounded-full bg-terracotta transition-[width]"
            style={{ width: `${total > 0 ? ((index + 1) / total) * 100 : 0}%` }}
          />
        </div>
        <p className="shrink-0 text-xs font-medium text-ink/60" aria-hidden="true">
          {index + 1}/{total}
        </p>
      </div>

      {/* Card */}
      {paused ? (
        <div className="mt-6 rounded-2xl bg-parchment p-8 text-center ring-1 ring-ink/10">
          <Pause className="mx-auto h-10 w-10 text-ink/40" aria-hidden="true" />
          <p className="mt-3 font-display text-xl text-ink">En pausa</p>
          <p className="mt-1 text-sm text-ink/65">
            Tu posición está guardada. Puedes salir y continuar donde quedaste.
          </p>
          <button
            type="button"
            onClick={() => setPaused(false)}
            className="tap-target mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-terracotta px-6 text-sm font-semibold text-ivory"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Reanudar
          </button>
        </div>
      ) : current ? (
        <div
          key={`${id}-${index}`}
          className="mt-6 rounded-2xl bg-parchment p-5 ring-1 ring-ink/10"
          aria-live="polite"
          aria-label={`Tarjeta ${index + 1} de ${total}`}
        >
          {current.narration ? (
            <p className="mb-4 text-base leading-relaxed text-ink/90">
              {current.narration}
            </p>
          ) : null}
          {current.title ? (
            <h2 className="mb-3 font-display text-xl font-semibold text-ink">
              {current.title}
            </h2>
          ) : null}
          {current.quizTeaser ? (
            <Link
              to="/quiz/$id"
              params={{ id: current.quizTeaser.quizId }}
              className="tap-target flex items-center justify-between gap-3 rounded-xl bg-terracotta px-4 text-ivory"
              aria-label={`Abrir cuestionario: ${current.quizTeaser.title}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Pon a prueba lo aprendido
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}
          {current.blocks && current.blocks.length > 0 ? (
            <ContentCard item={{ body: current.blocks }} />
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-parchment p-6 text-center ring-1 ring-ink/10">
          <p className="text-sm text-ink/65">
            Este recorrido aún no tiene tarjetas publicadas.
          </p>
        </div>
      )}

      {/* Navigation */}
      {!paused && total > 0 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="tap-target flex items-center gap-1 rounded-xl bg-parchment px-4 text-sm font-medium ring-1 ring-ink/15 disabled:opacity-40"
            aria-label="Tarjeta anterior"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="tap-target flex items-center gap-1 rounded-xl bg-terracotta px-6 text-sm font-semibold text-ivory"
            aria-label={
              index === total - 1 ? "Terminar recorrido" : "Siguiente tarjeta"
            }
          >
            {index === total - 1 ? "Terminar" : "Siguiente"}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* Dots */}
      {!paused && total > 1 ? (
        <div
          className="mt-4 flex flex-wrap justify-center gap-1.5"
          role="group"
          aria-label="Ir a una tarjeta"
        >
          {pages.map((page, i) => (
            <button
              key={page.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a la tarjeta ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "tap-target flex items-center justify-center rounded-full px-2 text-[11px] font-medium",
                i === index
                  ? "bg-terracotta text-ivory"
                  : "bg-ink/10 text-ink/60",
              )}
              style={{ minWidth: "2.75rem" }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function titleOf(content: NormalizedItem | null): string | undefined {
  if (!content) return undefined;
  switch (content.kind) {
    case "timeline-event":
    case "evidence":
    case "map":
      return content.title;
    default:
      return undefined;
  }
}

function blocksOf(content: NormalizedItem | null): Block[] | undefined {
  if (!content) return undefined;
  switch (content.kind) {
    case "timeline-event":
    case "evidence":
    case "map":
    case "family-lesson":
      return content.blocks;
    default:
      return undefined;
  }
}

function sourcesOf(content: NormalizedItem | null): SourceRef[] | undefined {
  if (!content) return undefined;
  switch (content.kind) {
    case "timeline-event":
    case "evidence":
    case "map":
      return content.sources;
    default:
      return undefined;
  }
}

export type { QuizModel };
