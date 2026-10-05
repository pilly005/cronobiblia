import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Crown,
  Loader2,
  ScrollText,
  Send,
  Sparkles,
} from "lucide-react";
import {
  askHistorian,
  getHistorianQuestionsRemaining,
  INSUFFICIENT_EVIDENCE,
  isHistorianLimitError,
  type HistorianResponse,
} from "@/lib/historian";
import { isPremiumActive } from "@/lib/purchases";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  role: "user" | "historian";
  text: string;
  response?: HistorianResponse;
  insufficient?: boolean;
}

const STARTER_QUESTIONS = [
  "¿Qué imperio dominaba el mundo cuando nació Jesús?",
  "¿Qué sabemos de la ciudad de Corinto en el siglo I?",
  "¿Por qué se debate la fecha del Éxodo?",
];

const CONFIDENCE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

function confidenceLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CONFIDENCE_LABEL[key] ?? raw;
}

let nextId = 1;

export default function HistorianScreen() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(getHistorianQuestionsRemaining());
  const [premium, setPremium] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isPremiumActive()
      .then(setPremium)
      .catch(() => setPremium(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setInput("");
    setLoading(true);
    const userMsg: ChatMessage = { id: nextId++, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const response = await askHistorian(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "historian",
          text: response.answer,
          response,
          insufficient: response.insufficientEvidence,
        },
      ]);
      setRemaining(getHistorianQuestionsRemaining());
    } catch (err) {
      if (isHistorianLimitError(err)) {
        navigate({ to: "/paywall" });
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "historian",
          text:
            err instanceof Error
              ? err.message
              : "Ocurrió un error. Inténtalo de nuevo.",
          insufficient: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-ink">
      <header className="border-b border-ink/10 bg-parchment/80 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="flex items-center gap-2 font-display text-2xl">
          <ScrollText className="h-6 w-6 text-terracotta" aria-hidden="true" />
          Historiador
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Pregunta sobre el contexto histórico: fechas, lugares, culturas y
          evidencia.
        </p>
        <div className="mt-2">
          {premium ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-ink">
              <Crown className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              Premium · 20 preguntas al día
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
              <Sparkles className="h-3.5 w-3.5 text-terracotta" aria-hidden="true" />
              {remaining > 0
                ? `${remaining} ${remaining === 1 ? "pregunta gratuita" : "preguntas gratuitas"}`
                : "Límite gratuito alcanzado"}
            </span>
          )}
        </div>
      </header>

      <main
        className="flex-1 space-y-4 overflow-y-auto px-4 pb-40 pt-4"
        aria-live="polite"
        aria-label="Conversación con el Historiador"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-md pt-6 text-center">
            <p className="text-ink/60">
              Por ejemplo, prueba con una de estas preguntas:
            </p>
            <div className="mt-4 space-y-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={loading}
                  className="tap-target block w-full rounded-2xl border border-ink/10 bg-parchment px-4 py-3 text-left text-[15px] shadow-sm transition-colors hover:border-terracotta/40 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="mt-6 text-xs text-ink/45">
              El Historiador responde con base en la biblioteca revisada de
              CronoBiblia y siempre muestra sus fuentes y su nivel de confianza.
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-terracotta px-4 py-3 text-[15px] leading-relaxed text-ivory shadow-sm">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <article
                className={cn(
                  "max-w-[92%] rounded-2xl rounded-bl-md border px-4 py-3 shadow-sm",
                  msg.insufficient
                    ? "border-gold/50 bg-gold/10"
                    : "border-ink/10 bg-parchment",
                )}
              >
                {msg.insufficient && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-terracotta">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Evidencia insuficiente
                  </p>
                )}
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {msg.text}
                </p>
                {msg.response && !msg.insufficient && (
                  <div className="mt-3 border-t border-ink/10 pt-2">
                    <p className="text-xs text-ink/55">
                      Confianza:{" "}
                      <span className="font-semibold text-ink/75">
                        {confidenceLabel(msg.response.confidence)}
                      </span>
                    </p>
                    {msg.response.citations.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                          Fuentes
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {msg.response.citations.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-start gap-1.5 text-xs text-ink/65"
                            >
                              <BookOpen
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta"
                                aria-hidden="true"
                              />
                              {c.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {msg.response.suggestedLesson && (
                      <Link
                        to="/tabs/aprende"
                        className="mt-2 inline-block text-sm font-semibold text-terracotta underline underline-offset-2"
                      >
                        Lección sugerida: {msg.response.suggestedLesson.title}
                      </Link>
                    )}
                  </div>
                )}
                {msg.insufficient && msg.text !== INSUFFICIENT_EVIDENCE && (
                  <p className="mt-2 text-xs italic text-ink/50">
                    {INSUFFICIENT_EVIDENCE}
                  </p>
                )}
              </article>
            </div>
          ),
        )}

        {loading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/60"
              role="status"
              aria-label="El Historiador está respondiendo"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Consultando la biblioteca…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-[76px] z-40 border-t border-ink/10 bg-parchment/95 px-4 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <label htmlFor="historian-input" className="sr-only">
            Escribe tu pregunta al Historiador
          </label>
          <input
            id="historian-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="¿Qué quieres saber del contexto histórico?"
            maxLength={500}
            disabled={loading}
            autoComplete="off"
            className="tap-target min-h-[48px] flex-1 rounded-2xl border border-ink/15 bg-ivory px-4 text-[16px] placeholder:text-ink/40 focus:border-terracotta focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Enviar pregunta"
            className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-terracotta text-ivory shadow-sm transition-opacity disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
