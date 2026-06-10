"use client";

import { useState, type ReactNode } from "react";
import type { MediaItem } from "@/lib/portfolio-schema";

/* Small, theme-aware form primitives used by the builder.
   Kept deliberately plain: big labels, generous targets, clear focus. */

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-accent";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-fg">
        {label}
        {hint && <span className="text-xs font-normal text-fg-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className={`${inputCls} resize-y leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** A repeatable group of records (projects, experience, certs, ...). */
export function Repeat<T>({
  label,
  items,
  blank,
  onChange,
  render,
  addLabel = "Add",
}: {
  label: string;
  items: T[];
  blank: () => T;
  onChange: (next: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel?: string;
}) {
  function update(i: number, patch: Partial<T>) {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold tracking-tight text-fg">
          {label}
        </h3>
        <button
          type="button"
          onClick={() => onChange([...items, blank()])}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:border-accent"
        >
          + {addLabel}
        </button>
      </div>

      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-fg-faint">
          Nothing yet. Use &ldquo;+ {addLabel}&rdquo; to add one.
        </p>
      )}

      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative rounded-2xl border border-line bg-surface/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${label} ${i + 1}`}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-fg"
              >
                Remove
              </button>
            </div>
            <div className="space-y-3">{render(item, (patch) => update(i, patch))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

/** Upload (embed) or link images/videos. Used for the gallery and per project. */
export function MediaList({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: MediaItem[];
  onChange: (v: MediaItem[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const next = items.slice();
      for (const f of Array.from(files)) {
        const src = await fileToDataUrl(f);
        next.push({
          type: f.type.startsWith("video") ? "video" : "image",
          src,
          alt: f.name.replace(/\.[^.]+$/, ""),
        });
      }
      onChange(next);
    } finally {
      setBusy(false);
    }
  }
  function addUrl() {
    const u = url.trim();
    if (!u) return;
    onChange([
      ...items,
      { type: VIDEO_EXT.test(u) ? "video" : "image", src: u, alt: "" },
    ]);
    setUrl("");
  }
  function update(i: number, patch: Partial<MediaItem>) {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <Field label={label} hint={hint}>
      <div className="rounded-2xl border border-line bg-surface/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-full border border-line bg-surface px-3 py-2 text-sm text-fg transition-colors hover:border-accent">
            {busy ? "Adding..." : "Browse files"}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
          <span className="text-xs text-fg-faint">or</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="Paste image/video URL"
            className="min-w-[10rem] flex-1 rounded-full border border-line bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-faint focus:border-accent"
          />
          <button
            type="button"
            onClick={addUrl}
            className="rounded-full border border-line bg-surface px-3 py-2 text-sm text-fg transition-colors hover:border-accent"
          >
            Add
          </button>
        </div>

        {items.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((m, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-2">
                <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-bg-elev">
                  {m.type === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={m.src} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.src} alt={m.alt} className="h-full w-full object-cover" />
                  )}
                </div>
                <input
                  value={m.alt}
                  onChange={(e) => update(i, { alt: e.target.value })}
                  placeholder="Caption / alt"
                  className="w-full rounded-md border border-line bg-bg-elev px-2 py-1 text-xs text-fg outline-none placeholder:text-fg-faint"
                />
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  className="mt-1.5 w-full rounded-md border border-line px-2 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-fg"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

/** Chip-style editor for a string[] (skills). */
export function SkillsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = value.slice();
    for (const p of parts) {
      if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <Field label="Skills & tools" hint="type and press Enter, or paste comma-separated">
      <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-2">
        {value.map((s, i) => (
          <span
            key={`${s}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-bg-elev px-3 py-1.5 text-sm text-fg"
          >
            {s}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${s}`}
              className="text-fg-faint transition-colors hover:text-fg"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent px-2 py-1.5 text-base text-fg outline-none placeholder:text-fg-faint"
          value={draft}
          placeholder={value.length ? "Add more..." : "Python, React, Figma..."}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && commit(draft)}
        />
      </div>
    </Field>
  );
}
