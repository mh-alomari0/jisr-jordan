"use client";

import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

const modes: ThemeMode[] = ["light", "dark", "system"];

const labels: Record<ThemeMode, string> = {
  light: "الوضع الفاتح",
  dark: "الوضع الداكن",
  system: "حسب الجهاز",
};

function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;

  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem("jisr-theme");
    const next = modes.includes(saved as ThemeMode)
      ? (saved as ThemeMode)
      : "system";

    const timer = window.setTimeout(() => setMode(next), 0);
    applyTheme(next);

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const listener = () => {
      if (
        (window.localStorage.getItem("jisr-theme") || "system") ===
        "system"
      ) {
        applyTheme("system");
      }
    };

    media.addEventListener("change", listener);

    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", listener);
    };
  }, []);

  const change = () => {
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];

    window.localStorage.setItem("jisr-theme", next);
    setMode(next);
    applyTheme(next);
  };

  const Icon =
    mode === "light" ? Sun : mode === "dark" ? Moon : Laptop;

  return (
    <button
      type="button"
      onClick={change}
      title={labels[mode]}
      aria-label={`${labels[mode]} — اضغط لتغيير المظهر`}
      className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-theme bg-surface text-muted shadow-[0_4px_15px_rgb(var(--shadow)/0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.28)] hover:bg-surface-muted hover:text-brand hover:shadow-[0_8px_22px_rgb(var(--shadow)/0.08)] active:translate-y-0 active:scale-[0.92]"
    >
      <Icon
        className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:rotate-6 group-hover:scale-105"
        aria-hidden="true"
      />
    </button>
  );
}
