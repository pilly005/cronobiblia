/**
 * Premium entitlement state (Track B).
 *
 * Wraps `isPremiumActive()` from the Track A/D purchases contract.
 * Until Track D lands, the stub throws "purchases not configured" — we
 * treat that as "not premium yet" and degrade gracefully: locked content
 * shows its state and routes to /paywall instead of crashing.
 */

import { useEffect, useState } from "react";
import { isPremiumActive, isPurchasesNotConfigured } from "./purchases";

export interface PremiumState {
  /** true when the `premium` entitlement is active. */
  premium: boolean;
  /** true while the entitlement is being resolved. */
  loading: boolean;
  /** true when purchases aren't wired yet (Track D pending). */
  notConfigured: boolean;
}

export function usePremium(): PremiumState {
  const [state, setState] = useState<PremiumState>({
    premium: false,
    loading: true,
    notConfigured: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const active = await isPremiumActive();
        if (!cancelled) {
          setState({ premium: active, loading: false, notConfigured: false });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            premium: false,
            loading: false,
            notConfigured: isPurchasesNotConfigured(error),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
