/**
 * Boundary Lookup Client Utilities
 *
 * Fetches detailed polygon boundaries for places from OpenStreetMap.
 */

// ===========================================
// Types
// ===========================================

export interface BoundaryResult {
  name: string;
  displayName: string;
  coordinates: [number, number]; // Center point [lng, lat]
  polygon: [number, number][]; // Polygon coordinates [lng, lat][]
  source: 'nominatim' | 'approximate';
  confidence: 'high' | 'medium' | 'low';
  placeType?: string;
}

// ===========================================
// Main API Functions
// ===========================================

/**
 * Get detailed boundary polygon for a place
 *
 * @param placeName - Name of the place (e.g., "Business Bay", "Dubai Marina")
 * @param countryCode - ISO country code (default: 'ae' for UAE)
 * @returns Boundary result with polygon coordinates, or null if not found
 *
 * @example
 * const boundary = await getPlaceBoundary('Business Bay, Dubai');
 * if (boundary) {
 *   console.log('Polygon:', boundary.polygon);
 *   console.log('Source:', boundary.source); // 'nominatim' or 'approximate'
 * }
 */
export async function getPlaceBoundary(
  placeName: string,
  countryCode: string = 'ae'
): Promise<BoundaryResult | null> {
  if (!placeName || placeName.trim().length === 0) {
    console.error('[Boundaries] placeName is required');
    return null;
  }

  try {
    const response = await fetch('/api/boundaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeName: placeName.trim(),
        countryCode,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Boundaries] No boundary found for "${placeName}"`);
        return null;
      }
      const error = await response.json();
      console.error('[Boundaries] API error:', error.error);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      console.warn(`[Boundaries] No result for "${placeName}"`);
      return null;
    }

    return data.result;
  } catch (error) {
    console.error('[Boundaries] Error fetching boundary:', error);
    return null;
  }
}

/**
 * Get boundary polygons for multiple places
 *
 * @param placeNames - Array of place names
 * @param countryCode - ISO country code (default: 'ae')
 * @returns Map of place name to boundary result
 */
export async function getMultipleBoundaries(
  placeNames: string[],
  countryCode: string = 'ae'
): Promise<Map<string, BoundaryResult>> {
  const results = new Map<string, BoundaryResult>();

  // Process sequentially to respect Nominatim rate limits
  for (const placeName of placeNames) {
    const boundary = await getPlaceBoundary(placeName, countryCode);
    if (boundary) {
      results.set(placeName, boundary);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Create an approximate circular boundary around a point
 * Useful as a fallback when no detailed boundary is available
 *
 * @param center - Center point [lng, lat]
 * @param radiusKm - Radius in kilometers
 * @param steps - Number of points in the circle (default: 32)
 * @returns Array of polygon coordinates
 */
export function createCircleBoundary(
  center: [number, number],
  radiusKm: number,
  steps: number = 32
): [number, number][] {
  const polygon: [number, number][] = [];
  const [lng, lat] = center;

  // Convert km to degrees (approximate)
  const latOffset = radiusKm / 111.32;
  const lngOffset = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const pointLng = lng + lngOffset * Math.cos(angle);
    const pointLat = lat + latOffset * Math.sin(angle);
    polygon.push([pointLng, pointLat]);
  }

  return polygon;
}
