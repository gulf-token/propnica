/**
 * RouteRenderer Component
 *
 * Renders animated route polylines with draw animations, glow effects,
 * trails, and pulse effects. Used in Remotion compositions.
 */

import React from 'react';
import type {
  Route,
  ElementTiming,
  AnimationEasing,
} from '../../src/types';
import {
  ViewState,
  projectToScreen,
  generateSVGPath,
  calculatePathLength,
  getPointAlongPath,
} from '../utils/projection';
import { applyEasing } from '../utils/easing';

// ===========================================
// Types
// ===========================================

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

interface AnimatedRouteProps {
  route: RouteWithProgress;
  viewState: ViewState;
  width: number;
  height: number;
  timingOpacity: number;
  frame: number;
  fps: number;
}

interface AnimatedDotProps {
  coordinates: [number, number][];
  progress: number;
  viewState: ViewState;
  width: number;
  height: number;
  colour: string;
}

interface PulseEffectProps {
  pathD: string;
  colour: string;
  strokeWidth: number;
  pulseDuration?: number;
  frame: number;
  fps: number;
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Calculate element opacity based on timing configuration
 */
function calculateElementOpacity(
  timing: ElementTiming | undefined,
  currentTimeMs: number
): number {
  if (!timing) {
    return 1;
  }

  const { startTime, endTime, fadeInDuration, fadeOutDuration } = timing;

  // Convert seconds to milliseconds
  const startMs = startTime * 1000;
  const endMs = endTime * 1000;
  const fadeInMs = fadeInDuration * 1000;
  const fadeOutMs = fadeOutDuration * 1000;

  // Before element should appear
  if (currentTimeMs < startMs) {
    return 0;
  }

  // During fade in (with division by zero protection)
  if (fadeInMs > 0 && currentTimeMs < startMs + fadeInMs) {
    return (currentTimeMs - startMs) / fadeInMs;
  }

  // During fade out (with division by zero protection)
  if (fadeOutMs > 0 && currentTimeMs > endMs - fadeOutMs && currentTimeMs <= endMs) {
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
  pattern: 'solid' | 'dashed' | 'dotted' | undefined,
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
// Animated Dot Component
// ===========================================

const AnimatedDot: React.FC<AnimatedDotProps> = ({
  coordinates,
  progress,
  viewState,
  width,
  height,
  colour,
}) => {
  if (coordinates.length < 2) return null;

  const screenPos = getPointAlongPath(
    coordinates,
    progress,
    viewState,
    width,
    height
  );

  // Pulsing animation based on progress
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

const PulseEffect: React.FC<PulseEffectProps> = ({
  pathD,
  colour,
  strokeWidth,
  pulseDuration = 2,
  frame,
  fps,
}) => {
  // Calculate pulse animation based on frame
  const pulseProgress = ((frame / fps) % pulseDuration) / pulseDuration;
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
// Animated Route Component
// ===========================================

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
  const drawEnabled =
    animConfig?.drawEnabled ?? route.animation?.type === 'draw';
  const drawEasing: AnimationEasing = animConfig?.drawEasing ?? 'easeOutCubic';
  const drawDirection = animConfig?.drawDirection ?? 'startToEnd';
  const drawStyle = animConfig?.drawStyle ?? 'solid';
  const trailEnabled = animConfig?.trailEnabled ?? false;
  const trailColour = animConfig?.trailColour ?? route.style?.colour ?? '#3b82f6';
  const trailLength = animConfig?.trailLength ?? 0.3;
  const glowEnabled = animConfig?.glowEnabled ?? true;
  const glowColour = animConfig?.glowColour ?? route.style?.colour ?? '#3b82f6';
  const glowIntensity = animConfig?.glowIntensity ?? 0.5;
  const pulseEnabled =
    animConfig?.pulseEnabled ?? route.animation?.type === 'pulse';
  const pulseDuration = animConfig?.pulseDuration ?? 2;

  // Prepare path based on direction
  let coordinates = [...route.coordinates];
  if (drawDirection === 'endToStart') {
    coordinates = coordinates.reverse();
  }

  const pathD = generateSVGPath(coordinates, viewState, width, height, false);
  const pathLength = calculatePathLength(pathD);

  // Calculate draw progress with easing
  const rawProgress = route.animationProgress ?? 1;
  const progress = drawEnabled ? applyEasing(rawProgress, drawEasing) : 1;

  // Access style properties with defaults
  const colour = route.style?.colour ?? '#3b82f6';
  const strokeWidth = route.style?.width ?? 4;
  const styleOpacity = route.style?.opacity ?? 1;
  const dashPattern = route.style?.dashPattern as
    | 'solid'
    | 'dashed'
    | 'dotted'
    | undefined;

  // Combine style opacity with timing opacity
  const finalOpacity = styleOpacity * timingOpacity;

  // Calculate visible length based on direction
  let visibleLength = pathLength * progress;
  let dashOffset = pathLength - visibleLength;

  // Handle 'middle' direction - draw from center outward
  if (drawDirection === 'middle' && drawEnabled) {
    visibleLength = (pathLength * progress) / 2;
    dashOffset = pathLength / 2 - visibleLength;
  }

  // Handle 'both' direction - draw from both ends toward middle
  if (drawDirection === 'both' && drawEnabled) {
    visibleLength = (pathLength * progress) / 2;
    dashOffset = 0;
  }

  // Get dash pattern for draw style
  const getDrawStyleDash = (): string | undefined => {
    if (!drawEnabled || drawStyle === 'solid') {
      return getDashPattern(dashPattern, strokeWidth);
    }
    switch (drawStyle) {
      case 'dashed':
        return `${strokeWidth * 3} ${strokeWidth * 2}`;
      case 'dotted':
        return `${strokeWidth} ${strokeWidth * 2}`;
      case 'gradient':
        return undefined;
      default:
        return undefined;
    }
  };

  const strokeDasharray = drawEnabled
    ? pathLength.toString()
    : getDrawStyleDash();

  // Calculate glow effect with configurable intensity
  const glowOpacity = glowEnabled ? finalOpacity * glowIntensity : 0;
  const glowWidth = strokeWidth * (2 + glowIntensity * 2);

  // Calculate trail effect
  const trailOpacity = trailEnabled && progress < 1 ? finalOpacity * 0.4 : 0;
  const trailDashOffset =
    pathLength - pathLength * Math.max(0, progress - trailLength);

  // Pulse animation
  const pulsePhase = pulseEnabled
    ? Math.sin(((frame / fps) * Math.PI * 2) / pulseDuration)
    : 0;
  const pulseScale = 1 + pulsePhase * 0.15;

  // Get outline properties with safe access
  const outlineWidth = route.style?.outlineWidth ?? 0;
  const outlineColour = route.style?.outlineColour ?? '#FFFFFF';
  const outlineOpacity = route.style?.outlineOpacity ?? 1;

  return (
    <g opacity={finalOpacity}>
      {/* Outline/Casing layer (if outline is configured) */}
      {outlineWidth > 0 && (
        <path
          d={pathD}
          fill="none"
          stroke={outlineColour}
          strokeWidth={strokeWidth + outlineWidth * 2}
          strokeOpacity={outlineOpacity * (drawEnabled ? progress : 1)}
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
          strokeDasharray={drawEnabled ? pathLength.toString() : strokeDasharray}
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
          strokeDasharray={pathLength.toString()}
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
        strokeDasharray={drawEnabled ? pathLength.toString() : strokeDasharray}
        strokeDashoffset={drawEnabled ? dashOffset : 0}
      />

      {/* For 'both' direction, render second path from the other end */}
      {drawDirection === 'both' && drawEnabled && (
        <path
          d={generateSVGPath(
            [...route.coordinates].reverse(),
            viewState,
            width,
            height,
            false
          )}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength.toString()}
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
