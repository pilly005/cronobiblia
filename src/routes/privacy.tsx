import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SUPPORT_EMAIL, APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

const SECTIONS = [
  {
    title: "Qué recogemos",
    text: "Solo lo necesario para que la app funcione: tu correo electrónico si inicias sesión, tu progreso de aprendizaje, tus favoritos y la información de tu suscripción. No pedimos contactos, ubicación precisa, micrófono, cámara ni datos de salud.",
  },
  {
    title: "Modo invitado",
    text: "Puedes usar CronoBiblia sin crear una cuenta. En ese caso tu progreso se guarda solo en tu dispositivo y no se sincroniza.",
  },
  {
    title: "Modo familiar",
    text: "El modo familiar cambia la presentación para leer en familia. No crea cuentas infantiles ni recoge nombres, fechas de nacimiento, fotos o grabaciones de menores.",
  },
  {
    title: "Compras",
    text: "Las suscripciones se procesan con Apple In-App Purchase a través de RevenueCat. Nunca vemos ni almacenamos los datos de tu tarjeta.",
  },
  {
    title: "Tus derechos",
    text: "Puedes cerrar sesión cuando quieras y eliminar tu cuenta desde Perfil. Al eliminar tu cuenta borramos o anonimizamos tus registros personales según esta política.",
  },
  {
    title: "Contacto",
    text: `Si tienes preguntas sobre privacidad, escríbenos a ${SUPPORT_EMAIL}.`,
  },
];

function Privacy() {
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
        <ShieldCheck className="h-7 w-7 text-evidence" aria-hidden="true" />
        Privacidad
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
