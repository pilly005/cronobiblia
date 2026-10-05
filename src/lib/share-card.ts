/**
 * CronoBiblia — "Un día como hoy" share card.
 *
 * Renders a 1080×1920 story-format PNG on a <canvas> (no server needed)
 * and shares it through the native share sheet on iOS (Capacitor Share +
 * Filesystem) or navigator.share / download on web.
 */

import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { APP_NAME, WEBSITE_URL } from "@/lib/brand";
import type { TodayFact } from "@/lib/daily-fact";
import { spanishDate } from "@/lib/daily-fact";

const W = 1080;
const H = 1920;

const INK = "#141c26";
const INK_DEEP = "#0c1119";
const IVORY = "#f7f1e5";
const GOLD = "#c49a45";
const TERRA = "#b85c38";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Render the card and return a PNG blob. */
export async function renderShareCard(fact: TodayFact): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  // Background: deep ink gradient with a warm vignette.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, INK);
  bg.addColorStop(0.55, "#101722");
  bg.addColorStop(1, INK_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow behind the text area.
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, 640);
  glow.addColorStop(0, "rgba(196,154,69,0.10)");
  glow.addColorStop(1, "rgba(196,154,69,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Thin gold frame.
  ctx.strokeStyle = "rgba(196,154,69,0.55)";
  ctx.lineWidth = 3;
  roundRect(ctx, 44, 44, W - 88, H - 88, 28);
  ctx.stroke();

  const cx = W / 2;

  // Eyebrow.
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = "600 44px system-ui, -apple-system, sans-serif";
  try {
    (ctx as any).letterSpacing = "10px";
  } catch {
    /* older canvas: ignore */
  }
  ctx.fillText("UN DÍA COMO HOY", cx, 210);
  try {
    (ctx as any).letterSpacing = "0px";
  } catch {
    /* ignore */
  }

  // Date.
  ctx.fillStyle = "rgba(247,241,229,0.75)";
  ctx.font = "400 40px system-ui, -apple-system, sans-serif";
  ctx.fillText(spanishDate(), cx, 270);

  // Gold rule.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 120, 320);
  ctx.lineTo(cx + 120, 320);
  ctx.stroke();
  // Small diamond on the rule.
  ctx.save();
  ctx.translate(cx, 320);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-11, -11, 22, 22);
  ctx.restore();

  // Fact title + body: measure first, then vertically center the block
  // between the header rule and the footer so short facts don't leave
  // a big empty middle.
  ctx.textAlign = "center";
  ctx.font = "700 54px Georgia, 'Times New Roman', serif";
  const titleLines = wrapText(ctx, fact.title, W - 220).slice(0, 3);
  ctx.font = "400 46px Georgia, 'Times New Roman', serif";
  const bodyLines = wrapText(ctx, fact.text, W - 200).slice(0, 16);

  const titleLH = 72;
  const bodyLH = 70;
  const gap = 30;
  const blockH = titleLines.length * titleLH + gap + bodyLines.length * bodyLH;
  const topBound = 400;
  const botBound = H - 400;
  let y = topBound + Math.max(0, (botBound - topBound - blockH) / 2) + titleLH * 0.8;

  ctx.fillStyle = TERRA;
  ctx.font = "700 54px Georgia, 'Times New Roman', serif";
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += titleLH;
  }

  y += gap;
  ctx.fillStyle = IVORY;
  ctx.font = "400 46px Georgia, 'Times New Roman', serif";
  for (const line of bodyLines) {
    ctx.fillText(line, cx, y);
    y += bodyLH;
  }

  // Footer brand block.
  const fy = H - 250;
  ctx.strokeStyle = "rgba(196,154,69,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 200, fy - 60);
  ctx.lineTo(cx + 200, fy - 60);
  ctx.stroke();

  ctx.fillStyle = IVORY;
  ctx.font = "700 64px Georgia, 'Times New Roman', serif";
  ctx.fillText(APP_NAME, cx, fy + 10);

  ctx.fillStyle = GOLD;
  ctx.font = "400 38px system-ui, -apple-system, sans-serif";
  ctx.fillText(WEBSITE_URL.replace(/^https?:\/\//, ""), cx, fy + 70);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))),
      "image/png",
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Share the fact: image card + text through the native share sheet. */
export async function shareTodayFact(fact: TodayFact): Promise<"shared" | "dismissed"> {
  const text =
    `Un día como hoy en la historia bíblica:\n\n${fact.title}\n${fact.text}\n\n— vía ${APP_NAME} · ${WEBSITE_URL}`;
  const title = "Un día como hoy · CronoBiblia";

  try {
    const blob = await renderShareCard(fact);

    if (Capacitor.isNativePlatform()) {
      const base64 = await blobToBase64(blob);
      const fileName = `cronobiblia-hoy-${fact.day}.png`;
      const { uri } = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ title, text, files: [uri], dialogTitle: "Compartir" });
      return "shared";
    }

    const file = new File([blob], `cronobiblia-hoy-${fact.day}.png`, {
      type: "image/png",
    });
    if (
      typeof navigator !== "undefined" &&
      "canShare" in navigator &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title, text });
      return "shared";
    }
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share({ title, text });
      return "shared";
    }

    // Fallback: download the card.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cronobiblia-hoy-${fact.day}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "shared";
  } catch (err) {
    // User dismissing the sheet throws AbortError — not a failure.
    if (err instanceof DOMException && err.name === "AbortError") return "dismissed";
    throw err;
  }
}
