import type { Transition, Variants } from "motion/react";

/**
 * Shared motion tokens so every animation in the app has the same rhythm.
 * Durations follow the 150-300ms micro-interaction band; exits run at roughly
 * two thirds of the enter duration so dismissals feel snappier than reveals.
 */
export const ease = [0.16, 1, 0.3, 1] as const;

export const transition = {
  enter: { duration: 0.26, ease } satisfies Transition,
  exit: { duration: 0.16, ease: "easeIn" } satisfies Transition,
  spring: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } satisfies Transition,
  soft: { type: "spring", stiffness: 260, damping: 30 } satisfies Transition,
};

/** Rises slightly on enter — used for cards, messages and page sections. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: transition.enter },
  exit: { opacity: 0, y: -6, transition: transition.exit },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transition.enter },
  exit: { opacity: 0, transition: transition.exit },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: transition.enter },
  exit: { opacity: 0, scale: 0.98, transition: transition.exit },
};

/** Parent wrapper that releases children 40ms apart (MD stagger guidance). */
export const stagger = (staggerChildren = 0.04, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
  exit: { transition: { staggerChildren: staggerChildren / 2, staggerDirection: -1 } },
});

/** Swapped in when the user asks for reduced motion: state changes, no travel. */
export const still: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
  exit: { opacity: 1 },
};

export function motionVariants(reduced: boolean | null, variants: Variants) {
  return reduced ? still : variants;
}
