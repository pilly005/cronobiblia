import { loadProgress } from "./local-progress";

/**
 * Accessibility preferences (Track A).
 * Applies the user's text scale and reduced-motion preference to the
 * document. Called on app start and whenever the user changes a setting in
 * Perfil. Type is rem-based, so scaling the root font-size scales the UI.
 */

const SCALE_FACTOR = {
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
} as const;

export function applyAccessibilityPrefs(): void {
  if (typeof document === "undefined") return;
  const prefs = loadProgress();
  document.documentElement.style.fontSize = `${
    100 * SCALE_FACTOR[prefs.textScale]
  }%`;
  document.documentElement.classList.toggle(
    "reduce-motion",
    prefs.reduceMotion,
  );
  if (prefs.familyMode) {
    document.documentElement.classList.add("family-mode");
  } else {
    document.documentElement.classList.remove("family-mode");
  }
}
