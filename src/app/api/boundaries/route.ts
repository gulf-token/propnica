/**
 * Server-side Boundary Lookup API
 *
 * Fetches detailed polygon boundaries for places from OpenStreetMap
 * (via Nominatim), with fallback to approximate circular boundaries.
 */

import { NextRequest, NextResponse } from 'next/server';

// ===========================================
// Types
// ===========================================

interface BoundaryRequest {
  placeName: string;
  countryCode?: string;
}

interface BoundaryResponse {
  success: boolean;
  result?: BoundaryResult;
  error?: string;
}

interface BoundaryResult {
  name: string;
  displayName: string;
  coordinates: [number, number]; // Center point [lng, lat]
  polygon: [number, number][]; // Polygon coordinates [lng, lat][]
  source: 'nominatim' | 'approximate';
  confidence: 'high' | 'medium' | 'low';
  placeType?: string;
}

// ===========================================
// Cache (1 hour TTL for boundaries)
// ===========================================

interface CacheEntry {
  data: BoundaryResponse;
  timestamp: number;
}

const boundaryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(placeName: string, countryCode: string): string {
  return `${countryCode}:${placeName.toLowerCase().trim()}`;
}

function getFromCache(key: string): BoundaryResponse | null {
  const entry = boundaryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) {
    boundaryCache.delete(key);
  }
  return null;
}

function setCache(key: string, data: BoundaryResponse): void {
  if (boundaryCache.size > 200) {
    const entries = Array.from(boundaryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 20; i++) {
      boundaryCache.delete(entries[i][0]);
    }
  }
  boundaryCache.set(key, { data, timestamp: Date.now() });
}

// ===========================================
// Rate Limiting for Nominatim (1 req/sec policy)
// ===========================================

let lastNominatimRequest = 0;
const NOMINATIM_MIN_INTERVAL = 1100; // 1.1 seconds between requests

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastNominatimRequest;
  if (timeSinceLastRequest < NOMINATIM_MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_MIN_INTERVAL - timeSinceLastRequest));
  }
  lastNominatimRequest = Date.now();
}

// ===========================================
// Nominatim API
// ===========================================

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  boundingbox: [string, string, string, string];
  geojson?: {
    type: string;
    coordinates: unknown;
  };
}

async function fetchFromNominatim(
  placeName: string,
  countryCode: string
): Promise<BoundaryResult | null> {
  await waitForRateLimit();

  const params = new URLSearchParams({
    q: placeName,
    countrycodes: countryCode,
    format: 'json',
    polygon_geojson: '1',
    polygon_threshold: '0.0001', // High detail
    limit: '1',
    addressdetails: '1',
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'Propnica/1.0 (property video platform)',
        },
      }
    );

    if (!response.ok) {
      console.error(`[Boundaries API] Nominatim error: ${response.status}`);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0 || !results[0].geojson) {
      console.log(`[Boundaries API] No polygon found for "${placeName}"`);
      return null;
    }

    const result = results[0];
    const geojson = result.geojson;

    // Extract polygon coordinates from GeoJSON
    let polygon: [number, number][] = [];

    // Handle missing or undefined geojson
    if (!geojson) {
      // No geometry - create approximate circle
      const center: [number, number] = [parseFloat(result.lon), parseFloat(result.lat)];
      const radius = estimateRadiusForPlaceType(result.type, result.class);
      polygon = createCirclePolygon(center, radius);

      return {
        name: placeName,
        displayName: result.display_name,
        coordinates: center,
        polygon,
        source: 'approximate',
        confidence: 'low',
        placeType: result.type,
      };
    }

    if (geojson.type === 'Polygon') {
      // Simple polygon - take outer ring
      polygon = (geojson.coordinates as [number, number][][])[0];
    } else if (geojson.type === 'MultiPolygon') {
      // MultiPolygon - take largest polygon
      const polygons = geojson.coordinates as [number, number][][][];
      let largestArea = 0;
      for (const poly of polygons) {
        const area = calculatePolygonArea(poly[0]);
        if (area > largestArea) {
          largestArea = area;
          polygon = poly[0];
        }
      }
    } else if (geojson.type === 'Point') {
      // Point - create approximate circle
      const center: [number, number] = [parseFloat(result.lon), parseFloat(result.lat)];
      const radius = estimateRadiusForPlaceType(result.type, result.class);
      polygon = createCirclePolygon(center, radius);

      return {
        name: placeName,
        displayName: result.display_name,
        coordinates: center,
        polygon,
        source: 'approximate',
        confidence: 'low',
        placeType: result.type,
      };
    }

    if (polygon.length === 0) {
      return null;
    }

    // Ensure polygon is closed
    if (polygon.length > 0) {
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        polygon.push([...first] as [number, number]);
      }
    }

    console.log(`[Boundaries API] Found polygon for "${placeName}" with ${polygon.length} points`);

    return {
      name: placeName,
      displayName: result.display_name,
      coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
      polygon,
      source: 'nominatim',
      confidence: geojson.type === 'Polygon' || geojson.type === 'MultiPolygon' ? 'high' : 'medium',
      placeType: result.type,
    };
  } catch (error) {
    console.error(`[Boundaries API] Nominatim error:`, error);
    return null;
  }
}

