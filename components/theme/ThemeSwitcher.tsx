"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { THEMES } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${active.label}. Change theme`}
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2.5 rounded-full border border-line bg-surface/40 px-3 py-1.5 backdrop-blur-md transition-colors hover:border-fg-muted"
      >
        <span className="flex -space-x-1">
          {active.swatch.map((c, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full ring-1 ring-line"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
          {active.label}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* click-away */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.ul
              role="listbox"
              aria-label="Themes"
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-bg-elev/90 p-1.5 shadow-xl backdrop-blur-xl"
            >
              {THEMES.map((t) => {
                const selected = t.id === theme;
                return (
                  <li key={t.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        selected ? "bg-surface" : "hover:bg-surface/60"
                      }`}
                    >
                      <span className="flex -space-x-1">
                        {t.swatch.map((c, i) => (
                          <span
                            key={i}
                            className="h-4 w-4 rounded-full ring-1 ring-line"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm text-fg">{t.label}</span>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
                          {t.note}
                        </span>
                      </span>
                      {selected && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-accent"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
