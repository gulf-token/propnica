/**
 * Shared Coordinate Projection Utilities for Remotion Renderers
 *
 * This module provides geographic coordinate projection functions
 * that convert [longitude, latitude] coordinates to screen [x, y] positions.
 * Includes support for zoom, bearing (rotation), and pitch (tilt).
 */

// ===========================================
// Types
// ===========================================

export interface ViewState {
  center: [number, number]; // [longitude, latitude]
  zoom: number; // 0-22
  pitch: number; // 0-85 degrees
  bearing: number; // 0-360 degrees
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface MercatorPoint {
  x: number;
  y: number;
}

// ===========================================
// Constants
// ===========================================

const TILE_SIZE = 256;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ===========================================
// Core Projection Functions
// ===========================================

/**
 * Convert longitude/latitude to Web Mercator coordinates
 *
 * @param lng - Longitude (-180 to 180)
 * @param lat - Latitude (-85.051129 to 85.051129)
 * @param scale - Map scale (typically Math.pow(2, zoom) * TILE_SIZE)
 * @returns Mercator coordinates
 */
export function lngLatToMercator(
  lng: number,
  lat: number,
  scale: number
): MercatorPoint {
  const x = ((lng + 180) / 360) * scale;

  // Clamp latitude to valid Mercator range
  const clampedLat = Math.max(-85.051129, Math.min(85.051129, lat));
  const latRad = clampedLat * DEG_TO_RAD;

  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    scale;

  return { x, y };
}

/**
 * Convert Web Mercator coordinates back to longitude/latitude
 *
 * @param x - Mercator x coordinate
 * @param y - Mercator y coordinate
 * @param scale - Map scale
 * @returns [longitude, latitude]
 */
export function mercatorToLngLat(
  x: number,
  y: number,
  scale: number
): [number, number] {
  const lng = (x / scale) * 360 - 180;

  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = RAD_TO_DEG * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return [lng, lat];
}

/**
 * Apply bearing (rotation) transformation to offset coordinates
 *
 * @param offsetX - X offset from center
 * @param offsetY - Y offset from center
 * @param bearing - Bearing in degrees (0-360)
 * @returns Rotated offset coordinates
 */
export function applyBearing(
  offsetX: number,
  offsetY: number,
  bearing: number
): { x: number; y: number } {
  if (bearing === 0) {
    return { x: offsetX, y: offsetY };
  }

  const bearingRad = bearing * DEG_TO_RAD;
  const cos = Math.cos(bearingRad);
  const sin = Math.sin(bearingRad);

  return {
    x: offsetX * cos - offsetY * sin,
    y: offsetX * sin + offsetY * cos,
  };
}

/**
 * Apply pitch (tilt) transformation using perspective projection
 *
 * @param x - X coordinate (already rotated by bearing)
 * @param y - Y coordinate (already rotated by bearing)
 * @param pitch - Pitch in degrees (0-85)
 * @param height - Screen height in pixels
 * @returns Perspective-transformed coordinates with scale factor
 */
export function applyPitch(
  x: number,
  y: number,
  pitch: number,
  height: number
): { x: number; y: number; scale: number } {
  if (pitch === 0) {
    return { x, y, scale: 1 };
  }

  const pitchRad = pitch * DEG_TO_RAD;
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);

  // Calculate the camera height and horizon position
  // Based on Mapbox GL's perspective projection model
  const cameraHeight = height * 1.5; // Camera distance from ground plane
  const horizonY = height * 0.5; // Horizon line position

  // Apply perspective transformation
  // Objects further from camera (positive y in world space) appear higher on screen
  // and smaller due to perspective
  const worldY = y * cosPitch;
  const worldZ = y * sinPitch;

  // Perspective division - objects at distance appear smaller
  const perspectiveScale = cameraHeight / (cameraHeight + worldZ);

  // Clamp perspective scale to prevent objects behind camera
  const clampedScale = Math.max(0.1, Math.min(10, perspectiveScale));

  // Apply perspective to x coordinate
  const perspectiveX = x * clampedScale;

  // Apply perspective to y coordinate
  // The y position shifts based on depth
  const perspectiveY = worldY * clampedScale;

  return {
    x: perspectiveX,
    y: perspectiveY,
    scale: clampedScale,
  };
}

// ===========================================
// Main Projection Function
// ===========================================

/**
 * Project geographic coordinates to screen position
 *
 * This is the primary function for converting [longitude, latitude]
 * coordinates to screen [x, y] positions, accounting for:
 * - Map center and zoom level
 * - Bearing (rotation)
 * - Pitch (tilt) with perspective
 *
 * @param coordinates - [longitude, latitude]
 * @param viewState - Current view state (center, zoom, pitch, bearing)
 * @param width - Screen width in pixels
 * @param height - Screen height in pixels
 * @returns Screen position with scale factor for perspective
 */
