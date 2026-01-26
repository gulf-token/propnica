// @ts-nocheck
import React from 'react';
import type { Route, ElementTiming, RouteAnimationConfig, AnimationEasing } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface ViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

interface RouteWithProgress extends Route {
  animationProgress?: number;
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

interface RouteRendererProps {
  routes: RouteWithProgress[];
  viewState: ViewState;
  width: number;
  height: number;
  frame?: number;
  fps?: number;
  currentTimeMs?: number;
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Calculate element opacity based on timing configuration
 */
function calculateElementOpacity(
  timing: ElementTiming,
  currentTimeMs: number
): number {
  const { startTime, endTime, fadeInDuration, fadeOutDuration } = timing;

  // Convert seconds to milliseconds (timing uses seconds)
  const startMs = startTime * 1000;
  const endMs = endTime * 1000;
  const fadeInMs = fadeInDuration * 1000;
  const fadeOutMs = fadeOutDuration * 1000;

  // Before element should appear
  if (currentTimeMs < startMs) {
    return 0;
  }

  // During fade in
  if (currentTimeMs < startMs + fadeInMs) {
    return (currentTimeMs - startMs) / fadeInMs;
  }

  // During fade out
  if (currentTimeMs > endMs - fadeOutMs && currentTimeMs <= endMs) {
    return Math.max(0, (endMs - currentTimeMs) / fadeOutMs);
  }

  // After element should disappear
  if (currentTimeMs > endMs) {
    return 0;
  }

  // Fully visible
  return 1;
}

/**
 * Get dash array pattern based on route style
 */
function getDashPattern(
  pattern: 'solid' | 'dashed' | 'dotted',
  strokeWidth: number
): string | undefined {
  switch (pattern) {
    case 'dashed':
      return `${strokeWidth * 3} ${strokeWidth * 2}`;
    case 'dotted':
      return `${strokeWidth} ${strokeWidth * 2}`;
    case 'solid':
    default:
      return undefined;
  }
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

function generateSVGPath(
  coordinates: [number, number][],
  viewState: ViewState,
  width: number,
  height: number
): string {
  if (coordinates.length < 2) return '';

  const points = coordinates.map((coord) =>
    projectToScreen(coord, viewState, width, height)
  );

  const pathCommands = points.map((point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `L ${point.x} ${point.y}`;
  });

  return pathCommands.join(' ');
}

function calculatePathLength(path: string): number {
  const commands = path.split(/[ML]/g).filter(Boolean);
  let length = 0;
  let prevPoint: { x: number; y: number } | null = null;

  for (const command of commands) {
    const coords = command.trim().split(' ').map(Number);
    if (coords.length >= 2) {
      const point = { x: coords[0], y: coords[1] };
      if (prevPoint) {
        const dx = point.x - prevPoint.x;
        const dy = point.y - prevPoint.y;
        length += Math.sqrt(dx * dx + dy * dy);
      }
      prevPoint = point;
    }
  }

  return length;
}

// ===========================================
// Animated Route Component
// ===========================================

interface AnimatedRouteProps {
  route: RouteWithProgress;
  viewState: ViewState;
  width: number;
  height: number;
  timingOpacity: number;
  frame: number;
  fps: number;
}

const AnimatedRoute: React.FC<AnimatedRouteProps> = ({
  route,
  viewState,
  width,
  height,
  timingOpacity,
  frame,
  fps,
}) => {
  if (!route.coordinates || route.coordinates.length < 2) return null;

  // Get animation config (use new system or fall back to legacy)
  const animConfig = route.animationConfig;
  const drawEnabled = animConfig?.drawEnabled ?? (route.animation?.type === 'draw');
  const drawEasing = animConfig?.drawEasing ?? 'easeOutCubic';
  const drawDirection = animConfig?.drawDirection ?? 'startToEnd';
  const drawStyle = animConfig?.drawStyle ?? 'solid';
  const trailEnabled = animConfig?.trailEnabled ?? false;
  const trailColour = animConfig?.trailColour ?? route.style.colour;
  const trailLength = animConfig?.trailLength ?? 0.3;
  const glowEnabled = animConfig?.glowEnabled ?? true;
  const glowColour = animConfig?.glowColour ?? route.style.colour;
  const glowIntensity = animConfig?.glowIntensity ?? 0.5;
  const pulseEnabled = animConfig?.pulseEnabled ?? (route.animation?.type === 'pulse');
  const pulseDuration = animConfig?.pulseDuration ?? 2;

  // Prepare path based on direction
  let coordinates = [...route.coordinates];
  if (drawDirection === 'endToStart') {
    coordinates = coordinates.reverse();
  }

  const pathD = generateSVGPath(coordinates, viewState, width, height);
  const pathLength = calculatePathLength(pathD);

  // Calculate draw progress with easing
  const rawProgress = route.animationProgress ?? 1;
  const progress = drawEnabled ? applyEasing(rawProgress, drawEasing) : 1;

  // Access style properties
  const colour = route.style.colour ?? '#3b82f6';
  const strokeWidth = route.style.width ?? 4;
  const styleOpacity = route.style.opacity ?? 1;
  const dashPattern = route.style.dashPattern ?? 'solid';

  // Combine style opacity with timing opacity
  const finalOpacity = styleOpacity * timingOpacity;

  // Calculate visible length based on direction
  let visibleLength = pathLength * progress;
  let dashOffset = pathLength - visibleLength;

  // Handle 'middle' direction - draw from center outward
  if (drawDirection === 'middle' && drawEnabled) {
    // We'll render two paths from the middle
    visibleLength = (pathLength * progress) / 2;
    dashOffset = pathLength / 2 - visibleLength;
  }

  // Handle 'both' direction - draw from both ends toward middle
  if (drawDirection === 'both' && drawEnabled) {
    visibleLength = (pathLength * progress) / 2;
    dashOffset = 0;
  }

  // Get dash pattern for draw style
  const getDrawStyleDash = () => {
    if (!drawEnabled || drawStyle === 'solid') {
      return getDashPattern(dashPattern, strokeWidth);
    }
    switch (drawStyle) {
      case 'dashed':
        return `${strokeWidth * 3} ${strokeWidth * 2}`;
      case 'dotted':
        return `${strokeWidth} ${strokeWidth * 2}`;
      case 'gradient':
        return undefined; // Handled separately
      default:
        return undefined;
    }
  };

  const strokeDasharray = drawEnabled ? pathLength : getDrawStyleDash();

  // Calculate glow effect with configurable intensity
  const glowOpacity = glowEnabled ? finalOpacity * glowIntensity : 0;
  const glowWidth = strokeWidth * (2 + glowIntensity * 2);

  // Calculate trail effect
  const trailOpacity = trailEnabled && progress < 1 ? finalOpacity * 0.4 : 0;
  const trailDashOffset = pathLength - (pathLength * Math.max(0, progress - trailLength));

  // Pulse animation
  const pulsePhase = pulseEnabled ? Math.sin((frame / fps) * Math.PI * 2 / pulseDuration) : 0;
  const pulseScale = 1 + pulsePhase * 0.15;

  return (
    <g opacity={finalOpacity}>
      {/* Outline/Casing layer (if outline is configured) */}
      {route.style.outlineWidth > 0 && (
        <path
          d={pathD}
          fill="none"
          stroke={route.style.outlineColour ?? '#FFFFFF'}
          strokeWidth={strokeWidth + (route.style.outlineWidth ?? 0) * 2}
          strokeOpacity={(route.style.outlineOpacity ?? 1) * (drawEnabled ? progress : 1)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={drawEnabled ? dashOffset : 0}
        />
      )}

      {/* Glow layer */}
      {glowEnabled && (
        <path
          d={pathD}
          fill="none"
          stroke={glowColour}
          strokeWidth={glowWidth * pulseScale}
          strokeOpacity={glowOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={drawEnabled ? pathLength : strokeDasharray}
          strokeDashoffset={drawEnabled ? dashOffset : 0}
          style={{ filter: `blur(${4 + glowIntensity * 4}px)` }}
        />
      )}

      {/* Trail layer (when animating) */}
      {trailEnabled && progress > 0 && progress < 1 && (
        <path
          d={pathD}
          fill="none"
          stroke={trailColour}
          strokeWidth={strokeWidth * 0.7}
          strokeOpacity={trailOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={trailDashOffset}
          style={{ filter: 'blur(2px)' }}
        />
      )}

      {/* Main route line */}
      <path
        d={pathD}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={drawEnabled ? pathLength : strokeDasharray}
        strokeDashoffset={drawEnabled ? dashOffset : 0}
      />

      {/* For 'both' direction, render second path from the other end */}
      {drawDirection === 'both' && drawEnabled && (
        <path
          d={generateSVGPath([...route.coordinates].reverse(), viewState, width, height)}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={dashOffset}
        />
      )}

      {/* Animated dot at the end of the route (when animating) */}
      {drawEnabled && progress > 0 && progress < 1 && (
        <AnimatedDot
          coordinates={coordinates}
          progress={progress}
          viewState={viewState}
          width={width}
          height={height}
          colour={colour}
        />
      )}

      {/* Continuous pulse effect (when enabled and fully drawn) */}
      {pulseEnabled && progress >= 1 && (
        <PulseEffect
          pathD={pathD}
          colour={colour}
          strokeWidth={strokeWidth}
          pulseDuration={pulseDuration}
          frame={frame}
          fps={fps}
        />
      )}
    </g>
  );
};

// ===========================================
// Animated Dot Component
// ===========================================

interface AnimatedDotProps {
  coordinates: [number, number][];
  progress: number;
  viewState: ViewState;
  width: number;
  height: number;
  colour: string;
}

const AnimatedDot: React.FC<AnimatedDotProps> = ({
  coordinates,
  progress,
  viewState,
  width,
  height,
  colour,
}) => {
  if (coordinates.length < 2) return null;

  // Calculate total path length and find position
  let totalLength = 0;
  const segments: {
    start: [number, number];
    end: [number, number];
    length: number;
    startLength: number;
  }[] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    segments.push({ start, end, length, startLength: totalLength });
    totalLength += length;
  }

  const targetLength = totalLength * progress;

  // Find the segment containing this position
  let position: [number, number] = coordinates[0];
  for (const segment of segments) {
    if (
      targetLength >= segment.startLength &&
      targetLength <= segment.startLength + segment.length
    ) {
      const segmentProgress =
        (targetLength - segment.startLength) / segment.length;
      position = [
        segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress,
        segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress,
      ];
      break;
    }
  }

  const screenPos = projectToScreen(position, viewState, width, height);

  // Pulsing animation
  const pulseScale = 1 + Math.sin(progress * Math.PI * 8) * 0.2;

  return (
    <g>
      {/* Outer glow */}
      <circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={12 * pulseScale}
        fill={colour}
        fillOpacity={0.3}
        style={{ filter: 'blur(4px)' }}
      />
      {/* Inner dot */}
      <circle cx={screenPos.x} cy={screenPos.y} r={6} fill={colour} />
      <circle cx={screenPos.x} cy={screenPos.y} r={3} fill="white" />
    </g>
  );
};

// ===========================================
// Pulse Effect Component
// ===========================================

interface PulseEffectProps {
  pathD: string;
  colour: string;
  strokeWidth: number;
  pulseDuration?: number;
  frame: number;
  fps: number;
}

const PulseEffect: React.FC<PulseEffectProps> = ({
  pathD,
  colour,
  strokeWidth,
  pulseDuration = 2,
  frame,
  fps,
}) => {
  // Calculate pulse animation based on frame (not CSS animation for Remotion compatibility)
  const pulseProgress = (frame / fps) % pulseDuration / pulseDuration;
  const pulseOpacity = 0.3 + Math.sin(pulseProgress * Math.PI * 2) * 0.3;
  const pulseScale = 1 + Math.sin(pulseProgress * Math.PI * 2) * 0.2;

  return (
    <path
      d={pathD}
      fill="none"
      stroke={colour}
      strokeWidth={strokeWidth * 2 * pulseScale}
      strokeOpacity={pulseOpacity}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: 'blur(6px)',
      }}
    />
  );
};

// ===========================================
// Main Component
// ===========================================

export const RouteRenderer: React.FC<RouteRendererProps> = ({
  routes,
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
      <defs>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
          `}
        </style>
      </defs>
      {routes.map((route) => {
        // Calculate timing-based opacity
        const timingOpacity = calculateElementOpacity(route.timing, timeMs);

        // Skip routes that are not visible
        if (timingOpacity === 0) return null;

        return (
          <AnimatedRoute
            key={route.id}
            route={route}
            viewState={viewState}
            width={width}
            height={height}
            timingOpacity={timingOpacity}
            frame={frame}
            fps={fps}
          />
        );
      })}
    </svg>
  );
};

export default RouteRenderer;
