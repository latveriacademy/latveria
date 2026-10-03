/**
 * Latveria Motion System Design Tokens
 * Figma-inspired physics: subtle scale, tactile spring, hardware-accelerated.
 */

export const motionTokens = {
  duration: {
    instant: 0,
    micro: 100, // Micro-interactions (clicks, toggles)
    fast: 160, // Hover, focus, small popups
    normal: 240, // Component transitions, cards, panels
    smooth: 340, // Layout movements, expand/collapse, modals
    page: 280, // Page transitions
    number: 700, // Numeric count-up animation
  },
  ease: {
    // Figma standard snappy curve
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    // Fluid natural spring for press releases and modal popups
    spring: "cubic-bezier(0.16, 1, 0.3, 1)",
    // Bounceless gentle deceleration
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    // Snappy exit curve
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
  scale: {
    hover: 1.015,
    press: 0.98,
    active: 0.97,
    pop: 1.04,
    dialog: 0.98,
  },
  elevation: {
    hoverLift: "-2px",
    activeDrop: "0px",
  },
} as const;

export type MotionDuration = keyof typeof motionTokens.duration;
export type MotionEase = keyof typeof motionTokens.ease;
