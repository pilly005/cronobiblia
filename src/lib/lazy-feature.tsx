import { lazy, Suspense, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { Hourglass } from "lucide-react";

/**
 * Defensive lazy loader for Track B/C feature screens (Track A).
 *
 * Those screens live under src/features (one folder per feature) and may not
 * build runs. We resolve them through `import.meta.glob` (static,
 * bundler-supported; empty record when a file is absent) so the app never
 * breaks: missing screens render a Spanish "coming soon" placeholder instead
 * of a blank page or a failed chunk load.
 *
 * When a track lands its screen and the app is rebuilt, the glob picks it
 * up automatically — route files stay unchanged.
 */

const featureModules = import.meta.glob("/src/features/**/*.tsx");

export function MissingFeature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"
      >
        <Hourglass className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-display text-2xl text-ink">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/70">{description}</p>
      <Link
        to="/tabs/descubrir"
        className="tap-target mt-6 inline-flex items-center justify-center rounded-xl bg-terracotta px-5 text-sm font-semibold text-ivory transition-colors hover:bg-terracotta/90"
      >
        Volver a Descubrir
      </Link>
    </div>
  );
}

function LoadingFeature({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-terracotta/30 border-t-terracotta" />
      <p className="mt-4 text-sm text-ink/60">{label}</p>
    </div>
  );
}

export function lazyFeatureScreen(
  path: string,
  fallback: { title: string; description: string; loadingLabel: string },
): React.FC {
  const loader = featureModules[path] as
    | (() => Promise<{ default?: React.ComponentType }>)
    | undefined;

  const Placeholder: React.ComponentType = () => (
    <MissingFeature
      title={fallback.title}
      description={fallback.description}
    />
  );

  const LazyScreen = lazy(
    async (): Promise<{ default: React.ComponentType }> => {
      if (!loader) return { default: Placeholder };
      try {
        const mod = await loader();
        if (mod.default) return { default: mod.default };
      } catch {
        /* chunk failed — fall through to the placeholder */
      }
      return { default: Placeholder };
    },
  );

  const FeatureScreen: React.FC = () => (
    <Suspense fallback={<LoadingFeature label={fallback.loadingLabel} />}>
      <LazyScreen />
    </Suspense>
  );
  return FeatureScreen;
}

/**
 * Resolves the named `ContentCard` export from Track B's
 * `src/content-renderer/ContentCard.tsx`, or null when it isn't bundled yet.
 */
const cardModules = import.meta.glob("/src/content-renderer/ContentCard.tsx");

let cachedCard: ComponentType<{ item: any }> | null | undefined;

export async function getContentCard(): Promise<ComponentType<{
  item: any;
}> | null> {
  if (cachedCard !== undefined) return cachedCard;
  const key = Object.keys(cardModules)[0];
  if (!key) {
    cachedCard = null;
    return cachedCard;
  }
  try {
    const mod = (await cardModules[key]()) as {
      ContentCard?: ComponentType<{ item: any }>;
    };
    cachedCard = mod.ContentCard ?? null;
  } catch {
    cachedCard = null;
  }
  return cachedCard;
}
