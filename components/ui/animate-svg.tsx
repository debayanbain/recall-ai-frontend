"use client";

import { useState } from "react";
import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

export type HoverAnimationType = "redraw" | "float" | "pulse" | "color" | "none";

export type AnimateSvgProps = {
  /** The `d` attribute of the path to draw. */
  path: string;
  viewBox: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeLinecap?: "butt" | "round" | "square";
  /** Seconds. */
  animationDuration?: number;
  /** Seconds. */
  animationDelay?: number;
  /** 0 = no overshoot, 1 = very springy. */
  animationBounce?: number;
  /** Draw from the end of the path instead of the start. */
  reverseAnimation?: boolean;
  enableHoverAnimation?: boolean;
  hoverAnimationType?: HoverAnimationType;
  hoverStrokeColor?: string;
  /** Keep animating forever instead of drawing once. */
  loop?: boolean;
  /**
   * `mirror` un-draws the line back the way it came (A→B, then B→A) — no snap.
   * `restart` jumps back to empty and draws again.
   */
  loopMode?: "mirror" | "restart";
  /** Seconds the line rests at each end before it moves again. */
  loopDelay?: number;
  /** Replays the draw whenever this changes. */
  replayKey?: number;
};

const hoverMotion: Record<HoverAnimationType, TargetAndTransition> = {
  redraw: {},
  float: { y: [0, -4, 0] },
  pulse: { scale: [1, 1.04, 1] },
  color: {},
  none: {},
};

export function AnimateSvg({
  path,
  viewBox,
  width = "100%",
  height = "100%",
  className,
  strokeColor = "currentColor",
  strokeWidth = 3,
  strokeLinecap = "round",
  animationDuration = 1.5,
  animationDelay = 0,
  animationBounce = 0.3,
  reverseAnimation = false,
  enableHoverAnimation = false,
  hoverAnimationType = "redraw",
  hoverStrokeColor,
  loop = false,
  loopMode = "mirror",
  loopDelay = 2,
  replayKey = 0,
}: AnimateSvgProps) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  // Remounting the path restarts the draw — that is the whole "redraw" effect.
  const [redraws, setRedraws] = useState(0);

  const hoverable = enableHoverAnimation && !reduced && hoverAnimationType !== "none";
  const stroke = hovered && hoverStrokeColor ? hoverStrokeColor : strokeColor;

  // One explicit cycle — draw, hold at full, wipe back off — instead of a
  // spring plus repeatDelay, which parked the line at empty and read as a hang.
  const eraseDuration = animationDuration * 0.55;
  const cycle = animationDuration + loopDelay + eraseDuration;

  const draw: Transition = reduced
    ? { duration: 0 }
    : loop
      ? {
          duration: cycle,
          delay: animationDelay,
          times: [
            0,
            animationDuration / cycle,
            (animationDuration + loopDelay) / cycle,
            1,
          ],
          ease: ["easeOut", "linear", "easeInOut"],
          repeat: Infinity,
          repeatType: loopMode === "mirror" ? ("loop" as const) : ("loop" as const),
        }
      : {
          type: "spring",
          bounce: animationBounce,
          duration: animationDuration,
          delay: animationDelay,
        };

  // Looping keyframes: 0 → full → hold → wiped. Reverse swaps which end the
  // line grows from, so the wipe always chases the draw.
  const pathLength = loop && !reduced ? [0, 1, 1, 0] : 1;
  const pathOffset =
    loop && !reduced ? (reverseAnimation ? [1, 0, 0, 1] : [0, 0, 0, 1]) : 0;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      // Decorative flourish — never announced, never focusable.
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none overflow-visible", hoverable && "pointer-events-auto", className)}
      animate={hovered && hoverable ? hoverMotion[hoverAnimationType] : { y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      onHoverStart={() => {
        if (!hoverable) return;
        setHovered(true);
        if (hoverAnimationType === "redraw") setRedraws((n) => n + 1);
      }}
      onHoverEnd={() => setHovered(false)}
    >
      <motion.path
        key={`${replayKey}-${redraws}`}
        d={path}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        fill="none"
        vectorEffect="non-scaling-stroke"
        initial={
          reduced
            ? { pathLength: 1, pathOffset: 0 }
            : { pathLength: 0, pathOffset: reverseAnimation ? 1 : 0 }
        }
        animate={{ pathLength, pathOffset }}
        transition={draw}
        style={{ transition: "stroke 200ms ease" }}
      />
    </motion.svg>
  );
}
