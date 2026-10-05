import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Camera,
  CircleAlert,
  CircleCheck,
  MapPin,
} from "lucide-react";
import EvidenceGallery, { useEvidenceList } from "./EvidenceGallery";
import { EVIDENCE_KIND_LABEL, getEvidenceById, type EvidenceItem } from "./evidenceData";
import { getContentApi, safeGetById } from "@/lib/content-safe";

/**
 * EvidenceDetail — Track C (default export, zero-arg).
 *
 * Artifact / inscription / site card. Reads the id with
 * useParams({ from: "/evidence/$id" }). Content only through the Track B
 * named functions via the defensive adapter; falls back to the curated local
 * pack so cards work offline.
 */

function normalizeOne(item: any): EvidenceItem | null {
  try {
    const id = typeof item?.id === "string" ? item.id : "";
    const title = typeof item?.title === "string" ? item.title : "";
    if (!id || !title) return null;
    const local = getEvidenceById(id);
    if (local) return local;
    return null;
  } catch {
    return null;
  }
}

function RightsImage({ item }: { item: EvidenceItem }) {
  const { status, attribution } = item.imageRights;
  if (status === "pending") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-ink/5">
        <div
          className="flex aspect-[16/9] flex-col items-center justify-center gap-2 p-6 text-center"
          role="img"
          aria-label={`Imagen de ${item.title} pendiente de verificación de derechos`}
        >
          <Camera className="h-8 w-8 text-ink/30" aria-hidden="true" />
          <p className="text-sm font-medium text-ink/60">
            Imagen pendiente de verificación de derechos
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-ink/45">
            Solo publicamos fotografías con derechos verificados: originales,
            dominio público confirmado o licencia Creative Commons con
            atribución. Esta tarjeta funciona sin imagen hasta completar la
            auditoría.
          </p>
        </div>
        <figcaption className="border-t border-ink/10 bg-parchment px-4 py-2 text-[11px] text-ink/55">
          Derechos de imagen: en revisión. El objeto es antiguo; eso no hace
          libre su fotografía.
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink/10 bg-parchment">
      <div
        className="flex aspect-[16/9] items-center justify-center bg-sea/10 p-6"
        role="img"
        aria-label={`Imagen de ${item.title}`}
      >
        <Camera className="h-8 w-8 text-sea/50" aria-hidden="true" />
      </div>
      {attribution && (
        <figcaption className="px-4 py-2 text-[11px] leading-relaxed text-ink/55">
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}

function BulletList({
  items,
  icon: Icon,
  tone,
  label,
}: {
  items: string[];
  icon: typeof CircleCheck;
  tone: "good" | "caution";
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={label}>
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Icon
          className={tone === "good" ? "h-5 w-5 text-evidence" : "h-5 w-5 text-terracotta"}
          aria-hidden="true"
        />
        {label}
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink/80">
            <span
              aria-hidden="true"
              className={
                tone === "good"
                  ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-evidence"
                  : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta"
              }
            />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const related = item.relatedIds
    .map((id) => getEvidenceById(id))
    .filter(
      (e): e is EvidenceItem => e !== undefined && e.id !== item.id,
    );

  return (
    <article>
      <RightsImage item={item} />

      <header className="mt-5">
        <p className="inline-block rounded-full bg-evidence/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-evidence-deep">
          {EVIDENCE_KIND_LABEL[item.kind]}
        </p>
        <h1 className="mt-2 font-display text-3xl">{item.title}</h1>
        {item.dating && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink/70">
            <CalendarDays className="h-4 w-4 text-terracotta" aria-hidden="true" />
            Datación: {item.dating}
          </p>
        )}
      </header>

      {item.summary && (
        <p className="mt-4 text-base leading-relaxed text-ink/85">{item.summary}</p>
      )}

      {/* Discovery context */}
      <section aria-labelledby="discovery-heading" className="mt-6 rounded-2xl bg-parchment p-5">
        <h2 id="discovery-heading" className="flex items-center gap-2 font-display text-xl">
          <MapPin className="h-5 w-5 text-sea" aria-hidden="true" />
          Descubrimiento
        </h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          {item.discovery.year && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-ink/60">Cuándo:</dt>
              <dd className="text-ink/85">{item.discovery.year}</dd>
            </div>
          )}
          {item.discovery.place && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-ink/60">Dónde:</dt>
              <dd className="text-ink/85">{item.discovery.place}</dd>
            </div>
          )}
          {item.discovery.context && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-ink/60">Contexto:</dt>
              <dd className="text-ink/85">{item.discovery.context}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Present location — only when verified */}
      {item.presentLocation?.verified && item.presentLocation.place && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-evidence/25 bg-evidence/8 p-4 text-sm text-ink/80">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-evidence" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Ubicación actual verificada:</strong>{" "}
            {item.presentLocation.place}
          </span>
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        <BulletList
          items={item.contributes}
          icon={CircleCheck}
          tone="good"
          label="Qué aporta"
        />
        <BulletList
          items={item.doesNotProve}
          icon={CircleAlert}
          tone="caution"
          label="Qué no demuestra"
        />
      </div>

      {/* Sources */}
      {item.sources.length > 0 && (
        <section aria-labelledby="sources-heading" className="mt-6">
          <h2 id="sources-heading" className="flex items-center gap-2 font-display text-xl">
            <BookOpen className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            Fuentes
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {item.sources.map((s, i) => (
              <li
                key={i}
                className="rounded-xl bg-parchment p-3 text-sm leading-relaxed text-ink/75"
              >
                <span className="font-medium text-ink/90">{s.title}</span>
                {s.detail && <span className="block text-xs text-ink/60">{s.detail}</span>}
              </li>
            ))}
          </ul>
          {item.lastReviewed && (
            <p className="mt-3 text-xs text-ink/50">
              Última revisión editorial: {item.lastReviewed}
            </p>
          )}
        </section>
      )}

      {/* Related evidence */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-6">
          <h2 id="related-heading" className="font-display text-xl">
            Evidencia relacionada
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  to="/evidence/$id"
                  params={{ id: r.id }}
                  className="tap-target flex items-center justify-between gap-3 rounded-xl bg-parchment px-4 py-3 text-sm font-medium"
                  aria-label={`Ver ${r.title}`}
                >
                  <span>
                    {r.title}
                    <span className="block text-xs font-normal text-ink/55">
                      {EVIDENCE_KIND_LABEL[r.kind]}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-evidence" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function EvidenceDetail() {
  const { id } = useParams({ from: "/evidence/$id" });
  const { items } = useEvidenceList();
  const [remoteItem, setRemoteItem] = useState<EvidenceItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let found: EvidenceItem | null = null;
      try {
        const api = await getContentApi();
        const raw = await safeGetById(api, id);
        if (raw) found = normalizeOne(raw);
      } catch {
        found = null;
      }
      if (!cancelled) {
        setRemoteItem(found);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const item =
    remoteItem ?? items.find((e) => e.id === id) ?? getEvidenceById(id) ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-10 pt-6">
      <Link
        to="/tabs/descubrir"
        className="tap-target inline-flex items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-sea"
        aria-label="Volver a Descubrir"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Atrás
      </Link>

      <div className="mt-2">
        {loading ? (
          <div role="status" aria-live="polite" aria-label="Cargando evidencia">
            <div className="animate-pulse rounded-2xl bg-ink/5 p-5" aria-hidden="true">
              <div className="h-5 w-2/3 rounded bg-ink/10" />
              <div className="mt-3 h-3 w-full rounded bg-ink/10" />
              <div className="mt-2 h-3 w-5/6 rounded bg-ink/10" />
            </div>
          </div>
        ) : item ? (
          <EvidenceCard key={item.id} item={item} />
        ) : (
          <div className="mt-8 rounded-2xl bg-parchment p-8 text-center" role="status">
            <p className="font-display text-xl">No encontramos esta tarjeta</p>
            <p className="mt-2 text-sm text-ink/60">
              Puede que el contenido aún no esté publicado. Explora la
              biblioteca de evidencia disponible.
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-ink/10 pt-2">
        <EvidenceGallery />
      </div>
    </div>
  );
}
