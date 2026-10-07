/**
 * Purchases for CronoBiblia (Track D — real RevenueCat wiring).
 *
 * Contract (unchanged from the Track A stub):
 *   - RevenueCat entitlement: `premium`
 *   - Monthly product: `cronobiblia_premium_monthly` ($6.99, locked 2026-10-03)
 *   - Annual product:  `cronobiblia_premium_annual`  ($49.99, locked 2026-10-03)
 *   - Offering: `default`; packages `$rc_monthly` / `$rc_annual`
 *   - Apple IAP only — never Stripe.
 *
 * Behavior notes:
 *   - `initializePurchases()` configures RevenueCat with the
 *     VITE_REVENUECAT_IOS_KEY env var (public iOS SDK key, baked in at build
 *     time — never a secret). It no-ops gracefully when the key is missing or
 *     the app is not running natively (web preview).
 *   - Purchase / restore calls throw `Error("purchases not configured")` when
 *     the SDK is not configured; callers keep using `isPurchasesNotConfigured`
 *     to degrade (locked prices + "activate in the iOS app" copy).
 *   - `isPremiumActive()` never locks the user out silently: on a network
 *     failure it returns the last validated state cached in localStorage. It
 *     only throws `PremiumStatusError` when there is no cached state at all,
 *     so the UI can offer retry + restore.
 */

import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  PURCHASES_ERROR_CODE,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

export const PRODUCT_IDS = {
  monthly: "cronobiblia_premium_monthly",
  annual: "cronobiblia_premium_annual",
} as const;

export const ENTITLEMENT_ID = "premium";

export const LOCKED_PRICES = {
  monthly: 6.99,
  annual: 49.99,
} as const;

const NOT_CONFIGURED = "purchases not configured";

const PREMIUM_CACHE_KEY = "cronobiblia:premium-cache:v1";

interface PremiumCache {
  premium: boolean;
  checkedAt: number;
}

function notConfiguredError(): Error {
  return new Error(NOT_CONFIGURED);
}

/** True when the thrown error is the not-configured state (not a real failure). */
export function isPurchasesNotConfigured(error: unknown): boolean {
  return error instanceof Error && error.message === NOT_CONFIGURED;
}

// ---------------------------------------------------------------------------
// Local cache: last validated premium state (spec §8 / §11 — graceful offline)
// ---------------------------------------------------------------------------

function readPremiumCache(): PremiumCache | null {
  try {
    const raw = localStorage.getItem(PREMIUM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PremiumCache>;
    if (typeof parsed.premium !== "boolean") return null;
    return {
      premium: parsed.premium,
      checkedAt:
        typeof parsed.checkedAt === "number" ? parsed.checkedAt : 0,
    };
  } catch {
    return null;
  }
}

function writePremiumCache(premium: boolean): void {
  try {
    const entry: PremiumCache = { premium, checkedAt: Date.now() };
    localStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* storage unavailable — premium checks still work, just not cached */
  }
}

function isActiveIn(customerInfo: CustomerInfo): boolean {
  return (
    customerInfo.entitlements?.active?.[ENTITLEMENT_ID]?.isActive === true
  );
}

// ---------------------------------------------------------------------------
// SDK lifecycle
// ---------------------------------------------------------------------------

let initialized = false;
let configured = false;

function isNativeRuntime(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Configures RevenueCat with the public iOS SDK key from
 * `VITE_REVENUECAT_IOS_KEY`. Idempotent. No-ops gracefully when the key is
 * missing or the app is not running on a native platform (web preview):
 * callers that need purchases throw the not-configured error instead.
 */
export async function initializePurchases(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const apiKey = import.meta.env.VITE_REVENUECAT_IOS_KEY as
    | string
    | undefined;
  if (!apiKey || !isNativeRuntime()) return;

  try {
    await Purchases.configure({ apiKey });
    configured = true;
    // Keep the cache warm when RevenueCat pushes entitlement updates
    // (e.g. a renewal or cancellation processed while the app is open).
    await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      writePremiumCache(isActiveIn(customerInfo));
    });
  } catch {
    configured = false;
  }
}

/**
 * Link RevenueCat to the Supabase account so entitlements follow the user.
 *
 * The `revenuecat-webhook` edge function writes the server-side
 * `entitlements` table keyed by `event.app_user_id` — without this call the
 * app user ID stays RevenueCat's anonymous ID (not a UUID), the webhook
 * upsert fails, and server-side premium checks (e.g. historian-chat's
 * `isPremiumFor`) never see the subscription. Paying users would be treated
 * as free on every server-gated feature.
 *
 * Call with the Supabase user id on sign-in (and at launch for a restored
 * session), and with `null` on sign-out. Mirrors miAzucr's proven
 * `linkPurchasesUser`. Non-fatal on failure: on-device purchases keep
 * working via the anonymous ID.
 */
export async function linkPurchasesUser(
  appUserId: string | null,
): Promise<void> {
  await initializePurchases();
  if (!configured) return;
  try {
    if (appUserId) {
      await Purchases.logIn({ appUserID: appUserId });
    } else {
      await Purchases.logOut();
    }
  } catch {
    // Swallow: the link is a server-side convenience, not required for
    // the purchase itself. It will retry on the next sign-in.
  }
}

// ---------------------------------------------------------------------------
// Offerings / prices
// ---------------------------------------------------------------------------

function formatLockedPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

