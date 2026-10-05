import { Link } from "@tanstack/react-router";
import { ArrowRight, Landmark } from "lucide-react";
import {
  EVIDENCE_ITEMS,
  EVIDENCE_KIND_LABEL,
  type EvidenceItem,
} from "./evidenceData";
import { getContentApi, safeList } from "@/lib/content-safe";
import { useEffect, useState } from "react";

/**
 * EvidenceGallery — Track C (default export, zero-arg).
 *
 * Browsing grid for the evidence library. Content only through the Track B
 * named functions via the defensive adapter; falls back to the curated local
 * pack so the gallery works offline.
 */

function normalizeEvidence(item: any): EvidenceItem | null {
  try {
    const id = typeof item?.id === "string" ? item.id : "";
    const title = typeof item?.title === "string" ? item.title : "";
    if (!id || !title) return null;
    const kindRaw = String(item.kind ?? "").toLowerCase();
    const kind: EvidenceItem["kind"] =
      kindRaw === "inscripcion" || kindRaw === "inscription"
        ? "inscripcion"
        : kindRaw === "sitio" || kindRaw === "site"
          ? "sitio"
          : "artefacto";
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    const sources = Array.isArray(item.sources)
      ? item.sources
          .map((s: any) =>
            typeof s === "string"
              ? { title: s }
              : { title: str(s.title), detail: str(s.detail) || undefined },
          )
          .filter((s: { title: string }) => s.title)
      : [];
    return {
      id,
      title,
      kind,
      summary: str(item.summary ?? item.description),
      dating: str(item.dating),
      discovery: {
        year: str(item.discovery?.year),
        place: str(item.discovery?.place),
        context: str(item.discovery?.context),
      },
      presentLocation: item.presentLocation
        ? {
            place: str(item.presentLocation.place),
            verified: item.presentLocation.verified === true,
          }
        : undefined,
      contributes: arr(item.contributes),
      doesNotProve: arr(item.doesNotProve ?? item.does_not_prove),
      sources,
      imageRights: {
        status:
          item.imageRights?.status === "licensed" ||
          item.imageRights?.status === "public-domain"
            ? item.imageRights.status
            : "pending",
        attribution: str(item.imageRights?.attribution) || undefined,
      },
      lastReviewed: str(item.lastReviewed ?? item.last_reviewed),
      relatedIds: arr(item.relatedIds ?? item.related_ids),
    };
  } catch {
    return null;
  }
}

export function useEvidenceList(): {
  items: EvidenceItem[];
  loading: boolean;
} {
  const [items, setItems] = useState<EvidenceItem[]>(EVIDENCE_ITEMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list: any[] = [];
      try {
        const api = await getContentApi();
        list = await safeList(api, "getEvidence");
      } catch {
        list = [];
      }
      if (cancelled) return;
      const normalized = list
        .map(normalizeEvidence)
        .filter((e): e is EvidenceItem => e !== null);
      if (normalized.length > 0) setItems(normalized);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}

export default function EvidenceGallery() {
  const { items, loading } = useEvidenceList();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6">
      <header>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-terracotta">
          <Landmark className="h-4 w-4" aria-hidden="true" />
          Arqueología
        </p>
        <h1 className="mt-1 font-display text-3xl">Evidencia</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Artefactos, inscripciones y sitios: qué aporta cada hallazgo y qué{" "}
          <em>no</em> demuestra. Historia antes que opinión.
        </p>
      </header>

      {loading ? (
        <div className="mt-6 flex flex-col gap-3" role="status" aria-live="polite" aria-label="Cargando evidencia">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-ink/5 p-5" aria-hidden="true">
              <div className="h-4 w-2/3 rounded bg-ink/10" />
              <div className="mt-3 h-3 w-full rounded bg-ink/10" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-parchment p-8 text-center" role="status">
          <p className="font-display text-xl">Aún no hay tarjetas de evidencia</p>
          <p className="mt-2 text-sm text-ink/60">
            Estamos preparando la biblioteca de hallazgos con sus fuentes.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to="/evidence/$id"
                params={{ id: item.id }}
                className="tap-target block rounded-2xl bg-parchment p-4 shadow-[0_1px_2px_rgba(23,33,43,0.06)] transition-colors hover:bg-evidence/8"
                aria-label={`${item.title}. ${EVIDENCE_KIND_LABEL[item.kind]}. ${item.dating}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-base font-semibold">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-ink/60">
                      {EVIDENCE_KIND_LABEL[item.kind]}
                      {item.dating ? ` · ${item.dating}` : ""}
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-evidence" aria-hidden="true" />
                </span>
                {item.summary && (
                  <span className="mt-2 block text-sm leading-relaxed text-ink/70">
                    {item.summary}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
