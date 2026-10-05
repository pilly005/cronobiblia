import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Check,
  Crown,
  Download,
  Landmark,
  MessageCircleQuestion,
  RotateCcw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import {
  LOCKED_PRICES,
  fetchOfferings,
  isPurchaseCancelled,
  isPurchasesNotConfigured,
  purchaseAnnual,
  purchaseMonthly,
  restorePurchases,
} from "@/lib/purchases";

const BENEFITS = [
  {
    icon: BookOpen,
    text: "Todas las eras, recorridos, mapas y cuestionarios",
  },
  {
    icon: Landmark,
    text: "Biblioteca completa de evidencia arqueológica con fuentes",
  },
  {
    icon: Download,
    text: "Paquetes sin conexión para estudiar donde quieras",
  },
  {
    icon: MessageCircleQuestion,
    text: "Pregunta al Historiador: respuestas con citas, sin inventos",
  },
  {
    icon: Users,
    text: "Lecciones familiares para leer juntos",
  },
];

type Plan = "monthly" | "annual";

/**
 * Paywall (Track A). Spanish-first, no fake discounts or countdowns.
 * The annual plan is visually preferred. Until Track D wires RevenueCat,
 * purchase attempts throw "purchases not configured" and we explain that
 * subscriptions activate in the iOS app.
 */
export default function PaywallScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Localized storefront prices; fall back to the locked prices until the
  // SDK is configured (web preview / build without the iOS key).
  const [prices, setPrices] = useState({
    monthly: `$${LOCKED_PRICES.monthly}`,
    annual: `$${LOCKED_PRICES.annual}`,
  });

  useEffect(() => {
    let cancelled = false;
    fetchOfferings()
      .then((o) => {
        if (!cancelled) {
          setPrices({ monthly: o.monthly.priceString, annual: o.annual.priceString });
        }
      })
      .catch(() => {
        /* fetchOfferings never throws; locked prices remain */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchase() {
    setBusy(true);
    setMessage(null);
    try {
      const result =
        selected === "annual" ? await purchaseAnnual() : await purchaseMonthly();
      if (result.success) {
        navigate({ to: "/tabs/descubrir" });
      } else {
        setMessage("La compra no se completó. Puedes intentarlo de nuevo.");
      }
    } catch (err) {
      if (isPurchasesNotConfigured(err)) {
        setMessage(
          "Las suscripciones se activan en la app de iOS. Abre CronoBiblia en tu iPhone para completar la compra.",
        );
      } else if (isPurchaseCancelled(err)) {
        setMessage("Compra cancelada. Puedes intentarlo de nuevo cuando quieras.");
      } else {
        setMessage(
          "No se pudo completar la compra. Inténtalo de nuevo o usa «Restaurar compras».",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await restorePurchases();
      if (ok) {
        navigate({ to: "/tabs/descubrir" });
      } else {
        setMessage("No encontramos una suscripción activa en esta cuenta de Apple.");
      }
    } catch (err) {
      if (isPurchasesNotConfigured(err)) {
        setMessage(
          "«Restaurar compras» estará disponible en la app de iOS.",
        );
      } else {
        setMessage("No se pudo restaurar. Inténtalo de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  const plans: {
    id: Plan;
    name: string;
    price: string;
    per: string;
    badge?: string;
  }[] = [
    {
      id: "annual",
      name: "Anual",
      price: prices.annual,
      per: "por año",
      badge: "Recomendado",
    },
    {
      id: "monthly",
      name: "Mensual",
      price: prices.monthly,
      per: "por mes",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-ivory">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-8 pt-6">
        <Link
          to="/tabs/descubrir"
          aria-label="Volver"
          className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-full bg-ivory/10 text-ivory transition-colors hover:bg-ivory/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gold/20 text-gold"
          >
            <Crown className="h-8 w-8" />
          </span>
          <h1 className="mt-4 font-display text-3xl">
            {APP_NAME} Premium
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ivory/75">
            Desbloquea toda la historia: cada época, cada mapa, cada hallazgo
            y el Historiador que responde con fuentes.
          </p>
        </div>

        <ul className="mt-6 flex flex-col gap-2.5">
          {BENEFITS.map((b) => (
            <li key={b.text} className="flex items-start gap-3 text-sm">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold"
              >
                <b.icon className="h-4 w-4" />
              </span>
              <span className="pt-1 text-ivory/90">{b.text}</span>
            </li>
          ))}
        </ul>

        {/* Plans */}
        <div
          className="mt-7 flex flex-col gap-3"
          role="radiogroup"
          aria-label="Elige tu plan"
        >
          {plans.map((plan) => {
            const active = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(plan.id)}
                className={cn(
                  "tap-target relative flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-colors",
                  active
                    ? "border-gold bg-gold/10"
                    : "border-ivory/15 bg-ivory/5 hover:border-ivory/30",
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-4 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">
                    {plan.badge}
                  </span>
                )}
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      active ? "border-gold text-gold" : "border-ivory/30 text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold">
                      {plan.name}
                    </span>
                    <span className="block text-xs text-ivory/60">
                      {plan.per}
                    </span>
                  </span>
                </span>
                <span className="font-display text-2xl">{plan.price}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={busy}
          className="tap-target mt-6 flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-4 text-base font-bold text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
        >
          <BadgeCheck className="h-5 w-5" aria-hidden="true" />
          {busy
            ? "Procesando…"
            : `Continuar con ${selected === "annual" ? "Anual" : "Mensual"} · ${selected === "annual" ? prices.annual : prices.monthly}`}
        </button>

        {message && (
          <p
            className="mt-3 rounded-xl bg-ivory/10 px-4 py-3 text-center text-sm leading-relaxed text-ivory/85"
            role="status"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={busy}
          className="tap-target mx-auto mt-2 inline-flex items-center gap-2 rounded-lg px-4 text-sm font-medium text-ivory/70 underline-offset-4 hover:underline disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Restaurar compras
        </button>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-ivory/50">
          El pago se cargará a tu cuenta de Apple al confirmar la compra. La
          suscripción se renueva automáticamente hasta que la canceles en los
          Ajustes de tu iPhone, al menos 24 horas antes de que termine el
          periodo actual.
        </p>
      </div>
    </div>
  );
}
