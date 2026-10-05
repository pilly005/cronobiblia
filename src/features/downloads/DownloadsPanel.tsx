import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  CloudOff,
  Download,
  Lock,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  cancelDownload,
  checkPremium,
  getManifest,
  loadDownloadStates,
  removeDownload,
  startDownload,
  type ContentManifest,
  type EraPack,
  type PackDownloadState,
} from "./download-manager";

/**
 * DownloadsPanel — Track C (default export, zero-arg).
 *
 * Era-pack download UI: manifest from the content-sync contract (remote when
 * reachable, cached/bundled offline), progress, offline indicator and
 * premium gating. Mount wherever the app surfaces downloads (Perfil owns the
 * row; this panel is the content).
 */

function PackRow({
  pack,
  state,
  premium,
  onUpdate,
}: {
  pack: EraPack;
  state: PackDownloadState;
  premium: boolean;
  onUpdate: (packId: string, state: PackDownloadState) => void;
}) {
  const locked = !pack.is_free && !premium;
  const downloading = state.status === "downloading";
  const done = state.status === "done";

  const handleDownload = async () => {
    const res = await startDownload(pack, (s) => onUpdate(pack.id, s));
    if (!res.ok && res.reason === "premium-required") {
      onUpdate(pack.id, {
        status: "error",
        progress: 0,
        error: "premium-required",
      });
    }
  };

  return (
    <li className="rounded-2xl bg-parchment p-4 shadow-[0_1px_2px_rgba(23,33,43,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold">
            {pack.title}
            {locked && <Lock className="h-4 w-4 text-gold-deep" aria-hidden="true" />}
          </p>
          <p className="mt-0.5 text-xs text-ink/60">
            {pack.is_free ? "Incluido gratis" : "Premium"} · versión de contenido{" "}
            {pack.checksum.startsWith("bundled") ? "incluida en la app" : pack.checksum.slice(0, 12)}
          </p>
        </div>
        {done ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-evidence/15 px-2.5 py-1 text-[11px] font-semibold text-evidence-deep">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Descargado
          </span>
        ) : (
          <button
            type="button"
            onClick={downloading ? () => cancelDownload(pack.id, (s) => onUpdate(pack.id, s)) : handleDownload}
            className="tap-target inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-terracotta px-4 text-sm font-semibold text-ivory disabled:opacity-50"
            aria-label={downloading ? `Cancelar la descarga de ${pack.title}` : `Descargar ${pack.title}`}
          >
            {downloading ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {downloading ? "Cancelar" : "Descargar"}
          </button>
        )}
      </div>

      {downloading && (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-label={`Descargando ${pack.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress)}
            className="h-2 overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full rounded-full bg-terracotta transition-[width]"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink/60" aria-live="polite">
            {Math.round(state.progress)} %
          </p>
        </div>
      )}

      {state.status === "error" && state.error === "premium-required" && (
        <p className="mt-3 rounded-xl bg-gold/15 p-3 text-xs leading-relaxed text-ink/75">
          Este paquete requiere CronoBiblia Premium.{" "}
          <Link to="/paywall" className="font-semibold text-terracotta-deep underline">
            Ver planes Premium
          </Link>
        </p>
      )}

      {done && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ink/55">
            Disponible sin conexión
            {state.downloadedAt
              ? ` · descargado el ${new Date(state.downloadedAt).toLocaleDateString("es")}`
              : ""}
          </p>
          <button
            type="button"
            onClick={() => removeDownload(pack.id, (s) => onUpdate(pack.id, s))}
            className="tap-target inline-flex items-center gap-1 rounded-lg px-2 text-xs font-medium text-ink/60"
            aria-label={`Eliminar la descarga de ${pack.title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      )}
    </li>
  );
}

export default function DownloadsPanel() {
  const [manifest, setManifest] = useState<ContentManifest | null>(null);
  const [source, setSource] = useState<"remote" | "cached" | "bundled">("bundled");
  const [states, setStates] = useState<Record<string, PackDownloadState>>({});
  const [premium, setPremium] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, p] = await Promise.all([getManifest(), checkPremium()]);
      if (cancelled) return;
      setManifest(m.manifest);
      setSource(m.source);
      setPremium(p);
      setStates(loadDownloadStates());
      setLoading(false);
    })();
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const onUpdate = useCallback((packId: string, state: PackDownloadState) => {
    setStates((prev) => ({ ...prev, [packId]: state }));
  }, []);

  return (
    <section aria-labelledby="downloads-heading" className="mt-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="downloads-heading" className="font-display text-xl">
          Descargas sin conexión
        </h2>
        <span
          role="status"
          aria-label={online ? "Con conexión" : "Sin conexión"}
          className={
            online
              ? "inline-flex items-center gap-1.5 rounded-full bg-evidence/15 px-2.5 py-1 text-[11px] font-semibold text-evidence-deep"
              : "inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-semibold text-ink/70"
          }
        >
          {online ? (
            <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {online ? "En línea" : "Sin conexión"}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink/70">
        Guarda paquetes por época en tu iPhone para explorar mapas y lecciones
        sin conexión. El paquete inicial está incluido gratis.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-col gap-3" role="status" aria-live="polite" aria-label="Cargando paquetes">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-ink/5 p-5" aria-hidden="true">
              <div className="h-4 w-2/3 rounded bg-ink/10" />
              <div className="mt-3 h-3 w-full rounded bg-ink/10" />
            </div>
          ))}
        </div>
      ) : !manifest || manifest.packs.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-parchment p-6 text-center" role="status">
          <CloudOff className="mx-auto h-8 w-8 text-ink/30" aria-hidden="true" />
          <p className="mt-2 font-medium">No se pudo cargar el catálogo de paquetes</p>
          <p className="mt-1 text-sm text-ink/60">
            Revisa tu conexión e inténtalo de nuevo. El contenido inicial de la
            app sigue disponible sin conexión.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {manifest.packs.map((pack) => (
              <PackRow
                key={pack.id}
                pack={pack}
                state={states[pack.id] ?? { status: "idle", progress: 0 }}
                premium={premium}
                onUpdate={onUpdate}
              />
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink/50">
            Catálogo {source === "remote" ? "actualizado" : source === "cached" ? "en caché" : "incluido en la app"} ·
            versión de contenido {manifest.content_version}. Si tu suscripción
            termina, no podrás iniciar nuevas descargas Premium, pero nada de
            lo que ya descargaste se borra solo.
          </p>
        </>
      )}
    </section>
  );
}
