/**
 * Server-side Directions API Endpoint
 *
 * Fetches road-based routes from Mapbox Directions API
 * to get actual road geometry between waypoints.
 */

import { NextRequest, NextResponse } from 'next/server';

// ===========================================
// Types
// ===========================================

interface DirectionsRequest {
  coordinates: [number, number][]; // Array of [lng, lat] pairs
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
  alternatives?: boolean;
}

interface DirectionsResponse {
  success: boolean;
  routes: RouteResult[];
  waypoints: WaypointResult[];
  error?: string;
}

interface RouteResult {
  geometry: [number, number][]; // Array of [lng, lat] coordinates
  distance: number; // meters
  duration: number; // seconds
}

interface WaypointResult {
  name: string;
  location: [number, number];
}

// ===========================================
// Simple in-memory cache (15 minute TTL)
// ===========================================

interface CacheEntry {
  data: DirectionsResponse;
  timestamp: number;
}

const routeCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCacheKey(coordinates: [number, number][], profile: string): string {
  const coordString = coordinates.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(';');
  return `${profile}:${coordString}`;
}

function getFromCache(key: string): DirectionsResponse | null {
  const entry = routeCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) {
    routeCache.delete(key);
  }
  return null;
}

function setCache(key: string, data: DirectionsResponse): void {
  // Limit cache size
  if (routeCache.size > 500) {
    const entries = Array.from(routeCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 50; i++) {
      routeCache.delete(entries[i][0]);
    }
  }
  routeCache.set(key, { data, timestamp: Date.now() });
}

// ===========================================
// Polyline Decoding (polyline6 format)
// ===========================================

function decodePolyline(encoded: string, precision: number = 6): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    // Decode longitude
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // Polyline format is lat,lng but we need lng,lat for GeoJSON/Mapbox
    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

// ===========================================
// Rate Limiting
// ===========================================

let requestCount = 0;
let windowStart = Date.now();
const MAX_REQUESTS_PER_MINUTE = 300;

function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - windowStart > 60000) {
    requestCount = 0;
    windowStart = now;
  }
  return requestCount < MAX_REQUESTS_PER_MINUTE;
}

// ===========================================
// API Route Handler
// ===========================================

export async function POST(request: NextRequest): Promise<NextResponse<DirectionsResponse>> {
  try {
    const body: DirectionsRequest = await request.json();
    const {
      coordinates,
      profile = 'driving',
      alternatives = false,
    } = body;

    // Validate coordinates
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { success: false, routes: [], waypoints: [], error: 'At least 2 coordinates required' },
        { status: 400 }
      );
    }

    // Validate coordinate count
    const maxCoordinates = profile === 'driving-traffic' ? 3 : 25;
    if (coordinates.length > maxCoordinates) {
      return NextResponse.json(
        {
          success: false,
          routes: [],
          waypoints: [],
          error: `Maximum ${maxCoordinates} coordinates allowed for ${profile} profile`,
        },
        { status: 400 }
      );
    }

    // Validate coordinate format
    for (const coord of coordinates) {
      if (
        !Array.isArray(coord) ||
        coord.length !== 2 ||
        typeof coord[0] !== 'number' ||
        typeof coord[1] !== 'number' ||
        coord[0] < -180 || coord[0] > 180 ||
        coord[1] < -90 || coord[1] > 90
      ) {
        return NextResponse.json(
          { success: false, routes: [], waypoints: [], error: 'Invalid coordinate format' },
          { status: 400 }
        );
      }
    }

    // Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json(
        { success: false, routes: [], waypoints: [], error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Check cache
    const cacheKey = getCacheKey(coordinates, profile);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      console.log('[Directions API] Cache hit');
      return NextResponse.json(cachedResult);
    }

    // Build Mapbox Directions API URL
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, routes: [], waypoints: [], error: 'Mapbox access token not configured' },
        { status: 500 }
      );
    }

    const coordString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordString}`
    );

    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('geometries', 'polyline6');
    url.searchParams.set('overview', 'full');
    url.searchParams.set('alternatives', String(alternatives));

    // Make the request
    requestCount++;
    console.log(`[Directions API] Fetching route for ${coordinates.length} waypoints`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Directions API] Mapbox error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, routes: [], waypoints: [], error: `Mapbox API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Handle Mapbox error codes
    if (data.code !== 'Ok') {
      const errorMessages: Record<string, string> = {
        NoRoute: 'No route found between the specified locations',
        NoSegment: 'One or more coordinates could not be matched to a road',
        InvalidInput: 'Invalid request parameters',
      };

      return NextResponse.json(
        {
          success: false,
          routes: [],
          waypoints: [],
          error: errorMessages[data.code] || `Mapbox error: ${data.code}`,
        },
        { status: 400 }
      );
    }

    // Parse response
    const routes: RouteResult[] = (data.routes || []).map((route: {
      geometry: string;
      distance: number;
      duration: number;
    }) => ({
      geometry: decodePolyline(route.geometry, 6),
      distance: route.distance,
      duration: route.duration,
    }));

    const waypoints: WaypointResult[] = (data.waypoints || []).map((wp: {
      name: string;
      location: [number, number];
    }) => ({
      name: wp.name || '',
      location: wp.location,
    }));

    const result: DirectionsResponse = {
      success: true,
      routes,
      waypoints,
    };

    // Cache result
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Directions API] Error:', error);
    return NextResponse.json(
      { success: false, routes: [], waypoints: [], error: 'Internal server error' },
      { status: 500 }
    );
  }
}
