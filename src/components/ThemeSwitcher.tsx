"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "sakura",   label: "Sakura",   color: "#f43f5e" },
  { id: "ocean",    label: "Ocean",    color: "#38bdf8" },
  { id: "forest",   label: "Forest",   color: "#4ade80" },
  { id: "midnight", label: "Midnight", color: "#a78bfa" },
  { id: "ember",    label: "Ember",    color: "#fb923c" },
];

export function ThemeSwitcher() {
  const [current, setCurrent] = useState("sakura");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("zukan-theme") ?? "sakura";
    setCurrent(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function pick(id: string) {
    setCurrent(id);
    localStorage.setItem("zukan-theme", id);
    document.documentElement.setAttribute("data-theme", id);
    setOpen(false);
  }

  const active = THEMES.find((t) => t.id === current);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
        title="Switch theme"
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: active?.color }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Theme</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 rounded-xl p-2 z-50 flex flex-col gap-1 min-w-[130px]"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors text-left"
              style={{
                backgroundColor: current === t.id ? "var(--surface-2)" : "transparent",
                color: current === t.id ? "var(--text)" : "var(--text-muted)",
              }}
            >
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              {t.label}
              {current === t.id && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
