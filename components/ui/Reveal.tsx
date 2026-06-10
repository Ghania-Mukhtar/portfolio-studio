"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

interface RevealProps extends HTMLMotionProps<"div"> {
  /** Stagger offset in seconds when several Reveals sit together. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  as?: "div" | "li" | "section" | "span";
}

/**
 * Scroll-in reveal. Fades + lifts content as it enters the viewport, once.
 * Collapses to a plain static element under prefers-reduced-motion.
 * Motivation: hierarchy + sequenced storytelling as the page is read.
 */
export function Reveal({
  delay = 0,
  y = 28,
  as = "div",
  children,
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
