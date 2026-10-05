/**
 * CronoBiblia — "Un día como hoy" hero card (Descubrir tab).
 *
 * The viral loop: today's dated fact from the 365-item pack, with
 * one-tap Spanish narration ("Escuchar") and a story-format share card
 * ("Compartir") designed for WhatsApp / Instagram.
 */

import { useEffect, useState } from "react";
import { CalendarDays, Share2 } from "lucide-react";
import { ListenButton } from "@/components/ListenButton";
import {
  getTodaysFact,
  spanishDate,
  type TodayFact,
} from "@/lib/daily-fact";
import { shareTodayFact } from "@/lib/share-card";
import { cn } from "@/lib/utils";

/** Curated fallback if the pack can't load — same content as before. */
const FALLBACK_FACTS: TodayFact[] = [
  { id: "fb-1", day: 1, title: "La estela de Tel Dan", text: "Descubierta en 1993, contiene la referencia extrabíblica más antigua conocida a la «casa de David» (siglo IX a. C.)." },
  { id: "fb-2", day: 2, title: "Ciro el Grande y el retorno", text: "El Cilindro de Ciro (539 a. C.) ilustra la política persa que permitió el regreso del exilio a Judá." },
  { id: "fb-3", day: 3, title: "Los rollos del Mar Muerto", text: "Copiados entre los siglos III a. C. y I d. C. en Qumrán; algunos textos son unos mil años más antiguos que las copias medievales." },
  { id: "fb-4", day: 4, title: "Herodes el Grande", text: "Rey de Judea bajo Roma (aprox. 37–4 a. C.); reconstruyó el Segundo Templo a una escala monumental." },
  { id: "fb-5", day: 5, title: "La piedra de Pilato", text: "Hallada en Cesarea Marítima en 1961, esta inscripción confirma al prefecto mencionado en los evangelios." },
  { id: "fb-6", day: 6, title: "La caída de Nínive", text: "En 612 a. C. cayó la capital asiria, marcando el fin del imperio que había conquistado el reino del norte." },
  { id: "fb-7", day: 7, title: "El fragmento más antiguo del Nuevo Testamento", text: "El papiro 𝔓52, con parte del Evangelio de Juan, se data en la primera mitad del siglo II." },
];

export function TodayFactCard({ className }: { className?: string }) {
  const [fact, setFact] = useState<TodayFact | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hit = await getTodaysFact();
      if (cancelled) return;
      if (hit) {
        setFact(hit);
      } else {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const doy = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
        setFact(FALLBACK_FACTS[doy % FALLBACK_FACTS.length]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onShare() {
    if (!fact || sharing) return;
    setSharing(true);
    setShareError(false);
    try {
      await shareTodayFact(fact);
    } catch {
      setShareError(true);
    } finally {
      setSharing(false);
    }
  }

  return (
    <article
      aria-labelledby="today-fact-heading"
      className={cn(
        "overflow-hidden rounded-2xl bg-ink text-ivory shadow-lg",
        className,
      )}
    >
      <div className="p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Un día como hoy · {spanishDate()}
        </p>
        {fact ? (
          <>
            <h3
              id="today-fact-heading"
              className="mt-3 font-display text-2xl leading-snug"
            >
              {fact.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ivory/85">
              {fact.text}
            </p>
          </>
        ) : (
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="h-7 w-3/4 animate-pulse rounded bg-ivory/15" />
            <div className="h-4 w-full animate-pulse rounded bg-ivory/10" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-ivory/10" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {fact && (
            <ListenButton
              text={`${fact.title}. ${fact.text}`}
              className="border-gold/50 bg-gold/15 text-ivory hover:bg-gold/25"
            />
          )}
          <button
            type="button"
            onClick={onShare}
            disabled={!fact || sharing}
            aria-label="Compartir el dato de hoy como imagen"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
            <span>{sharing ? "Creando imagen…" : "Compartir"}</span>
          </button>
        </div>
        {shareError && (
          <p role="alert" className="mt-2 text-sm text-gold">
            No se pudo compartir. Inténtalo de nuevo.
          </p>
        )}
      </div>
    </article>
  );
}
