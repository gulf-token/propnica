/**
 * Mapbox Directions API Client Utilities
 *
 * Fetches road-based routes between points.
 */

// ===========================================
// Types
// ===========================================

export interface DirectionsOptions {
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
}

export interface DirectionsResult {
  coordinates: [number, number][]; // Road geometry as [lng, lat] array
  distance: number; // Total distance in meters
  duration: number; // Total duration in seconds
  distanceText: string; // Formatted distance
  durationText: string; // Formatted duration
}

// ===========================================
// Helper Functions
// ===========================================

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr ${remainingMinutes} min`;
}

// ===========================================
// Main API Functions
// ===========================================

/**
 * Get road-based route between two or more points
 *
 * @param waypoints - Array of [longitude, latitude] coordinates
 * @param options - Optional configuration
 * @returns Route geometry and metadata, or null if failed
 *
 * @example
 * const route = await getDirections([
 *   [55.2744, 25.1972], // Burj Khalifa
 *   [55.2646, 25.1850], // Business Bay
 * ]);
 */
export async function getDirections(
  waypoints: [number, number][],
  options: DirectionsOptions = {}
): Promise<DirectionsResult | null> {
  const { profile = 'driving' } = options;

  if (waypoints.length < 2) {
    console.error('[Directions] At least 2 waypoints required');
    return null;
  }

  try {
    const response = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: waypoints,
        profile,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Directions] API error:', error.error);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.routes || data.routes.length === 0) {
      console.error('[Directions] No routes found');
      return null;
    }

    const route = data.routes[0];

    return {
      coordinates: route.geometry,
      distance: route.distance,
      duration: route.duration,
      distanceText: formatDistance(route.distance),
      durationText: formatDuration(route.duration),
    };
  } catch (error) {
    console.error('[Directions] Error fetching route:', error);
    return null;
  }
}

/**
 * Get road coordinates between two points
 * Convenience function that returns just the coordinate array
 */
export async function getRoadCoordinates(
  from: [number, number],
  to: [number, number],
  options: DirectionsOptions = {}
): Promise<[number, number][] | null> {
  const result = await getDirections([from, to], options);
  return result?.coordinates ?? null;
}

/**
 * Get road coordinates through multiple waypoints
 */
export async function getMultiStopRoute(
  waypoints: [number, number][],
  options: DirectionsOptions = {}
): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) {
    console.error('[Directions] At least 2 waypoints required');
    return null;
  }

  if (waypoints.length > 25) {
    console.error('[Directions] Maximum 25 waypoints allowed');
    return null;
  }

  return getDirections(waypoints, options);
}
