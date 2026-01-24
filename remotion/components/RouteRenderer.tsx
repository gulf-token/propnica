import React from 'react';
import type { Route, ElementTiming } from '../../src/types';

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
}

const AnimatedRoute: React.FC<AnimatedRouteProps> = ({
  route,
  viewState,
  width,
  height,
  timingOpacity,
}) => {
  if (!route.coordinates || route.coordinates.length < 2) return null;

  const pathD = generateSVGPath(route.coordinates, viewState, width, height);
  const pathLength = calculatePathLength(pathD);

  const progress = route.animationProgress ?? 1;
  const visibleLength = pathLength * progress;
  const dashOffset = pathLength - visibleLength;

  // Access nested style properties
  const colour = route.style.colour ?? '#3b82f6';
  const strokeWidth = route.style.width ?? 4;
  const styleOpacity = route.style.opacity ?? 1;
  const dashPattern = route.style.dashPattern ?? 'solid';

  // Combine style opacity with timing opacity
  const finalOpacity = styleOpacity * timingOpacity;

  // Check if route is animated
  const isAnimated = route.animation.type !== 'none';

  // Get dash pattern for non-solid lines (only when not using draw animation)
  const strokeDasharray =
    isAnimated && route.animation.type === 'draw'
      ? pathLength
      : getDashPattern(dashPattern, strokeWidth);

  // Calculate glow effect
  const glowOpacity = finalOpacity * 0.3;

  return (
    <g opacity={finalOpacity}>
      {/* Glow layer */}
      <path
        d={pathD}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth * 3}
        strokeOpacity={glowOpacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isAnimated ? pathLength : strokeDasharray}
        strokeDashoffset={isAnimated ? dashOffset : 0}
        style={{ filter: 'blur(4px)' }}
      />

      {/* Main route line */}
      <path
        d={pathD}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isAnimated ? pathLength : strokeDasharray}
        strokeDashoffset={isAnimated ? dashOffset : 0}
      />

      {/* Animated dot at the end of the route (when animating) */}
      {isAnimated && progress > 0 && progress < 1 && (
        <AnimatedDot
          coordinates={route.coordinates}
          progress={progress}
          viewState={viewState}
          width={width}
          height={height}
          colour={colour}
        />
      )}

      {/* Pulse effect for pulse animation type */}
      {route.animation.type === 'pulse' && progress >= 1 && (
        <PulseEffect pathD={pathD} colour={colour} strokeWidth={strokeWidth} />
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
}

const PulseEffect: React.FC<PulseEffectProps> = ({
  pathD,
  colour,
  strokeWidth,
}) => {
  return (
    <path
      d={pathD}
      fill="none"
      stroke={colour}
      strokeWidth={strokeWidth * 2}
      strokeOpacity={0.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: 'blur(6px)',
        animation: 'pulse 2s ease-in-out infinite',
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
          />
        );
      })}
    </svg>
  );
};

export default RouteRenderer;
