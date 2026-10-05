/**
 * QuizRunner — quiz engine (Track B).
 *
 * Reads the quiz id via useParams({ from: "/quiz/$id" }). Question types:
 * multiple-choice, order-events, identify-place. Immediate Spanish
 * explanations after every answer (never just right/wrong). Attempts are
 * persisted (Supabase `quiz_attempts` when signed in, localStorage for
 * guests); wrong answers feed the review queue and era mastery. Premium
 * quizzes route to /paywall. Quiz state is never conveyed by color alone
 * (icons + text labels). Content comes from the canonical packs through
 * `src/lib/content-model.ts`.
 *
 * Default export; the route wrapper passes no props.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  MapPin,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  fetchQuizById,
  type QuizModel,
  type QuizQuestionModel,
} from "@/lib/content-model";
import {
  addToReviewQueue,
  getBestScore,
  saveQuizAttempt,
} from "@/lib/bookmarks";
import { useSupabaseSession } from "@/lib/auth";
import { usePremium } from "@/lib/premium";
import { cn } from "@/lib/utils";

type Phase = "answering" | "feedback" | "results";

export default function QuizRunner() {
  const { id } = useParams({ from: "/quiz/$id" });
  const navigate = useNavigate();
  const { user } = useSupabaseSession();
  const { premium, loading: premiumLoading } = usePremium();

  const [quiz, setQuiz] = useState<QuizModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrong, setWrong] = useState<Array<{ index: number; prompt: string }>>([]);
  const [saved, setSaved] = useState(false);

  /* Per-question answer state */
  const [picked, setPicked] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [wasCorrect, setWasCorrect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const item = await fetchQuizById(id);
        if (!cancelled) setQuiz(item);
      } catch {
        if (!cancelled) setQuiz(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);
  const total = questions.length;
  const question: QuizQuestionModel | null = questions[qIndex] ?? null;

  const resetQuestionState = () => {
    setPicked(null);
    setOrder([]);
    setWasCorrect(false);
  };

  const checkAnswer = () => {
    if (!question || phase !== "answering") return;
    let correct = false;
    if (question.type === "multiple-choice" || question.type === "identify-place") {
      const opt = question.options?.find((o) => o.id === picked);
      correct = opt?.correct === true;
    } else if (question.type === "order-events") {
      const expected = question.correctOrder ?? [];
      correct =
        expected.length > 0 &&
        order.length === expected.length &&
        order.every((oid, i) => oid === expected[i]);
    }
    setWasCorrect(correct);
    setPhase("feedback");
    if (correct) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrong((w) => [...w, { index: qIndex, prompt: question.prompt }]);
    }
  };

  const next = () => {
    if (qIndex + 1 >= total) {
      setPhase("results");
    } else {
      setQIndex((i) => i + 1);
      setPhase("answering");
      resetQuestionState();
    }
  };

  /* Persist the attempt once results are shown. */
  useEffect(() => {
    if (phase !== "results" || saved || !quiz) return;
    setSaved(true);
    (async () => {
      await saveQuizAttempt(user, {
        quizId: quiz.id,
        era: quiz.eraId,
        score: correctCount,
        total,
        wrong,
      });
      addToReviewQueue(
        wrong.map((w) => ({
          quizId: quiz.id,
          prompt: w.prompt,
          date: new Date().toISOString(),
        })),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, saved, quiz]);

  const restart = () => {
    setQIndex(0);
    setPhase("answering");
    setCorrectCount(0);
    setWrong([]);
    setSaved(false);
    resetQuestionState();
  };

  if (loading || premiumLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Cargando cuestionario"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-terracotta/30 border-t-terracotta" />
      </div>
    );
  }

  if (!quiz || total === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl text-ink">Cuestionario no encontrado</h1>
        <p className="mt-2 max-w-sm text-sm text-ink/65">
          Este cuestionario no existe o aún no tiene preguntas publicadas.
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

  if (quiz.premium && !premium) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl text-ink">{quiz.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-ink/65">
          Este cuestionario es parte de CronoBiblia Premium.
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

  if (phase === "results") {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passed = total > 0 && correctCount / total >= 0.7;
    const best = getBestScore(quiz.id);
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8">
        <div className="rounded-2xl bg-parchment p-6 text-center ring-1 ring-ink/10">
          <Trophy
            className={cn(
              "mx-auto h-12 w-12",
              passed ? "text-gold-deep" : "text-ink/35",
            )}
            aria-hidden="true"
          />
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
            Resultado: {correctCount}/{total}
          </h1>
          <p className="mt-1 text-sm text-ink/65" aria-live="polite">
            {pct}% correctas
            {passed
              ? " · ¡Época en camino a dominada!"
              : " · Sigue practicando: el repaso no tiene castigo."}
          </p>
          {best && best.score >= correctCount ? (
            <p className="mt-1 text-xs text-ink/55">
              Tu mejor resultado en este cuestionario: {best.score}/{best.total}.
            </p>
          ) : null}
          {wrong.length > 0 ? (
            <p className="mt-3 rounded-xl bg-terracotta/10 p-3 text-left text-sm text-ink/85">
              <strong className="font-semibold">
                {wrong.length} pregunta(s) para repasar:
              </strong>{" "}
              las agregamos a tu cola de repaso en Aprende.
            </p>
          ) : null}
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={restart}
              className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Intentar de nuevo
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/tabs/aprende" })}
              className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-ink/70 ring-1 ring-ink/15"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a Aprende
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const canCheck =
    question.type === "order-events" ? order.length > 0 : picked !== null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/tabs/aprende" })}
          aria-label="Salir del cuestionario (se pierde el intento actual)"
          className="tap-target flex items-center justify-center rounded-lg ring-1 ring-ink/15"
        >
          <ArrowLeft className="h-5 w-5 text-ink/70" aria-hidden="true" />
        </button>
        <p className="truncate text-sm font-medium text-ink/70">{quiz.title}</p>
        <p className="shrink-0 text-xs font-semibold text-ink/60" aria-live="polite">
          {qIndex + 1} de {total}
        </p>
      </div>

      {/* Progress */}
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={qIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Pregunta ${qIndex + 1} de ${total}`}
      >
        <div
          className="h-full rounded-full bg-sea"
          style={{ width: `${((qIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div
        className="mt-6 rounded-2xl bg-parchment p-5 ring-1 ring-ink/10"
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-sea-deep">
          {question.type === "multiple-choice"
            ? "Opción múltiple"
            : question.type === "identify-place"
              ? "Identifica el lugar"
              : "Ordena los eventos"}
        </p>
        <h1 className="mt-1 font-display text-xl font-semibold text-ink">
          {question.prompt}
        </h1>

        {question.type === "order-events" ? (
          <OrderEvents
            question={question}
            order={order}
            onOrder={setOrder}
            disabled={phase === "feedback"}
            showFeedback={phase === "feedback"}
          />
        ) : (
          <ChoiceList
            question={question}
            picked={picked}
            onPick={setPicked}
            disabled={phase === "feedback"}
            showFeedback={phase === "feedback"}
            placeMode={question.type === "identify-place"}
          />
        )}

        {/* Feedback: immediate Spanish explanation, never color alone */}
        {phase === "feedback" ? (
          <div
            className={cn(
              "mt-4 rounded-xl p-4 ring-1",
              wasCorrect
                ? "bg-evidence/10 ring-evidence/30"
                : "bg-terracotta/10 ring-terracotta/30",
            )}
            role="status"
          >
            <p
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                wasCorrect ? "text-evidence-deep" : "text-terracotta-deep",
              )}
            >
              {wasCorrect ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5" aria-hidden="true" />
              )}
              {wasCorrect ? "Correcto" : "Incorrecto"}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/90">
              {question.explanation}
            </p>
            {question.source ? (
              <p className="mt-2 text-xs text-ink/60">
                Fuente: {question.source}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="mt-4">
        {phase === "answering" ? (
          <button
            type="button"
            onClick={checkAnswer}
            disabled={!canCheck}
            className="tap-target w-full rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory disabled:opacity-40"
          >
            Comprobar respuesta
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="tap-target flex w-full items-center justify-center gap-1 rounded-xl bg-ink px-5 text-sm font-semibold text-ivory"
          >
            {qIndex + 1 >= total ? "Ver resultado" : "Siguiente pregunta"}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink/55">
        Aciertos hasta ahora: {correctCount} de{" "}
        {qIndex + (phase === "feedback" ? 1 : 0)}
      </p>
    </div>
  );
}

/* ---------------- Question widgets ---------------- */

function optionClass(
  picked: boolean,
  feedbackState?: "correct" | "wrong" | "neutral",
) {
  return cn(
    "tap-target flex w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium ring-1 transition-colors",
    feedbackState === "correct" && "bg-evidence/15 ring-evidence/50 text-ink",
    feedbackState === "wrong" && "bg-terracotta/10 ring-terracotta/40 text-ink",
    (!feedbackState || feedbackState === "neutral") &&
      (picked
        ? "bg-sea/10 ring-sea/50 text-ink"
        : "bg-ivory ring-ink/15 text-ink/85 hover:ring-sea/40"),
  );
}

function ChoiceList({
  question,
  picked,
  onPick,
  disabled,
  showFeedback,
  placeMode,
}: {
  question: QuizQuestionModel;
  picked: string | null;
  onPick: (id: string) => void;
  disabled: boolean;
  showFeedback: boolean;
  placeMode: boolean;
}) {
  return (
    <div className="mt-4 space-y-2" role="group" aria-label="Opciones de respuesta">
      {(question.options ?? []).map((opt) => {
        const isPicked = picked === opt.id;
        const feedbackState = showFeedback
          ? opt.correct
            ? "correct"
            : isPicked
              ? "wrong"
              : "neutral"
          : undefined;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onPick(opt.id)}
            disabled={disabled}
            aria-pressed={isPicked}
            className={optionClass(isPicked, feedbackState)}
          >
            {placeMode ? (
              <MapPin
                className="h-5 w-5 shrink-0 text-ink/50"
                aria-hidden="true"
              />
            ) : (
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                  showFeedback && opt.correct
                    ? "border-evidence-deep bg-evidence-deep text-white"
                    : isPicked
                      ? "border-sea-deep"
                      : "border-ink/25",
                )}
                aria-hidden="true"
              >
                {showFeedback && opt.correct ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : showFeedback && isPicked ? (
                  <XCircle className="h-4 w-4 text-terracotta-deep" />
                ) : isPicked ? (
                  <span className="h-3 w-3 rounded-full bg-sea-deep" />
                ) : null}
              </span>
            )}
            <span className="flex-1">{opt.label}</span>
            {showFeedback && opt.correct ? (
              <span className="text-xs font-semibold text-evidence-deep">
                Respuesta correcta
              </span>
            ) : null}
            {showFeedback && isPicked && !opt.correct ? (
              <span className="text-xs font-semibold text-terracotta-deep">
                Tu respuesta
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

function OrderEvents({
  question,
  order,
  onOrder,
  disabled,
  showFeedback,
}: {
  question: QuizQuestionModel;
  order: string[];
  onOrder: (order: string[]) => void;
  disabled: boolean;
  showFeedback: boolean;
}) {
  const [pool] = useState(() => shuffled(question.items ?? []));
  const expected = question.correctOrder ?? [];

  const toggle = (id: string) => {
    if (disabled) return;
    onOrder(
      order.includes(id) ? order.filter((x) => x !== id) : [...order, id],
    );
  };

  const labelFor = (id: string) =>
    (question.items ?? []).find((e) => e.id === id)?.label ?? id;

  return (
    <div className="mt-4">
      <p className="text-sm text-ink/65">
        Toca los eventos en el orden que crees correcto, del más antiguo al más
        reciente:
      </p>
      <div className="mt-3 space-y-2" role="group" aria-label="Eventos para ordenar">
        {pool.map((ev) => {
          const pos = order.indexOf(ev.id);
          const selected = pos >= 0;
          const correctPos = showFeedback && expected[pos] === ev.id;
          const wrongPos = showFeedback && selected && expected[pos] !== ev.id;
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => toggle(ev.id)}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${ev.label}${selected ? `, posición ${pos + 1}` : ""}`}
              className={cn(
                "tap-target flex w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium ring-1",
                showFeedback &&
                  selected &&
                  correctPos &&
                  "bg-evidence/15 ring-evidence/50",
                showFeedback && wrongPos && "bg-terracotta/10 ring-terracotta/40",
                !showFeedback &&
                  (selected
                    ? "bg-sea/10 ring-sea/50"
                    : "bg-ivory ring-ink/15 hover:ring-sea/40"),
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  selected ? "bg-sea-deep text-white" : "bg-ink/10 text-ink/60",
                )}
                aria-hidden="true"
              >
                {selected ? pos + 1 : "·"}
              </span>
              <span className="flex-1">{ev.label}</span>
              {showFeedback && selected ? (
                correctPos ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-evidence-deep">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Bien ubicado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-terracotta-deep">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Mal ubicado
                  </span>
                )
              ) : null}
            </button>
          );
        })}
      </div>
      {showFeedback ? (
        <p className="mt-3 rounded-xl bg-ink/5 p-3 text-sm text-ink/80">
          <strong className="font-semibold">Orden correcto:</strong>{" "}
          {expected.map((id) => labelFor(id)).join(" → ")}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onOrder([])}
          disabled={disabled || order.length === 0}
          className="tap-target mt-2 rounded-lg px-3 text-sm text-ink/60 ring-1 ring-ink/15 disabled:opacity-40"
        >
          Limpiar orden
        </button>
      )}
    </div>
  );
}
