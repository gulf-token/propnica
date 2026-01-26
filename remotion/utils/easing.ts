/**
 * Shared Easing Functions for Remotion Renderers
 *
 * This module provides all easing functions used across animation components.
 * Easing functions take a progress value (0-1) and return an eased value (0-1).
 */

import type { AnimationEasing } from '../../src/types';

// ===========================================
// Easing Function Implementations
// ===========================================

/**
 * Complete set of easing functions matching AnimationEasing type
 */
export const easingFunctions: Record<AnimationEasing, (t: number) => number> = {
  // Linear
  linear: (t) => t,

  // Quadratic
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 2),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  // Back (overshoot)
  easeInBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeInElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Bounce
  easeInBounce: (t: number): number => 1 - easeOutBounceImpl(1 - t),
  easeOutBounce: easeOutBounceImpl,
};

/**
 * Bounce out implementation (used by other bounce functions)
 */
function easeOutBounceImpl(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

// ===========================================
// Easing Application Utility
// ===========================================

/**
 * Apply an easing function to a progress value
 *
 * @param progress - Raw progress value (0-1)
 * @param easing - Easing function name
 * @returns Eased progress value (0-1), clamped to valid range
 */
export function applyEasing(
  progress: number,
  easing: AnimationEasing = 'easeOutCubic'
): number {
  // Clamp input to 0-1 range
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Get easing function, fallback to easeOutCubic if not found
  const fn = easingFunctions[easing] ?? easingFunctions.easeOutCubic;

  return fn(clampedProgress);
}

/**
 * Get an easing function by name
 *
 * @param easing - Easing function name
 * @returns The easing function, or easeOutCubic as fallback
 */
export function getEasingFunction(
  easing: AnimationEasing
): (t: number) => number {
  return easingFunctions[easing] ?? easingFunctions.easeOutCubic;
}