async function findPackage(
  kind: "monthly" | "annual",
): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  const offering =
    offerings.all["default"] ?? offerings.current ?? null;
  if (!offering) return null;
  const byIdentifier = offering.availablePackages.find(
    (p) => p.identifier === (kind === "monthly" ? "$rc_monthly" : "$rc_annual"),
  );
  if (byIdentifier) return byIdentifier;
  const byType = offering.availablePackages.find((p) =>
    kind === "monthly"
      ? p.packageType === PACKAGE_TYPE.MONTHLY
      : p.packageType === PACKAGE_TYPE.ANNUAL,
  );
  return byType ?? null;
}

/**
 * Localized prices from the `default` offering's `$rc_monthly` / `$rc_annual`
 * packages. Falls back to the locked $6.99 / $49.99 display strings whenever
 * the SDK is not configured or the storefront prices are unavailable — this
 * function never throws.
 */
export async function fetchOfferings(): Promise<{
  monthly: { priceString: string };
  annual: { priceString: string };
}> {
  const fallback = {
    monthly: { priceString: formatLockedPrice(LOCKED_PRICES.monthly) },
    annual: { priceString: formatLockedPrice(LOCKED_PRICES.annual) },
  };
  if (!configured) return fallback;
  try {
    const [monthly, annual] = await Promise.all([
      findPackage("monthly"),
      findPackage("annual"),
    ]);
    return {
      monthly: {
        priceString:
          monthly?.product.priceString ?? fallback.monthly.priceString,
      },
      annual: {
        priceString:
          annual?.product.priceString ?? fallback.annual.priceString,
      },
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Purchase flows
// ---------------------------------------------------------------------------

/** Thrown when the user dismisses the Apple purchase sheet. */
export class PurchaseCancelledError extends Error {
  constructor() {
    super("Compra cancelada. Puedes intentarlo de nuevo cuando quieras.");
    this.name = "PurchaseCancelledError";
  }
}

/** True when the error is a user-cancelled purchase (not a real failure). */
export function isPurchaseCancelled(error: unknown): boolean {
  if (error instanceof PurchaseCancelledError) return true;
  if (error instanceof Error) {
    const maybe = error as Error & { userCancelled?: unknown };
    if (maybe.userCancelled === true) return true;
  }
  const rc = error as { code?: unknown } | null;
  return (
    !!rc &&
    (rc.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
      rc.code === "1")
  );
}

async function purchasePackage(
  kind: "monthly" | "annual",
): Promise<{ success: boolean }> {
  if (!configured) throw notConfiguredError();
  const pkg = await findPackage(kind);
  if (!pkg) {
    throw new Error(
      "El plan no está disponible en este momento. Inténtalo de nuevo más tarde.",
    );
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: pkg,
    });
    const premium = isActiveIn(customerInfo);
    writePremiumCache(premium);
    return { success: premium };
  } catch (err) {
    // Log the raw RevenueCat/StoreKit error for diagnostics (visible in Xcode console).
    console.error("[CronoBiblia] purchasePackage failed:", JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})));
    if (isPurchaseCancelled(err)) throw new PurchaseCancelledError();
    if (err instanceof Error && err.message) throw err;
    throw new Error(
      "No se pudo completar la compra. Inténtalo de nuevo o usa «Restaurar compras».",
    );
  }
}

export async function purchaseMonthly(): Promise<{ success: boolean }> {
  return purchasePackage("monthly");
}

export async function purchaseAnnual(): Promise<{ success: boolean }> {
  return purchasePackage("annual");
}

export async function restorePurchases(): Promise<{ success: boolean }> {
  if (!configured) throw notConfiguredError();
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const premium = isActiveIn(customerInfo);
    writePremiumCache(premium);
    return { success: premium };
  } catch (err) {
    if (err instanceof Error && err.message) throw err;
    throw new Error(
      "No se pudo restaurar. Revisa tu conexión e inténtalo de nuevo.",
    );
  }
}

// ---------------------------------------------------------------------------
// Entitlement checks
// ---------------------------------------------------------------------------

/**
 * Thrown by `isPremiumActive()` only when RevenueCat cannot be reached AND
 * there is no cached state to fall back on. The UI must offer retry and
 * restore — never silently lock the user out.
 */
export class PremiumStatusError extends Error {
  constructor() {
    super(
      "No pudimos verificar tu suscripción. Revisa tu conexión e inténtalo de nuevo, o usa «Restaurar compras».",
    );
    this.name = "PremiumStatusError";
  }
}

/**
 * Whether the `premium` entitlement is active. Caches every validated result.
 * On network failure returns the last validated cached state (graceful
 * offline); when the SDK is not configured it returns the cached state (or
 * false). Throws `PremiumStatusError` only when there is nothing cached and
 * the check cannot complete.
 */
export async function isPremiumActive(): Promise<boolean> {
  const cached = readPremiumCache();
  if (!configured) {
    return cached?.premium ?? false;
  }
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const premium = isActiveIn(customerInfo);
    writePremiumCache(premium);
    return premium;
  } catch {
    if (cached) return cached.premium;
    throw new PremiumStatusError();
  }
}

/**
 * Refreshes the cached entitlement against RevenueCat and returns the active
 * state. Never throws: on any failure it returns the last validated cached
 * state (or false). Wire into app launch, login and return-to-foreground.
 */
export async function refreshEntitlement(): Promise<boolean> {
  try {
    return await isPremiumActive();
  } catch {
    return readPremiumCache()?.premium ?? false;
  }
}
