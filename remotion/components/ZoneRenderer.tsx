// @ts-nocheck
import React from 'react';
import type { Zone, ElementTiming, AnimationEasing } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface ViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

interface ZoneRendererProps {
  zones: Zone[];
  viewState: ViewState;
  width: number;
  height: number;
  frame?: number;
  fps?: number;
  currentTimeMs?: number;
}

// ===========================================
// Easing Functions
// ===========================================

const easingFunctions: Record<AnimationEasing, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 2),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function applyEasing(progress: number, easing: AnimationEasing = 'easeOutCubic'): number {
  const fn = easingFunctions[easing] || easingFunctions.easeOutCubic;
  return fn(Math.max(0, Math.min(1, progress)));
}

// ===========================================
// Animation Calculation
// ===========================================

interface AnimationState {
  opacity: number;
  scale: number;
}

function calculateZoneAnimation(
  timing: ElementTiming,
  currentTimeMs: number,
  entryEasing: AnimationEasing = 'easeOutCubic',
  exitEasing: AnimationEasing = 'easeInCubic'
): AnimationState {
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

  // During fade in
  if (currentTimeMs < startMs + fadeInMs) {
    const progress = (currentTimeMs - startMs) / fadeInMs;
    const easedProgress = applyEasing(progress, entryEasing);
    return {
      opacity: easedProgress,
      scale: 0.8 + 0.2 * easedProgress, // Scale from 0.8 to 1
    };
  }

  // During fade out
  if (currentTimeMs > endMs - fadeOutMs && currentTimeMs <= endMs) {
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
// Coordinate Projection
// ===========================================

function projectToScreen(
  coordinates: [number, number],
  viewState: ViewState,
  width: number,
  height: number
): { x: number; y: number } {
  const { center, zoom, bearing } = viewState;

  const scale = Math.pow(2, zoom) * 256;

  const toMercator = (lng: number, lat: number) => {
    const x = ((lng + 180) / 360) * scale;
    const y =
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      scale;
    return { x, y };
  };

  const centerMerc = toMercator(center[0], center[1]);
  const pointMerc = toMercator(coordinates[0], coordinates[1]);

  let offsetX = pointMerc.x - centerMerc.x;
  let offsetY = pointMerc.y - centerMerc.y;

  if (bearing !== 0) {
    const bearingRad = (bearing * Math.PI) / 180;
    const cos = Math.cos(bearingRad);
    const sin = Math.sin(bearingRad);
    const rotatedX = offsetX * cos - offsetY * sin;
    const rotatedY = offsetX * sin + offsetY * cos;
    offsetX = rotatedX;
    offsetY = rotatedY;
  }

  return {
    x: width / 2 + offsetX,
    y: height / 2 + offsetY,
  };
}

// ===========================================
// Path Utilities
// ===========================================

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
      return `M ${point.x} ${point.y}`;
    }
    return `L ${point.x} ${point.y}`;
  });

  // Close the polygon
  pathCommands.push('Z');

  return pathCommands.join(' ');
}

function calculatePolygonCentroid(
  coordinates: [number, number][],
  viewState: ViewState,
  width: number,
  height: number
): { x: number; y: number } {
  const points = coordinates.map((coord) =>
    projectToScreen(coord, viewState, width, height)
  );

  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);

  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

// ===========================================
// Animated Zone Component
// ===========================================

interface AnimatedZoneProps {
  zone: Zone;
  viewState: ViewState;
  width: number;
  height: number;
  animState: AnimationState;
}

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

  // Access style properties
  const fillColour = zone.style.fillColour ?? '#3b82f6';
  const fillOpacity = zone.style.fillOpacity ?? 0.3;
  const strokeColour = zone.style.strokeColour ?? '#2563eb';
  const strokeWidth = zone.style.strokeWidth ?? 2;
  const strokeOpacity = zone.style.strokeOpacity ?? 1;

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