export function projectToScreen(
  coordinates: [number, number],
  viewState: ViewState,
  width: number,
  height: number
): ScreenPoint & { scale: number } {
  const { center, zoom, bearing, pitch } = viewState;

  // Calculate map scale
  const scale = Math.pow(2, zoom) * TILE_SIZE;

  // Convert coordinates to Mercator
  const centerMerc = lngLatToMercator(center[0], center[1], scale);
  const pointMerc = lngLatToMercator(coordinates[0], coordinates[1], scale);

  // Calculate offset from center
  let offsetX = pointMerc.x - centerMerc.x;
  let offsetY = pointMerc.y - centerMerc.y;

  // Apply bearing rotation
  const rotated = applyBearing(offsetX, offsetY, bearing);
  offsetX = rotated.x;
  offsetY = rotated.y;

  // Apply pitch perspective
  const pitched = applyPitch(offsetX, offsetY, pitch, height);

  // Convert to screen coordinates (center of screen is origin)
  return {
    x: width / 2 + pitched.x,
    y: height / 2 + pitched.y,
    scale: pitched.scale,
  };
}

/**
 * Simple projection without pitch (for backwards compatibility)
 *
 * @param coordinates - [longitude, latitude]
 * @param viewState - Current view state
 * @param width - Screen width
 * @param height - Screen height
 * @returns Screen position
 */
export function projectToScreenFlat(
  coordinates: [number, number],
  viewState: ViewState,
  width: number,
  height: number
): ScreenPoint {
  const { center, zoom, bearing } = viewState;

  const scale = Math.pow(2, zoom) * TILE_SIZE;

  const centerMerc = lngLatToMercator(center[0], center[1], scale);
  const pointMerc = lngLatToMercator(coordinates[0], coordinates[1], scale);

  let offsetX = pointMerc.x - centerMerc.x;
  let offsetY = pointMerc.y - centerMerc.y;

  const rotated = applyBearing(offsetX, offsetY, bearing);

  return {
    x: width / 2 + rotated.x,
    y: height / 2 + rotated.y,
  };
}

// ===========================================
// Path Generation Utilities
// ===========================================

/**
 * Generate an SVG path string from coordinates
 *
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @param viewState - Current view state
 * @param width - Screen width
 * @param height - Screen height
 * @param closePath - Whether to close the path (for polygons)
 * @returns SVG path string
 */
export function generateSVGPath(
  coordinates: [number, number][],
  viewState: ViewState,
  width: number,
  height: number,
  closePath: boolean = false
): string {
  if (coordinates.length < 2) return '';

  const points = coordinates.map((coord) =>
    projectToScreen(coord, viewState, width, height)
  );

  const pathCommands = points.map((point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }
    return `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });

  if (closePath) {
    pathCommands.push('Z');
  }

  return pathCommands.join(' ');
}

/**
 * Calculate the approximate length of an SVG path
 *
 * @param pathString - SVG path string
 * @returns Path length in pixels
 */
export function calculatePathLength(pathString: string): number {
  const commands = pathString.split(/[MLZ]/g).filter(Boolean);
  let length = 0;
  let prevPoint: ScreenPoint | null = null;

  for (const command of commands) {
    const coords = command.trim().split(/\s+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
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

/**
 * Calculate the centroid of a polygon
 *
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @param viewState - Current view state
 * @param width - Screen width
 * @param height - Screen height
 * @returns Screen position of centroid
 */
export function calculatePolygonCentroid(
  coordinates: [number, number][],
  viewState: ViewState,
  width: number,
  height: number
): ScreenPoint {
  if (coordinates.length === 0) {
    return { x: width / 2, y: height / 2 };
  }

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

/**
 * Find a point along a path at a given progress
 *
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @param progress - Progress along path (0-1)
 * @param viewState - Current view state
 * @param width - Screen width
 * @param height - Screen height
 * @returns Screen position at progress point
 */
export function getPointAlongPath(
  coordinates: [number, number][],
  progress: number,
  viewState: ViewState,
  width: number,
  height: number
): ScreenPoint {
  if (coordinates.length < 2) {
    const point = coordinates[0];
    if (point) {
      return projectToScreen(point, viewState, width, height);
    }
    return { x: width / 2, y: height / 2 };
  }

  // Calculate segment lengths
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
    const startScreen = projectToScreen(start, viewState, width, height);
    const endScreen = projectToScreen(end, viewState, width, height);
    const dx = endScreen.x - startScreen.x;
    const dy = endScreen.y - startScreen.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    segments.push({ start, end, length, startLength: totalLength });
    totalLength += length;
  }

  const targetLength = totalLength * Math.max(0, Math.min(1, progress));

  // Find the segment containing this position
  for (const segment of segments) {
    if (
      targetLength >= segment.startLength &&
      targetLength <= segment.startLength + segment.length
    ) {
      const segmentProgress =
        segment.length > 0
          ? (targetLength - segment.startLength) / segment.length
          : 0;

      const interpLng =
        segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress;
      const interpLat =
        segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress;

      return projectToScreen([interpLng, interpLat], viewState, width, height);
    }
  }

  // Fallback to last point
  return projectToScreen(
    coordinates[coordinates.length - 1],
    viewState,
    width,
    height
  );
}
