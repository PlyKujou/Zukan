"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

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
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
        style={{ border: "1px solid var(--border)" }}
        title="Switch theme"
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: active?.color }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Theme</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 rounded-2xl p-2 z-50 flex flex-col gap-1 min-w-[132px] origin-top-right"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors text-left hover:bg-[var(--surface)]"
                style={{
                  backgroundColor: current === t.id ? "var(--surface)" : "transparent",
                  color: current === t.id ? "var(--text)" : "var(--text-muted)",
                }}
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                {t.label}
                {current === t.id && <Check size={12} strokeWidth={3} className="ml-auto" style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
