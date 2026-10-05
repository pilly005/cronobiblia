import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Landmark,
  Map as MapIcon,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_PROMISE, APP_TAGLINE } from "@/lib/brand";
import {
  INTEREST_OPTIONS,
  loadProgress,
  saveProgress,
} from "@/lib/local-progress";

const EXPLAINERS = [
  {
    icon: Clock3,
    title: "Explora la cronología",
    text: "Descubre cuándo ocurrieron los eventos bíblicos, qué imperios los rodeaban y dónde las fechas siguen en debate.",
    color: "bg-terracotta/12 text-terracotta",
  },
  {
    icon: MapIcon,
    title: "Sigue los mapas",
    text: "Recorre los viajes de Abraham, el éxodo y Pablo paso a paso sobre mapas ilustrados, con rutas marcadas según su certeza.",
    color: "bg-sea/12 text-sea",
  },
  {
    icon: Landmark,
    title: "Examina la evidencia",
    text: "Artefactos, inscripciones y sitios arqueológicos: qué aporta cada hallazgo y, con honestidad, qué no demuestra.",
    color: "bg-evidence/12 text-evidence",
  },
];

/**
 * First-run flow (spec §4): brand screen → three explainer cards → interest
 * selection → optional family mode → guest start. Sign-in is only asked later,
 * when the user wants sync, bookmarks across devices or premium.
 */
export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [familyMode, setFamilyMode] = useState(false);

  const lastStep = 4;

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function finish() {
    const p = loadProgress();
    saveProgress({
      ...p,
      onboardingDone: true,
      interests,
      familyMode,
    });
    navigate({ to: "/tabs/descubrir" });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-ink">
      {/* Progress dots */}
      <div
        className="flex items-center justify-center gap-2 px-6 pt-10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={lastStep + 1}
        aria-valuenow={step + 1}
        aria-label={`Paso ${step + 1} de ${lastStep + 1}`}
      >
        {Array.from({ length: lastStep + 1 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i === step ? "w-8 bg-terracotta" : "w-2 bg-ink/15",
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col px-6 pb-8 pt-6">
        {step === 0 && (
          <div className="animate-fade-in flex flex-1 flex-col items-center justify-center text-center">
            <span
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-3xl bg-ink text-ivory"
            >
              <ScrollText className="h-10 w-10" />
            </span>
            <h1 className="mt-6 font-display text-4xl">{APP_NAME}</h1>
            <p className="mt-2 text-lg font-medium text-terracotta">
              {APP_TAGLINE}
            </p>
            <p className="mt-4 max-w-xs text-base leading-relaxed text-ink/70">
              {APP_PROMISE}
            </p>
          </div>
        )}

        {step >= 1 && step <= 3 && (
          <div
            key={step}
            className="animate-fade-in flex flex-1 flex-col items-center justify-center text-center"
          >
            {(() => {
              const card = EXPLAINERS[step - 1];
              const Icon = card.icon;
              return (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-3xl",
                      card.color,
                    )}
                  >
                    <Icon className="h-10 w-10" />
                  </span>
                  <h2 className="mt-6 font-display text-3xl">{card.title}</h2>
                  <p className="mt-4 max-w-sm text-base leading-relaxed text-ink/70">
                    {card.text}
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in flex flex-1 flex-col">
            <h2 className="font-display text-3xl">¿Qué te interesa?</h2>
            <p className="mt-2 text-sm text-ink/60">
              Elige lo que quieras explorar primero. Puedes cambiarlo cuando
              quieras.
            </p>
            <div
              className="mt-5 flex flex-col gap-2"
              role="group"
              aria-label="Temas de interés"
            >
              {INTEREST_OPTIONS.map((opt) => {
                const active = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    aria-pressed={active}
                    className={cn(
                      "tap-target flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-terracotta bg-terracotta/10"
                        : "border-ink/15 bg-parchment",
                    )}
                  >
                    <span>
                      <span className="block text-base font-semibold">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-ink/60">
                        {opt.description}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-terracotta bg-terracotta text-ivory"
                          : "border-ink/25 text-transparent",
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setFamilyMode((v) => !v)}
              aria-pressed={familyMode}
              className={cn(
                "tap-target mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                familyMode
                  ? "border-sea bg-sea/10"
                  : "border-ink/15 bg-parchment",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  familyMode ? "bg-sea text-ivory" : "bg-sea/12 text-sea",
                )}
              >
                <Users className="h-5 w-5" />
              </span>
              <span>
                <span className="flex items-center gap-2 text-base font-semibold">
                  Modo familiar
                  <span className="rounded-full bg-sea/15 px-2 py-0.5 text-[11px] font-medium text-sea">
                    Opcional
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink/60">
                  Presentación pensada para leer en familia: letra más grande y
                  párrafos más cortos. No crea cuentas infantiles ni recoge
                  datos de menores.
                </span>
              </span>
            </button>
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              aria-label="Atrás"
              className="tap-target flex items-center justify-center rounded-xl border border-ink/15 bg-parchment px-4 text-ink transition-colors hover:bg-ink/5"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => (step < lastStep ? setStep((s) => s + 1) : finish())}
            className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-terracotta px-5 text-base font-semibold text-ivory transition-colors hover:bg-terracotta-deep"
          >
            {step === 0 ? (
              <>
                Comenzar <Sparkles className="h-5 w-5" aria-hidden="true" />
              </>
            ) : step < lastStep ? (
              <>
                Siguiente <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            ) : (
              "Empezar como invitado"
            )}
          </button>
        </div>

        {step === lastStep && (
          <p className="mt-4 text-center text-xs leading-relaxed text-ink/55">
            No necesitas una cuenta para empezar. Te la pediremos solo si
            quieres sincronizar tu progreso, guardar favoritos en varios
            dispositivos o suscribirte a Premium.
          </p>
        )}
      </div>
    </div>
  );
}
