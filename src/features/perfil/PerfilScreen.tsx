import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  ChevronRight,
  Crown,
  Download,
  Globe,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  Type,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  deleteAccount,
  sendMagicLink,
  signOut,
  useSupabaseSession,
} from "@/lib/auth";
import {
  LOCKED_PRICES,
  PremiumStatusError,
  isPremiumActive,
  isPurchasesNotConfigured,
  restorePurchases,
} from "@/lib/purchases";
import {
  loadProgress,
  saveProgress,
  type LocalProgress,
} from "@/lib/local-progress";
import { applyAccessibilityPrefs } from "@/lib/a11y";
import DownloadsPanel from "@/features/downloads/DownloadsPanel";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/50">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-parchment shadow-[0_1px_2px_rgba(23,33,43,0.06)]">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  onClick,
  to,
  trailing,
  danger,
}: {
  icon: typeof Mail;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  to?: string;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-destructive/10 text-destructive" : "bg-ink/6 text-ink/70",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span
          className={cn(
            "block text-sm font-semibold",
            danger && "text-destructive",
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="block text-xs text-ink/60">{subtitle}</span>
        )}
      </span>
      {trailing ??
        ((onClick || to) && (
          <ChevronRight
            className="h-5 w-5 shrink-0 text-ink/30"
            aria-hidden="true"
          />
        ))}
    </>
  );
  const cls =
    "tap-target flex w-full items-center gap-3 border-b border-ink/8 px-4 py-3 text-left last:border-0 transition-colors hover:bg-ink/[0.03]";
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** Perfil — account, subscription, library placeholders, accessibility, legal. */
export default function PerfilScreen() {
  const navigate = useNavigate();
  const { user, ready } = useSupabaseSession();
  const [prefs, setPrefs] = useState<LocalProgress>(() => loadProgress());
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [premium, setPremium] = useState<boolean | null>(null);
  const [purchasesNote, setPurchasesNote] = useState<string | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  // Spec §11: a subscription check that cannot complete (offline) must offer
  // retry and restore — never a silent lockout.
  const [statusFailed, setStatusFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function checkPremium() {
    setStatusFailed(false);
    try {
      setPremium(await isPremiumActive());
    } catch (e) {
      if (e instanceof PremiumStatusError) {
        // No cached state and RevenueCat unreachable: keep premium as-is
        // (unknown) and let the user retry or restore.
        setStatusFailed(true);
      } else {
        setPremium(false);
        if (isPurchasesNotConfigured(e)) {
          setPurchasesNote(
            "Las compras se activan en la app de iOS. Aquí ves el estado actual.",
          );
        }
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await checkPremium();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePrefs(patch: Partial<LocalProgress>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveProgress(next);
    applyAccessibilityPrefs();
  }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim()) {
      setAuthError("Escribe tu correo electrónico.");
      return;
    }
    setAuthBusy(true);
    try {
      await sendMagicLink(email);
      setEmailSent(true);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el enlace. Inténtalo de nuevo.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      setPremium(ok.success);
      setStatusFailed(false);
    } catch (err) {
      if (isPurchasesNotConfigured(err)) {
        setPurchasesNote(
          "Restaurar compras estará disponible en la app de iOS.",
        );
      } else {
        setPurchasesNote(
          "No se pudo restaurar. Revisa tu conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteAccount();
      navigate({ to: "/tabs/descubrir" });
    } catch {
      setAuthError(
        "No se pudo eliminar la cuenta. Escríbenos a " + SUPPORT_EMAIL,
      );
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFeedbackState("sending");
    try {
      if (supabase) {
        await supabase.functions.invoke("submit-feedback", {
          body: { message: feedback.trim() },
        });
      }
      setFeedbackState("sent");
      setFeedback("");
    } catch {
      setFeedbackState("error");
    }
  }

  const textScaleLabel = {
    normal: "Normal",
    large: "Grande",
    xlarge: "Extra grande",
  } as const;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6">
      <h1 className="font-display text-3xl">Perfil</h1>

      {/* Account */}
      <Section title="Cuenta">
        {!ready ? (
          <p className="px-4 py-4 text-sm text-ink/60" role="status">
            Cargando…
          </p>
        ) : user ? (
          <>
            <div className="flex items-center gap-3 border-b border-ink/8 px-4 py-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-terracotta/12 font-display text-lg text-terracotta"
              >
                {(user.email?.[0] ?? "?").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {user.email ?? "Cuenta"}
                </p>
                <p className="text-xs text-ink/60">
                  Sesión iniciada · sincronización activada
                </p>
              </div>
            </div>
            <Row
              icon={LogOut}
              title="Cerrar sesión"
              onClick={() => void signOut()}
            />
          </>
        ) : (
          <div className="px-4 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-terracotta" aria-hidden="true" />
              Inicia sesión para sincronizar
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink/60">
              Solo la necesitas para sincronizar tu progreso, guardar favoritos
              en varios dispositivos o suscribirte. Te enviamos un enlace
              mágico: sin contraseñas.
            </p>
            {emailSent ? (
              <p className="mt-3 rounded-xl bg-evidence/10 px-3 py-2.5 text-sm text-evidence-deep" role="status">
                Revisa tu correo: te enviamos un enlace para entrar.
              </p>
            ) : (
              <form onSubmit={handleSendLink} className="mt-3 flex gap-2">
                <label htmlFor="perfil-email" className="sr-only">
                  Correo electrónico
                </label>
                <input
                  id="perfil-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  disabled={!isSupabaseConfigured || authBusy}
                  className="tap-target min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
                <button
                  type="submit"
                  disabled={!isSupabaseConfigured || authBusy}
                  className="tap-target shrink-0 rounded-xl bg-terracotta px-4 text-sm font-semibold text-ivory transition-colors hover:bg-terracotta-deep disabled:opacity-50"
                >
                  {authBusy ? "Enviando…" : "Enviar enlace"}
                </button>
              </form>
            )}
            {authError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {authError}
              </p>
            )}
            {!isSupabaseConfigured && (
              <p className="mt-2 text-xs text-ink/55">
                El inicio de sesión se activará cuando el proyecto esté
                conectado.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Subscription */}
      <Section title="Suscripción">
        <div className="flex items-center gap-3 border-b border-ink/8 px-4 py-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep"
          >
            <Crown className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {premium ? "CronoBiblia Premium" : "Plan gratuito"}
            </p>
            <p className="text-xs text-ink/60">
              {premium
                ? "Acceso completo activado."
                : "Recorrido inicial, mapas y cuestionarios de muestra."}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              premium
                ? "bg-evidence/15 text-evidence-deep"
                : "bg-ink/8 text-ink/60",
            )}
            role="status"
          >
            {premium ? "Activo" : "Gratis"}
          </span>
        </div>
        <Row
          icon={Zap}
          title="Ver planes Premium"
          subtitle={`Mensual $${LOCKED_PRICES.monthly} · Anual $${LOCKED_PRICES.annual}`}
          to="/paywall"
        />
        <Row
          icon={ShieldCheck}
          title="Restaurar compras"
          subtitle="Recupera tu suscripción en este dispositivo"
          onClick={() => void handleRestore()}
          trailing={
            busy ? (
              <span className="text-xs text-ink/50">Verificando…</span>
            ) : undefined
          }
        />
        {statusFailed && (
          <div className="px-4 py-4" role="alert">
            <p className="text-xs leading-relaxed text-ink/65">
              No pudimos verificar tu suscripción (parece que no hay conexión).
              Tu acceso sigue según lo último verificado.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => void checkPremium()}
                disabled={busy}
                className="tap-target rounded-xl bg-ink px-4 text-sm font-semibold text-ivory disabled:opacity-50"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={busy}
                className="tap-target rounded-xl border border-ink/15 px-4 text-sm font-semibold disabled:opacity-50"
              >
                Restaurar compras
              </button>
            </div>
          </div>
        )}
        {purchasesNote && (
          <p className="px-4 py-3 text-xs leading-relaxed text-ink/55">
            {purchasesNote}
          </p>
        )}
      </Section>

      {/* Library placeholders */}
      <Section title="Mi biblioteca">
        <Row
          icon={Bookmark}
          title="Favoritos"
          subtitle="Aún no guardas contenido"
          trailing={
            <span className="rounded-full bg-ink/8 px-2.5 py-1 text-[11px] font-medium text-ink/55">
              Próximamente
            </span>
          }
        />
        <Row
          icon={Download}
          title="Descargas sin conexión"
          subtitle="Paquetes por época para Premium"
          onClick={() => setShowDownloads((v) => !v)}
          trailing={
            <ChevronRight
              className={cn(
                "h-5 w-5 shrink-0 text-ink/30 transition-transform",
                showDownloads && "rotate-90",
              )}
              aria-hidden="true"
            />
          }
        />
        {showDownloads && (
          <div className="border-t border-ink/8 px-2 py-2">
            <DownloadsPanel />
          </div>
        )}
      </Section>

      {/* Language & accessibility */}
      <Section title="Idioma y accesibilidad">
        <Row
          icon={Globe}
          title="Idioma"
          subtitle="Español"
          trailing={
            <span className="text-xs text-ink/50">
              Inglés próximamente
            </span>
          }
        />
        <div className="border-b border-ink/8 px-4 py-3 last:border-0">
          <p className="flex items-center gap-3 text-sm font-semibold">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/6 text-ink/70"
            >
              <Type className="h-5 w-5" />
            </span>
            Tamaño del texto
          </p>
          <div
            className="mt-2 flex gap-2"
            role="radiogroup"
            aria-label="Tamaño del texto"
          >
            {(Object.keys(textScaleLabel) as (keyof typeof textScaleLabel)[]).map(
              (scale) => (
                <button
                  key={scale}
                  type="button"
                  role="radio"
                  aria-checked={prefs.textScale === scale}
                  onClick={() => updatePrefs({ textScale: scale })}
                  className={cn(
                    "tap-target flex-1 rounded-xl border px-3 text-sm font-medium transition-colors",
                    prefs.textScale === scale
                      ? "border-terracotta bg-terracotta/10 text-terracotta"
                      : "border-ink/15 bg-background text-ink/70",
                  )}
                >
                  {textScaleLabel[scale]}
                </button>
              ),
            )}
          </div>
        </div>
        <Row
          icon={Zap}
          title="Reducir movimiento"
          subtitle="Desactiva animaciones de rutas y transiciones"
          trailing={
            <button
              type="button"
              role="switch"
              aria-checked={prefs.reduceMotion}
              aria-label="Reducir movimiento"
              onClick={() => updatePrefs({ reduceMotion: !prefs.reduceMotion })}
              className={cn(
                "tap-target relative h-8 w-14 shrink-0 rounded-full transition-colors",
                prefs.reduceMotion ? "bg-terracotta" : "bg-ink/20",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
                  prefs.reduceMotion ? "left-7" : "left-1",
                )}
              />
            </button>
          }
        />
        <Row
          icon={Users}
          title="Modo familiar"
          subtitle="Letra más grande y lectura en familia"
          trailing={
            <button
              type="button"
              role="switch"
              aria-checked={prefs.familyMode}
              aria-label="Modo familiar"
              onClick={() => updatePrefs({ familyMode: !prefs.familyMode })}
              className={cn(
                "tap-target relative h-8 w-14 shrink-0 rounded-full transition-colors",
                prefs.familyMode ? "bg-sea" : "bg-ink/20",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
                  prefs.familyMode ? "left-7" : "left-1",
                )}
              />
            </button>
          }
        />
      </Section>

      {/* Privacy, sources, feedback */}
      <Section title="Confianza y ayuda">
        <Row
          icon={ShieldCheck}
          title="Privacidad"
          subtitle="Qué datos recogemos y por qué"
          to="/privacy"
        />
        <Row
          icon={Bookmark}
          title="Fuentes y método"
          subtitle="Cómo revisamos cada dato histórico"
          to="/terms"
        />
        <div className="px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-terracotta" aria-hidden="true" />
            Envíanos tu opinión
          </p>
          {feedbackState === "sent" ? (
            <p className="mt-2 rounded-xl bg-evidence/10 px-3 py-2.5 text-sm text-evidence-deep" role="status">
              Gracias: tu mensaje nos ayuda a mejorar.
            </p>
          ) : (
            <form onSubmit={handleFeedback} className="mt-2">
              <label htmlFor="perfil-feedback" className="sr-only">
                Tu opinión
              </label>
              <textarea
                id="perfil-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="¿Qué te gustaría ver en CronoBiblia?"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
              <button
                type="submit"
                disabled={feedbackState === "sending" || !feedback.trim()}
                className="tap-target mt-2 rounded-xl bg-ink px-4 text-sm font-semibold text-ivory transition-opacity disabled:opacity-50"
              >
                {feedbackState === "sending" ? "Enviando…" : "Enviar"}
              </button>
              {feedbackState === "error" && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  No se pudo enviar. Escríbenos a {SUPPORT_EMAIL}.
                </p>
              )}
            </form>
          )}
        </div>
      </Section>

      {/* Danger zone */}
      {user && (
        <Section title="Cuenta">
          <div className="px-4 py-4">
            {!confirmDelete ? (
              <Row
                icon={Trash2}
                title="Eliminar mi cuenta"
                subtitle="Borra tu cuenta y tus datos"
                danger
                onClick={handleDeleteAccount}
              />
            ) : (
              <div
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                role="alert"
              >
                <p className="text-sm font-semibold text-destructive">
                  ¿Eliminar tu cuenta definitivamente?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink/65">
                  Se borrarán tu perfil, tu progreso sincronizado y tus
                  favoritos. Esta acción no se puede deshacer.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="tap-target flex-1 rounded-xl border border-ink/15 bg-background px-4 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={busy}
                    className="tap-target flex-1 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                  >
                    {busy ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      <p className="mt-8 text-center text-xs text-ink/45">
        CronoBiblia · La historia alrededor de la Biblia
      </p>
    </div>
  );
}
