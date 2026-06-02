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
      className="group inline-flex h-10 items-center gap-2 rounded-full border px-2 transition duration-300 sm:h-12 sm:gap-3 sm:px-2.5"
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface)",
        boxShadow: "var(--theme-shadow-lift)",
        opacity: ready ? 1 : 0.85
      }}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7" style={{ color: "var(--theme-text-muted)" }}>
        <MoonStar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>

      <span
        className="relative flex h-6 w-[3.1rem] items-center rounded-full p-1 transition sm:h-7 sm:w-[3.6rem]"
        style={{ background: "color-mix(in srgb, var(--theme-accent) 16%, transparent)" }}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full transition-all duration-300 sm:h-5 sm:w-5"
          style={{
            left: mode === "pearl" ? "calc(100% - 1.25rem)" : "0.25rem",
            background: "linear-gradient(135deg,var(--theme-accent-strong),var(--theme-accent))",
            boxShadow: "0 0 24px color-mix(in srgb, var(--theme-accent) 36%, transparent)"
          }}
        />
      </span>

      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7" style={{ color: "var(--theme-text-muted)" }}>
        <SunMedium className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
    </button>
  );
}