// ===========================================
// Approximate Boundary Creation
// ===========================================

function estimateRadiusForPlaceType(type: string, placeClass: string): number {
  // Radius in kilometers based on place type
  const radiusMap: Record<string, number> = {
    city: 8,
    town: 4,
    suburb: 1.5,
    neighbourhood: 0.6,
    quarter: 0.4,
    village: 1,
    hamlet: 0.2,
    residential: 0.8,
    commercial: 0.4,
    building: 0.03,
    yes: 0.5, // Generic place
  };

  return radiusMap[type] || radiusMap[placeClass] || 0.5;
}

function createCirclePolygon(
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

function calculatePolygonArea(polygon: [number, number][]): number {
  // Shoelace formula for approximate area
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return Math.abs(area / 2);
}

async function createApproximateBoundary(
  placeName: string,
  countryCode: string
): Promise<BoundaryResult | null> {
  // Use Nominatim just for geocoding (without polygon)
  await waitForRateLimit();

  const params = new URLSearchParams({
    q: placeName,
    countrycodes: countryCode,
    format: 'json',
    limit: '1',
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'Propnica/1.0 (property video platform)',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    const center: [number, number] = [parseFloat(result.lon), parseFloat(result.lat)];
    const radius = estimateRadiusForPlaceType(result.type, result.class);
    const polygon = createCirclePolygon(center, radius);

    console.log(`[Boundaries API] Created approximate boundary for "${placeName}" (${radius}km radius)`);

    return {
      name: placeName,
      displayName: result.display_name,
      coordinates: center,
      polygon,
      source: 'approximate',
      confidence: 'low',
      placeType: result.type,
    };
  } catch (error) {
    console.error(`[Boundaries API] Geocoding error:`, error);
    return null;
  }
}

// ===========================================
// API Route Handler
// ===========================================

export async function POST(request: NextRequest): Promise<NextResponse<BoundaryResponse>> {
  try {
    const body: BoundaryRequest = await request.json();
    const { placeName, countryCode = 'ae' } = body;

    if (!placeName || typeof placeName !== 'string' || placeName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'placeName is required' },
        { status: 400 }
      );
    }

    const normalizedName = placeName.trim();

    // Check cache
    const cacheKey = getCacheKey(normalizedName, countryCode);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      console.log(`[Boundaries API] Cache hit for "${normalizedName}"`);
      return NextResponse.json(cachedResult);
    }

    // Try Nominatim with polygon
    console.log(`[Boundaries API] Looking up boundary for "${normalizedName}"`);
    let result = await fetchFromNominatim(normalizedName, countryCode);

    // Fall back to approximate boundary
    if (!result) {
      result = await createApproximateBoundary(normalizedName, countryCode);
    }

    if (!result) {
      const response: BoundaryResponse = {
        success: false,
        error: `Could not find boundary for "${normalizedName}"`,
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: BoundaryResponse = {
      success: true,
      result,
    };

    // Cache result
    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Boundaries API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
