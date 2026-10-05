/**
 * CronoBiblia — "Escuchar" toggle button.
 *
 * Binds to the shared speech service: tap to hear Spanish narration,
 * tap again to pause, again to resume. Each instance owns a stable id so
 * starting one narration stops any other.
 */

import { useId } from "react";
import { Pause, Volume2 } from "lucide-react";
import { useSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";

export function ListenButton({
  text,
  label = "Escuchar narración",
  className,
}: {
  /** Full text to narrate. */
  text: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const { supported, speaking, paused, toggle } = useSpeech();

  if (!supported || !text.trim()) return null;

  const active = speaking || paused;

  return (
    <button
      type="button"
      onClick={() => toggle(id, text)}
      aria-label={active ? (paused ? "Reanudar narración" : "Pausar narración") : label}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-4 py-2",
        "text-sm font-semibold transition-colors",
        active
          ? "bg-terracotta text-white shadow-md"
          : "bg-ivory text-ink border border-gold/40 hover:bg-gold/15",
        className,
      )}
    >
      {active && !paused ? (
        <Pause className="h-5 w-5 animate-pulse" aria-hidden />
      ) : (
        <Volume2 className="h-5 w-5" aria-hidden />
      )}
      <span>{active ? (paused ? "Reanudar" : "Pausando…") : "Escuchar"}</span>
    </button>
  );
}
