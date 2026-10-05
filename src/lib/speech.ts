/**
 * CronoBiblia — Spanish text-to-speech ("Escuchar").
 *
 * Uses the Web Speech API (window.speechSynthesis), which works in mobile
 * Safari and inside the Capacitor WKWebView on iOS with the device's
 * built-in Spanish voices (no network, no cost, works offline).
 *
 * iOS quirk: very long utterances can stall, so text is chunked into
 * sentence-sized utterances queued in order. A generation token cancels
 * stale queues when the user hits play on something new.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.speechSynthesis?.speak === "function"
  );
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReady = false;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !isSpeechSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) {
    cachedVoices = v;
    voicesReady = true;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && isSpeechSupported()) {
  loadVoices();
  // iOS/macOS populate voices asynchronously.
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

/** Preferred Spanish voice: Latin American first, then any Spanish. */
function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = voicesReady ? cachedVoices : loadVoices();
  if (voices.length === 0) return null;
  const es = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
  if (es.length === 0) return null;
  const preference = ["es-mx", "es-us", "es-419", "es-es"];
  for (const lang of preference) {
    const hit = es.find((v) => v.lang.toLowerCase().replace("_", "-") === lang);
    if (hit) return hit;
  }
  return es[0];
}

/** Split into sentence-ish chunks so iOS doesn't stall on long text. */
function chunkText(text: string, maxLen = 220): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+[.!?…]+["»”]?|\S[^.!?…]*$/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((current + " " + piece).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = piece;
    } else {
      current = (current + " " + piece).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

let generation = 0;

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
}

/** Speak Spanish text. Cancels anything currently playing. */
export function speakSpanish(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported()) return;
  const synth = window.speechSynthesis;
  generation += 1;
  const myGen = generation;
  synth.cancel();

  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  const voice = pickSpanishVoice();
  const rate = opts.rate ?? 0.98;

  chunks.forEach((chunk, i) => {
    const utter = new SpeechSynthesisUtterance(chunk);
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang ?? "es-MX";
    utter.rate = rate;
    if (i === chunks.length - 1) {
      utter.onend = () => {
        if (myGen === generation) opts.onEnd?.();
      };
      utter.onerror = () => {
        if (myGen === generation) opts.onEnd?.();
      };
    }
    synth.speak(utter);
  });
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  generation += 1;
  window.speechSynthesis.cancel();
}

export function pauseSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.pause();
}

export function resumeSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.resume();
}

export interface SpeechState {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  /** Toggle: play text, or stop if this id is already playing. */
  toggle: (id: string, text: string) => void;
  stop: () => void;
}

/**
 * React hook for a play/stop toggle bound to one piece of content.
 * `id` identifies what's playing so two buttons don't fight.
 */
export function useSpeech(): SpeechState {
  const [supported] = useState(isSpeechSupported);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  useEffect(() => {
    // Warm up voices on first interaction-capable moment.
    loadVoices();
    return () => {
      stopSpeaking();
    };
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setActiveId(null);
    setPaused(false);
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (activeIdRef.current === id) {
        // Same content: pause/resume cycle, third tap stops.
        if (paused) {
          resumeSpeaking();
          setPaused(false);
        } else if (window.speechSynthesis?.paused) {
          resumeSpeaking();
          setPaused(false);
        } else {
          pauseSpeaking();
          setPaused(true);
        }
        return;
      }
      setPaused(false);
      setActiveId(id);
      speakSpanish(text, {
        onEnd: () => {
          if (activeIdRef.current === id) {
            setActiveId(null);
            setPaused(false);
          }
        },
      });
    },
    [paused],
  );

  return {
    supported,
    speaking: activeId !== null && !paused,
    paused,
    toggle,
    stop,
  };
}
