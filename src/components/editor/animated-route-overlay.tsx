'use client';

/**
 * AnimatedRouteOverlay Component
 *
 * Renders animated route polylines with draw animations in the editor preview.
 * Uses SVG overlay with stroke-dasharray/dashoffset for progressive line reveal.
 */

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import { useEditorStore, useProjectStore } from '@/stores';
import { Route } from '@/types';

// ===========================================
// Types
// ===========================================

interface AnimatedRouteOverlayProps {
  map: mapboxgl.Map | null;
}

interface ScreenPoint {
  x: number;
  y: number;
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Project map coordinates to screen coordinates
 */
function projectToScreen(
  map: mapboxgl.Map,
  coordinates: [number, number][]
): ScreenPoint[] {
  return coordinates.map((coord) => {
    const point = map.project(coord as [number, number]);
    return { x: point.x, y: point.y };
  });
}

/**
 * Generate SVG path from screen points
 */
function generateSVGPath(points: ScreenPoint[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

/**
 * Calculate total path length from screen points
 */
function calculatePathLength(points: ScreenPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Apply easing function to progress value
 */
function applyEasing(progress: number, easing: string = 'easeOutCubic'): number {
  const t = Math.max(0, Math.min(1, progress));

  switch (easing) {
    case 'linear':
      return t;
    case 'easeInQuad':
      return t * t;
    case 'easeOutQuad':
      return t * (2 - t);
    case 'easeInOutQuad':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'easeInCubic':
      return t * t * t;
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3);
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'easeOutExpo':
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    default:
      return 1 - Math.pow(1 - t, 3); // Default to easeOutCubic
  }
}

/**
 * Get point along path at given progress (0-1)
 */
function getPointAlongPath(points: ScreenPoint[], progress: number): ScreenPoint | null {
  if (points.length < 2) return null;

  const totalLength = calculatePathLength(points);
  const targetLength = totalLength * progress;

  let currentLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (currentLength + segmentLength >= targetLength) {
      const remainingLength = targetLength - currentLength;
      const ratio = segmentLength > 0 ? remainingLength / segmentLength : 0;
      return {
        x: points[i - 1].x + dx * ratio,
        y: points[i - 1].y + dy * ratio,
      };
    }
    currentLength += segmentLength;
  }

  return points[points.length - 1];
}

// ===========================================
// Animated Route Component
// ===========================================

interface AnimatedRouteProps {
  route: Route;
  screenPoints: ScreenPoint[];
  currentTime: number;
  onSelect: (routeId: string) => void;
  isSelected: boolean;
}

const AnimatedRoute: React.FC<AnimatedRouteProps> = ({
  route,
  screenPoints,
  currentTime,
  onSelect,
  isSelected,
}) => {
  if (screenPoints.length < 2) return null;

  const pathD = generateSVGPath(screenPoints);
  const pathLength = calculatePathLength(screenPoints);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(route.id);
  };

  // Get route timing
  const startTime = route.timing.startTime;
  const endTime = route.timing.endTime;
  const routeDuration = endTime - startTime;

  // Animation config - draw animation takes first 30% of route duration, minimum 0.5s
  const drawDuration = Math.max(0.5, routeDuration * 0.3);
  const animConfig = route.animationConfig;
  const drawEnabled = animConfig?.drawEnabled ?? (route.animation?.type === 'draw' || true); // Default to enabled
  const drawEasing = animConfig?.drawEasing ?? 'easeOutCubic';
  const glowEnabled = animConfig?.glowEnabled ?? true;
  const glowIntensity = animConfig?.glowIntensity ?? 0.5;

  // Calculate draw progress
  let rawProgress = 1;
  if (drawEnabled && currentTime >= startTime) {
    const timeIntoRoute = currentTime - startTime;
    rawProgress = Math.min(1, timeIntoRoute / drawDuration);
  }
  const progress = drawEnabled ? applyEasing(rawProgress, drawEasing) : 1;

  // Calculate dash offset for progressive reveal
  const visibleLength = pathLength * progress;
  const dashOffset = pathLength - visibleLength;

  // Style properties
  const colour = route.style.colour ?? '#3b82f6';
  const strokeWidth = route.style.width ?? 4;
  const opacity = route.style.opacity ?? 1;
  const outlineWidth = route.style.outlineWidth ?? 0;
  const outlineColour = route.style.outlineColour ?? '#FFFFFF';
  const outlineOpacity = route.style.outlineOpacity ?? 1;

  // Glow effect
  const glowOpacity = glowEnabled ? opacity * glowIntensity * progress : 0;
  const glowWidth = strokeWidth * (2 + glowIntensity * 2);

  // Get current dot position (for draw animation)
  const dotPosition = drawEnabled && progress > 0 && progress < 1
    ? getPointAlongPath(screenPoints, progress)
    : null;

  return (
    <g opacity={opacity}>
      {/* Invisible wider hit area for click detection */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth * 3, 20)}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        onClick={handleClick}
      />

      {/* Selection indicator */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={drawEnabled ? dashOffset : 0}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Outline/casing layer */}
      {outlineWidth > 0 && (
        <path
          d={pathD}
          fill="none"
          stroke={outlineColour}
          strokeWidth={strokeWidth + outlineWidth * 2}
          strokeOpacity={outlineOpacity * (drawEnabled ? progress : 1)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={drawEnabled ? dashOffset : 0}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Glow layer */}
      {glowEnabled && progress > 0 && (
        <path
          d={pathD}
          fill="none"
          stroke={colour}
          strokeWidth={glowWidth}
          strokeOpacity={glowOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={drawEnabled ? dashOffset : 0}
          style={{ filter: `blur(${4 + glowIntensity * 4}px)`, pointerEvents: 'none' }}
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
        strokeDasharray={pathLength}
        strokeDashoffset={drawEnabled ? dashOffset : 0}
        style={{ pointerEvents: 'none' }}
      />

      {/* Animated dot at drawing tip */}
      {dotPosition && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Outer glow */}
          <circle
            cx={dotPosition.x}
            cy={dotPosition.y}
            r={10}
            fill={colour}
            fillOpacity={0.3}
            style={{ filter: 'blur(3px)' }}
          />
          {/* Inner dot */}
          <circle
            cx={dotPosition.x}
            cy={dotPosition.y}
            r={5}
            fill={colour}
          />
          <circle
            cx={dotPosition.x}
            cy={dotPosition.y}
            r={2.5}
            fill="white"
          />
        </g>
      )}
    </g>
  );
};

// ===========================================
// Main Component
// ===========================================

export const AnimatedRouteOverlay: React.FC<AnimatedRouteOverlayProps> = ({
  map,
}) => {
  const config = useProjectStore((state) => state.config);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isVertexEditing = useEditorStore((state) => state.isVertexEditing);
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const selectElement = useEditorStore((state) => state.selectElement);

  // Force re-render on map move to update projections
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Track map dimensions
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!map) return;

    const updateDimensions = () => {
      const container = map.getContainer();
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      forceUpdate();
    };

    // Update on map events
    map.on('move', forceUpdate);
    map.on('zoom', forceUpdate);
    map.on('resize', updateDimensions);

    // Initial dimensions
    updateDimensions();

    return () => {
      map.off('move', forceUpdate);
      map.off('zoom', forceUpdate);
      map.off('resize', updateDimensions);
    };
  }, [map]);

  if (!map || !config?.routes?.length) return null;

  // Filter routes that should be visible at current time
  const visibleRoutes = config.routes.filter((route) => {
    const { startTime, endTime } = route.timing;
    const isVisible = currentTime >= startTime && currentTime < endTime;
    // Skip routes being vertex edited (they're shown differently)
    const isBeingEdited =
      isVertexEditing &&
      selectedElement?.type === 'route' &&
      selectedElement.id === route.id;
    return isVisible && !isBeingEdited;
  });

  if (visibleRoutes.length === 0) return null;

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
      }}
      // SVG itself doesn't capture events (fill="none" doesn't register)
      // but child paths with pointerEvents: 'stroke' or 'auto' will
    >
      {visibleRoutes.map((route) => {
        const screenPoints = projectToScreen(map, route.coordinates);
        const isSelected = selectedElement?.type === 'route' && selectedElement.id === route.id;
        return (
          <AnimatedRoute
            key={route.id}
            route={route}
            screenPoints={screenPoints}
            currentTime={currentTime}
            onSelect={(id) => selectElement({ type: 'route', id })}
            isSelected={isSelected}
          />
        );
      })}
    </svg>
  );
};

export default AnimatedRouteOverlay;
