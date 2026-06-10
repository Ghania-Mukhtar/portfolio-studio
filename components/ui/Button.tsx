"use client";

import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  /** primary = filled accent + edge; ghost = strong outline. Both tactile. */
  variant?: "primary" | "ghost";
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  target?: string;
  rel?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  title?: string;
}

/**
 * The one button used everywhere. A "pressable pill": filled/outlined pill
 * with a layered bottom edge + drop shadow that make it read as a physical,
 * pressable control (and stays legible for color-blind users, since the
 * affordance is shape + shadow, not color). Presses down on :active.
 * Renders an <a> when `href` is set, otherwise a <button>.
 */
export function Button({
  children,
  variant = "primary",
  href,
  onClick,
  type = "button",
  target,
  rel,
  disabled,
  className = "",
  title,
  ...aria
}: ButtonProps) {
  const cls = `btn ${variant === "primary" ? "btn-primary" : "btn-ghost"} group ${className}`.trim();

  if (href && !disabled) {
    return (
      <a
        className={cls}
        href={href}
        target={target}
        rel={rel}
        title={title}
        aria-label={aria["aria-label"]}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={cls}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={aria["aria-label"]}
    >
      {children}
    </button>
  );
}
