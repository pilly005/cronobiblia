import { isPremiumActive } from "@/lib/purchases";

/**
 * Download manager for era packs (Track C).
 *
 * Manifest contract (served by the `content-sync` Edge Function when it
 * exists; bundled fallback keeps downloads working offline):
 *   { content_version, packs: [{ id, title, checksum, min_app_version, is_free }] }
 *
 * Rules:
 * - Free packs download for everyone; premium packs require an active
 *   `premium` entitlement (checked via isPremiumActive(); the Track D stub
 *   throws until wired, which we treat as "not premium").
 * - A revoked/expired entitlement stops NEW downloads but never deletes
 *   packs already on the device and never interrupts an open lesson —
 *   removal is always an explicit user action.
 * - All state persists in localStorage; no network is required after the
 *   manifest is cached.
 */

export interface EraPack {
  id: string;
  title: string;
  checksum: string;
  min_app_version: string;
  is_free: boolean;
}

export interface ContentManifest {
  content_version: number;
  packs: EraPack[];
}

export type DownloadStatus = "idle" | "downloading" | "done" | "error";

export interface PackDownloadState {
  status: DownloadStatus;
  /** 0–100 */
  progress: number;
  error?: string;
  contentVersion?: number;
  downloadedAt?: string;
}

const STORAGE_KEY = "cronobiblia:downloads:v1";
const MANIFEST_KEY = "cronobiblia:manifest:v1";

/** Bundled fallback manifest — the free starter path ships in the app bundle. */
export const BUNDLED_MANIFEST: ContentManifest = {
  content_version: 1,
  packs: [
    {
      id: "starter-origenes",
      title: "Paquete inicial: Orígenes y patriarcas",
      checksum: "bundled:v1:starter-origenes",
      min_app_version: "1.0.0",
      is_free: true,
    },
    {
      id: "era-exodo",
      title: "Éxodo y asentamiento",
      checksum: "bundled:v1:era-exodo",
      min_app_version: "1.0.0",
      is_free: false,
    },
    {
      id: "era-jesus",
      title: "Mundo de Jesús",
      checksum: "bundled:v1:era-jesus",
      min_app_version: "1.0.0",
      is_free: false,
    },
    {
      id: "era-iglesia",
      title: "Iglesia primitiva",
      checksum: "bundled:v1:era-iglesia",
      min_app_version: "1.0.0",
      is_free: false,
    },
  ],
};

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — downloads stay in memory only */
  }
}

function isValidManifest(m: unknown): m is ContentManifest {
  if (!m || typeof m !== "object") return false;
  const rec = m as Record<string, unknown>;
  return (
    typeof rec.content_version === "number" &&
    Array.isArray(rec.packs) &&
    rec.packs.every(
      (p: any) =>
        p && typeof p.id === "string" && typeof p.title === "string",
    )
  );
}

/**
 * Fetches the manifest from the content-sync Edge Function when reachable,
 * otherwise returns the cached or bundled manifest. Never throws.
 */
export async function getManifest(): Promise<{
  manifest: ContentManifest;
  source: "remote" | "cached" | "bundled";
}> {
  const cached = readJson<ContentManifest>(MANIFEST_KEY);
  try {
    const base = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    if (base) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const res = await fetch(`${base}/functions/v1/content-sync`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (isValidManifest(json)) {
            writeJson(MANIFEST_KEY, json);
            return { manifest: json, source: "remote" };
          }
        }
      } finally {
        clearTimeout(timer);
      }
    }
  } catch {
    /* offline or function not deployed — fall through to cache */
  }
  if (cached && isValidManifest(cached)) {
    return { manifest: cached, source: "cached" };
  }
  return { manifest: BUNDLED_MANIFEST, source: "bundled" };
}

/** Premium state, defensive: the Track D stub throws until wired. */
export async function checkPremium(): Promise<boolean> {
  try {
    return await isPremiumActive();
  } catch {
    return false;
  }
}

export function loadDownloadStates(): Record<string, PackDownloadState> {
  const states = readJson<Record<string, PackDownloadState>>(STORAGE_KEY);
  if (!states) return {};
  // A download interrupted by an app restart goes back to idle, never "done".
  for (const [id, s] of Object.entries(states)) {
    if (s.status === "downloading") {
      states[id] = { ...s, status: "idle", progress: 0 };
    }
  }
  return states;
}

function saveDownloadStates(states: Record<string, PackDownloadState>): void {
  writeJson(STORAGE_KEY, states);
}

// Active simulated transfers, keyed by pack id.
const activeTimers = new Map<string, ReturnType<typeof setInterval>>();

export type DownloadResult =
  | { ok: true }
  | { ok: false; reason: "premium-required" | "already-downloading" };

/**
 * Starts downloading a pack. Premium packs require an active entitlement;
 * the check happens here (and only here) so an expired entitlement stops NEW
 * downloads without touching packs already on the device.
 */
export async function startDownload(
  pack: EraPack,
  onUpdate: (state: PackDownloadState) => void,
): Promise<DownloadResult> {
  const states = loadDownloadStates();
  const current = states[pack.id];
  if (current?.status === "downloading" || activeTimers.has(pack.id)) {
    return { ok: false, reason: "already-downloading" };
  }
  if (!pack.is_free) {
    const premium = await checkPremium();
    if (!premium) {
      return { ok: false, reason: "premium-required" };
    }
  }

  let progress = 0;
  const emit = (state: PackDownloadState) => {
    const next = loadDownloadStates();
    next[pack.id] = state;
    saveDownloadStates(next);
    onUpdate(state);
  };

  emit({ status: "downloading", progress: 0 });

  // Simulated chunked transfer: v1 packs are metadata + cached content
  // records, so completion = checksum recorded locally.
  const timer = setInterval(() => {
    progress = Math.min(100, progress + 7 + Math.floor(Math.random() * 6));
    if (progress >= 100) {
      clearInterval(timer);
      activeTimers.delete(pack.id);
      emit({
        status: "done",
        progress: 100,
        contentVersion: BUNDLED_MANIFEST.content_version,
        downloadedAt: new Date().toISOString(),
      });
    } else {
      emit({ status: "downloading", progress });
    }
  }, 140);
  activeTimers.set(pack.id, timer);
  return { ok: true };
}

export function cancelDownload(
  packId: string,
  onUpdate: (state: PackDownloadState) => void,
): void {
  const timer = activeTimers.get(packId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(packId);
  }
  const states = loadDownloadStates();
  const next: PackDownloadState = { status: "idle", progress: 0 };
  states[packId] = next;
  saveDownloadStates(states);
  onUpdate(next);
}

/** Explicit user removal only — never called automatically on entitlement loss. */
export function removeDownload(
  packId: string,
  onUpdate: (state: PackDownloadState) => void,
): void {
  cancelDownload(packId, () => {});
  const states = loadDownloadStates();
  const next: PackDownloadState = { status: "idle", progress: 0 };
  states[packId] = next;
  saveDownloadStates(states);
  onUpdate(next);
}
