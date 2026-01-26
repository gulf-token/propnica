/**
 * ZoneRenderer Component
 *
 * Renders animated polygon zones with fade in/out, scaling, and glow effects.
 * Used in Remotion compositions to display geographic zones on the map.
 */

import React from 'react';
import type { Zone, ElementTiming, AnimationEasing } from '../../src/types';
import {
  ViewState,
  ScreenPoint,
  projectToScreen,
  calculatePolygonCentroid,
} from '../utils/projection';
import { applyEasing } from '../utils/easing';

// ===========================================
// Types
// ===========================================

interface ZoneRendererProps {
  zones: Zone[];
  viewState: ViewState;
  width: number;
  height: number;
  frame?: number;
  fps?: number;
  currentTimeMs?: number;
}

interface AnimationState {
  opacity: number;
  scale: number;
}

interface AnimatedZoneProps {
  zone: Zone;
  viewState: ViewState;
  width: number;
  height: number;
  animState: AnimationState;
}

// ===========================================
// Animation Calculation
// ===========================================

/**
 * Calculate zone animation state based on timing configuration
 *
 * @param timing - Element timing configuration
 * @param currentTimeMs - Current time in milliseconds
 * @param entryEasing - Easing function for fade in
 * @param exitEasing - Easing function for fade out
 * @returns Animation state with opacity and scale
 */
function calculateZoneAnimation(
  timing: ElementTiming | undefined,
  currentTimeMs: number,
  entryEasing: AnimationEasing = 'easeOutCubic',
  exitEasing: AnimationEasing = 'easeInCubic'
): AnimationState {
  // Default timing if not provided
  if (!timing) {
    return { opacity: 1, scale: 1 };
  }

  const { startTime, endTime, fadeInDuration, fadeOutDuration } = timing;

  // Convert seconds to milliseconds (timing uses seconds)
  const startMs = startTime * 1000;
  const endMs = endTime * 1000;
  const fadeInMs = fadeInDuration * 1000;
  const fadeOutMs = fadeOutDuration * 1000;

  // Before element should appear
  if (currentTimeMs < startMs) {
    return { opacity: 0, scale: 0.8 };
  }

  // During fade in (with division by zero protection)
  if (fadeInMs > 0 && currentTimeMs < startMs + fadeInMs) {
    const progress = (currentTimeMs - startMs) / fadeInMs;
    const easedProgress = applyEasing(progress, entryEasing);
    return {
      opacity: easedProgress,
      scale: 0.8 + 0.2 * easedProgress, // Scale from 0.8 to 1
    };
  }

  // During fade out (with division by zero protection)
  if (fadeOutMs > 0 && currentTimeMs > endMs - fadeOutMs && currentTimeMs <= endMs) {
    const progress = (currentTimeMs - (endMs - fadeOutMs)) / fadeOutMs;
    const easedProgress = applyEasing(progress, exitEasing);
    return {
      opacity: 1 - easedProgress,
      scale: 1 - 0.2 * easedProgress, // Scale from 1 to 0.8
    };
  }

  // After element should disappear
  if (currentTimeMs > endMs) {
    return { opacity: 0, scale: 0.8 };
  }

  // Fully visible
  return { opacity: 1, scale: 1 };
}

// ===========================================
// Path Generation
// ===========================================

/**
 * Generate SVG polygon path from coordinates
 */
function generatePolygonPath(
  coordinates: [number, number][],
  viewState: ViewState,
  width: number,
  height: number
): string {
  if (coordinates.length < 3) return '';

  const points = coordinates.map((coord) =>
    projectToScreen(coord, viewState, width, height)
  );

  const pathCommands = points.map((point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }
    return `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });

  // Close the polygon
  pathCommands.push('Z');

  return pathCommands.join(' ');
}

// ===========================================
// Animated Zone Component
// ===========================================

const AnimatedZone: React.FC<AnimatedZoneProps> = ({
  zone,
  viewState,
  width,
  height,
  animState,
}) => {
  if (!zone.coordinates || zone.coordinates.length < 3) return null;

  const pathD = generatePolygonPath(zone.coordinates, viewState, width, height);
  const centroid = calculatePolygonCentroid(zone.coordinates, viewState, width, height);

  // Access style properties with defaults
  const fillColour = zone.style?.fillColour ?? '#3b82f6';
  const fillOpacity = zone.style?.fillOpacity ?? 0.3;
  const strokeColour = zone.style?.strokeColour ?? '#2563eb';
  const strokeWidth = zone.style?.strokeWidth ?? 2;
  const strokeOpacity = zone.style?.strokeOpacity ?? 1;

  // Combine style opacity with animation opacity
  const finalFillOpacity = fillOpacity * animState.opacity;
  const finalStrokeOpacity = strokeOpacity * animState.opacity;

  return (
    <g
      style={{
        transform: `translate(${centroid.x}px, ${centroid.y}px) scale(${animState.scale}) translate(${-centroid.x}px, ${-centroid.y}px)`,
        transformOrigin: `${centroid.x}px ${centroid.y}px`,
      }}
    >
      {/* Glow effect for visibility */}
      <path
        d={pathD}
        fill={fillColour}
        fillOpacity={finalFillOpacity * 0.3}
        stroke="none"
        style={{ filter: 'blur(8px)' }}
      />

      {/* Fill */}
      <path
        d={pathD}
        fill={fillColour}
        fillOpacity={finalFillOpacity}
        stroke="none"
      />

      {/* Stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColour}
        strokeWidth={strokeWidth}
        strokeOpacity={finalStrokeOpacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

// ===========================================
// Main Component
// ===========================================

export const ZoneRenderer: React.FC<ZoneRendererProps> = ({
  zones,
  viewState,
  width,
  height,
  frame = 0,
  fps = 30,
  currentTimeMs,
}) => {
  // Calculate current time in milliseconds from frame if not provided
  const timeMs = currentTimeMs ?? (frame / fps) * 1000;

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      {zones.map((zone) => {
        // Calculate animation state based on timing
        const animState = calculateZoneAnimation(zone.timing, timeMs);

        // Skip zones that are not visible
        if (animState.opacity === 0) return null;

        return (
          <AnimatedZone
            key={zone.id}
            zone={zone}
            viewState={viewState}
            width={width}
            height={height}
            animState={animState}
          />
        );
      })}
    </svg>
  );
};

export default ZoneRenderer;
