import React from 'react';
import { interpolate } from 'remotion';
import type { Route } from '../../src/types';

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
    const y = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * scale;
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
  // Create a temporary SVG element to measure path length
  // This is a simplified calculation based on the number of points
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
}

const AnimatedRoute: React.FC<AnimatedRouteProps> = ({
  route,
  viewState,
  width,
  height,
}) => {
  if (!route.coordinates || route.coordinates.length < 2) return null;
  
  const pathD = generateSVGPath(route.coordinates, viewState, width, height);
  const pathLength = calculatePathLength(pathD);
  
  const progress = route.animationProgress ?? 1;
  const visibleLength = pathLength * progress;
  const dashOffset = pathLength - visibleLength;
  
  const color = route.color || '#3b82f6';
  const strokeWidth = route.width ?? 4;
  const opacity = route.opacity ?? 1;
  
  // Calculate glow effect
  const glowColor = color;
  const glowOpacity = opacity * 0.3;
  
  return (
    <g>
      {/* Glow layer */}
      <path
        d={pathD}
        fill="none"
        stroke={glowColor}
        strokeWidth={strokeWidth * 3}
        strokeOpacity={glowOpacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        style={{ filter: 'blur(4px)' }}
      />
      
      {/* Main route line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
      />
      
      {/* Animated dot at the end of the route (when animating) */}
      {route.animated && progress > 0 && progress < 1 && (
        <AnimatedDot
          coordinates={route.coordinates}
          progress={progress}
          viewState={viewState}
          width={width}
          height={height}
          color={color}
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
  color: string;
}

const AnimatedDot: React.FC<AnimatedDotProps> = ({
  coordinates,
  progress,
  viewState,
  width,
  height,
  color,
}) => {
  // Find the position along the path at the given progress
  if (coordinates.length < 2) return null;
  
  // Calculate total path length and find position
  let totalLength = 0;
  const segments: { start: [number, number]; end: [number, number]; length: number; startLength: number }[] = [];
  
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
    if (targetLength >= segment.startLength && targetLength <= segment.startLength + segment.length) {
      const segmentProgress = (targetLength - segment.startLength) / segment.length;
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
        fill={color}
        fillOpacity={0.3}
        style={{ filter: 'blur(4px)' }}
      />
      {/* Inner dot */}
      <circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={6}
        fill={color}
      />
      <circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={3}
        fill="white"
      />
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
}) => {
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
      {routes.map((route) => (
        <AnimatedRoute
          key={route.id}
          route={route}
          viewState={viewState}
          width={width}
          height={height}
        />
      ))}
    </svg>
  );
};

export default RouteRenderer;
