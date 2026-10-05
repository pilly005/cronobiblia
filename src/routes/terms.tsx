import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";
import { SUPPORT_EMAIL, APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

const SECTIONS = [
  {
    title: "Qué es CronoBiblia",
    text: "CronoBiblia es una app educativa de historia bíblica: cronologías, mapas, evidencia arqueológica, recorridos guiados y cuestionarios. No es un lector bíblico ni una autoridad doctrinal.",
  },
  {
    title: "Nuestro método",
    text: "Separamos tres capas en cada dato: lo que presenta el texto bíblico, lo que indica la evidencia externa y lo que es interpretación. Las fechas en debate se muestran como rangos, y cada tarjeta factual expone sus fuentes.",
  },
  {
    title: "Contenido",
    text: "Todo el contenido es revisado por personas antes de publicarse. Las citas bíblicas son breves y contextuales; la app no sustituye a una Biblia completa. Para el lanzamiento en español usamos textos de dominio público.",
  },
  {
    title: "Suscripciones",
    text: "CronoBiblia Premium se vende como suscripción mensual o anual a través de Apple In-App Purchase. La suscripción se renueva automáticamente hasta que la canceles en los Ajustes de tu iPhone.",
  },
  {
    title: "Uso aceptable",
    text: "No publiques ni compartas contenido desde la app con fines que violen la ley. El contenido de la app es para tu aprendizaje personal.",
  },
  {
    title: "Contacto",
    text: `Preguntas o correcciones de contenido: escríbenos a ${SUPPORT_EMAIL}.`,
  },
];

function Terms() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <Link
        to="/tabs/perfil"
        className="tap-target inline-flex items-center gap-2 rounded-lg px-2 text-sm font-medium text-sea"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a Perfil
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
        <ScrollText className="h-7 w-7 text-terracotta" aria-hidden="true" />
        Términos y método
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        {APP_NAME} · Última actualización: octubre de 2026
      </p>
      <div className="mt-6 flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl bg-parchment p-5 shadow-[0_1px_2px_rgba(23,33,43,0.06)]"
          >
            <h2 className="font-display text-lg">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{s.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
