import { useEffect, useState } from "react";
import { loadProgress } from "./local-progress";

/**
 * Reduced-motion preference (Track C).
 *
 * True when the user enabled "Reducir movimiento" in Perfil (applied to
 * <html> as the `reduce-motion` class by Track A's a11y helper) OR when the
 * OS reports prefers-reduced-motion. Map route animation must respect this.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    readReducedMotion(),
  );

  useEffect(() => {
    setReduced(readReducedMotion());
    const mq =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    if (!mq) return;
    const onChange = () => setReduced(readReducedMotion());
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    return;
  }, []);

  return reduced;
}

function readReducedMotion(): boolean {
  try {
    if (
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("reduce-motion")
    ) {
      return true;
    }
    const prefs = loadProgress();
    if (prefs.reduceMotion) return true;
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return true;
    }
  } catch {
    /* storage unavailable — fall through */
  }
  return false;
}
