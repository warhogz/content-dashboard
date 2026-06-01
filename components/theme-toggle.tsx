"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

type ThemeMode = "burgundy" | "pearl";

const STORAGE_KEY = "content-dashboard-theme";

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode === "pearl" ? "pearl" : "burgundy";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("burgundy");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextMode: ThemeMode = stored === "pearl" ? "pearl" : "burgundy";
    setMode(nextMode);
    applyTheme(nextMode);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const nextMode: ThemeMode = mode === "burgundy" ? "pearl" : "burgundy";
    setMode(nextMode);
    applyTheme(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mode === "burgundy" ? "Включить светлую тему" : "Включить бордовую тему"}
      className="group inline-flex h-12 items-center gap-3 rounded-full border px-2.5 transition duration-300"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface)",
        boxShadow: "var(--theme-shadow-lift)",
        opacity: ready ? 1 : 0.85
      }}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ color: "var(--theme-text-muted)" }}>
        <MoonStar className="h-4 w-4" />
      </span>
      <span
        className="relative flex h-7 w-[3.6rem] items-center rounded-full p-1 transition"
        style={{ background: "color-mix(in srgb, var(--theme-accent) 16%, transparent)" }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full transition-all duration-300"
          style={{
            left: mode === "pearl" ? "calc(100% - 1.5rem)" : "0.25rem",
            background: "linear-gradient(135deg,var(--theme-accent-strong),var(--theme-accent))",
            boxShadow: "0 0 24px color-mix(in srgb, var(--theme-accent) 36%, transparent)"
          }}
        />
      </span>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ color: "var(--theme-text-muted)" }}>
        <SunMedium className="h-4 w-4" />
      </span>
    </button>
  );
}
