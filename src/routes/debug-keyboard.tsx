import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/debug-keyboard")({
  component: DebugKeyboard,
});

/**
 * Temporary diagnostic screen (not linked in tabs): isolates whether the
 * iOS keyboard freeze comes from the native shell or from app CSS/JS.
 * Each input is progressively more "app-like". The event log shows exactly
 * which step the freeze happens on.
 */
function DebugKeyboard() {
  const [log, setLog] = useState<string[]>([]);
  const add = (msg: string) =>
    setLog((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", background: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Debug teclado</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        Toca cada campo en orden y escribe una letra. Si la app se congela,
        dime en qué número ibas.
      </p>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>1. Campo pelado (sin estilos ni React state)</p>
        <input
          placeholder="toca aquí"
          onFocus={() => add("1: focus")}
          onChange={() => add("1: change")}
          style={{ fontSize: 16, padding: 12, width: "100%", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>2. Con clases Tailwind de la app</p>
        <input
          placeholder="toca aquí"
          onFocus={() => add("2: focus")}
          onChange={() => add("2: change")}
          className="tap-target min-h-[48px] w-full rounded-2xl border border-ink/15 bg-ivory px-4 text-[16px]"
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>3. Dentro de un form (como Historiador)</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add("3: submit");
          }}
        >
          <input
            placeholder="toca aquí"
            onFocus={() => add("3: focus")}
            onChange={() => add("3: change")}
            className="tap-target min-h-[48px] w-full rounded-2xl border border-ink/15 bg-ivory px-4 text-[16px]"
          />
        </form>
      </div>

      <div>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Registro de eventos</p>
        <ul style={{ fontSize: 13, background: "#f4f4f4", padding: 12, borderRadius: 8, minHeight: 120 }}>
          {log.length === 0 && <li style={{ color: "#999" }}>Sin eventos todavía…</li>}
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="keyboard-test.html" style={{ fontSize: 15, fontWeight: 700 }}>
          → Abrir prueba sin JavaScript
        </a>
      </p>
      <p style={{ marginTop: 12 }}>
        <a href="css-test.html" style={{ fontSize: 15, fontWeight: 700 }}>
          → Abrir prueba con CSS pero sin JavaScript
        </a>
      </p>

      <div style={{ marginTop: 24 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>
          4. Input creado con DOM nativo (sin React)
        </p>
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("raw-input-host");
            if (el && !el.querySelector("input")) {
              const input = document.createElement("input");
              input.placeholder = "input nativo, toca aquí";
              input.style.cssText =
                "font-size:16px;padding:12px;width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:8px;";
              el.appendChild(input);
              add("4: input nativo creado");
            }
          }}
          style={{
            fontSize: 15,
            fontWeight: 700,
            padding: "12px 20px",
            background: "#C0563B",
            color: "white",
            border: "none",
            borderRadius: 10,
          }}
        >
          Crear input nativo
        </button>
        <div id="raw-input-host" style={{ marginTop: 10 }} />
      </div>
    </div>
  );
}
