/**
 * Server-side Geocoding API Endpoint
 *
 * Handles geocoding requests from the client to avoid CORS issues
 * with Google Geocoding API.
 *
 * Priority:
 * 1. Known UAE landmarks dictionary
 * 2. Google Geocoding API
 * 3. Mapbox fallback
 */

import { NextRequest, NextResponse } from 'next/server';

// ===========================================
// Known UAE Landmarks with Precise Coordinates
// ===========================================

const KNOWN_LANDMARKS: Record<string, [number, number]> = {
  // Dubai Landmarks
  'burj khalifa': [55.2744, 25.1972],
  'burj al arab': [55.1853, 25.1412],
  'dubai mall': [55.2796, 25.1985],
  'dubai marina': [55.1430, 25.0805],
  'palm jumeirah': [55.1384, 25.1124],
  'dubai frame': [55.3001, 25.2352],
  'museum of the future': [55.2826, 25.2198],
  'dubai creek': [55.3272, 25.2631],
  'dubai creek harbour': [55.3442, 25.2044],
  'downtown dubai': [55.2744, 25.1972],
  'business bay': [55.2646, 25.1850],
  'jbr': [55.1410, 25.0770],
  'jumeirah beach residence': [55.1410, 25.0770],
  'dubai international airport': [55.3647, 25.2528],
  'dxb airport': [55.3647, 25.2528],
  'emirates towers': [55.2829, 25.2176],
  'world trade centre dubai': [55.2829, 25.2288],
  'deira': [55.3258, 25.2728],
  'bur dubai': [55.3028, 25.2608],
  'city walk': [55.2611, 25.2111],
  'la mer': [55.2536, 25.2211],
  'bluewaters island': [55.1254, 25.0810],
  'ain dubai': [55.1244, 25.0783],
  'dubai hills': [55.2410, 25.1236],
  'arabian ranches': [55.2598, 25.0487],
  'motor city': [55.2358, 25.0432],
  'silicon oasis': [55.3911, 25.1186],
  'al barsha': [55.2098, 25.1025],
  'jumeirah village circle': [55.2090, 25.0635],
  'jvc': [55.2090, 25.0635],
  'mirdif': [55.4246, 25.2166],
  'ras al khor wildlife sanctuary': [55.3361, 25.1849],
  'dubai': [55.2708, 25.2048],
  'dubai city': [55.2708, 25.2048],

  // Abu Dhabi Landmarks
  'sheikh zayed grand mosque': [54.4714, 24.4128],
  'louvre abu dhabi': [54.3983, 24.5336],
  'yas island': [54.6046, 24.4910],
  'yas marina circuit': [54.6026, 24.4677],
  'ferrari world': [54.6073, 24.4834],
  'emirates palace': [54.3172, 24.4619],
  'corniche abu dhabi': [54.3428, 24.4718],
  'qasr al watan': [54.3161, 24.4620],
  'saadiyat island': [54.4339, 24.5407],
  'al maryah island': [54.3893, 24.4994],
  'abu dhabi': [54.3773, 24.4539],

  // Sharjah Landmarks
  'sharjah museum': [55.3926, 25.3579],
  'al noor mosque sharjah': [55.3877, 25.3581],
  'al majaz waterfront': [55.3913, 25.3352],
  'sharjah': [55.4033, 25.3463],

  // Other Emirates
  'ajman corniche': [55.4434, 25.4167],
  'ajman': [55.4434, 25.4052],
  'ras al khaimah': [55.9432, 25.7895],
  'fujairah': [56.3411, 25.1288],
  'umm al quwain': [55.5689, 25.5582],

  // Dubai Areas/Neighborhoods
  'bay square': [55.2646, 25.1850],
  'bay square business bay': [55.2646, 25.1850],
  'emaar beachfront': [55.1340, 25.0850],
  'dubai south': [55.1692, 24.8981],
  'expo city dubai': [55.0867, 24.9600],
  'dubai production city': [55.1932, 25.0358],
  'jumeirah lake towers': [55.1462, 25.0735],
  'jlt': [55.1462, 25.0735],
  'tecom': [55.1730, 25.0970],
  'al quoz': [55.2259, 25.1389],
  'al wasl': [55.2550, 25.1892],
};

// UAE bounds for biasing results
const UAE_BOUNDS = {
  north: 26.1,
  south: 22.6,
  east: 56.4,
  west: 51.5,
};

// ===========================================
// Helper Functions
// ===========================================

function normalizeLocationName(name: string): string {
  return name.toLowerCase().trim().replace(/[,.']/g, '');
}

function findKnownLandmark(locationName: string): [number, number] | null {
  const normalized = normalizeLocationName(locationName);

  // Direct match
  if (KNOWN_LANDMARKS[normalized]) {
    return KNOWN_LANDMARKS[normalized];
  }

  // Partial match - check if location contains landmark name or vice versa
  for (const [landmark, coords] of Object.entries(KNOWN_LANDMARKS)) {
    if (normalized.includes(landmark) || landmark.includes(normalized)) {
      return coords;
    }
  }

  // Word-based match - check if any key words match
  const normalizedWords = normalized.split(/\s+/);
  for (const [landmark, coords] of Object.entries(KNOWN_LANDMARKS)) {
    const landmarkWords = landmark.split(/\s+/);
    const matchingWords = normalizedWords.filter(w => landmarkWords.includes(w) && w.length > 2);
    if (matchingWords.length >= 2 || (matchingWords.length === 1 && landmarkWords.length === 1)) {
      return coords;
    }
  }

  return null;
}

async function geocodeWithGoogle(locationName: string): Promise<{
  coordinates: [number, number];
  confidence: number;
  source: string;
} | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('[Geocode API] Google Maps API key not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      address: locationName,
      key: apiKey,
      region: 'ae', // UAE region bias
      bounds: `${UAE_BOUNDS.south},${UAE_BOUNDS.west}|${UAE_BOUNDS.north},${UAE_BOUNDS.east}`,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`[Geocode API] Google API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`[Geocode API] No Google results for "${locationName}": ${data.status}`);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Convert to Mapbox format [longitude, latitude]
    const coordinates: [number, number] = [location.lng, location.lat];

    // Check if result is within UAE bounds (with some tolerance)
    const tolerance = 2; // degrees
    if (
      location.lat < UAE_BOUNDS.south - tolerance ||
      location.lat > UAE_BOUNDS.north + tolerance ||
      location.lng < UAE_BOUNDS.west - tolerance ||
      location.lng > UAE_BOUNDS.east + tolerance
    ) {
      console.warn(`[Geocode API] Google result for "${locationName}" outside UAE: ${coordinates}`);
      return null; // Reject results outside UAE
    }

    console.log(`[Geocode API] Google result for "${locationName}":`, coordinates);

    return {
      coordinates,
      confidence:
        result.geometry.location_type === 'ROOFTOP' ? 1.0 :
        result.geometry.location_type === 'RANGE_INTERPOLATED' ? 0.8 :
        result.geometry.location_type === 'GEOMETRIC_CENTER' ? 0.6 : 0.5,
      source: 'google',
    };
  } catch (error) {
    console.error(`[Geocode API] Google error for "${locationName}":`, error);
    return null;
  }
}

async function geocodeWithMapbox(locationName: string): Promise<{
  coordinates: [number, number];
  confidence: number;
  source: string;
} | null> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('[Geocode API] Mapbox access token not configured');
    return null;
  }

  try {
    // Bias towards Dubai
    const proximity = '55.2708,25.2048';
    // Restrict to UAE bounding box
    const bbox = `${UAE_BOUNDS.west},${UAE_BOUNDS.south},${UAE_BOUNDS.east},${UAE_BOUNDS.north}`;

    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json`
    );
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('proximity', proximity);
    url.searchParams.set('bbox', bbox);
    url.searchParams.set('limit', '1');
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`[Geocode API] Mapbox error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn(`[Geocode API] No Mapbox results for "${locationName}"`);
      return null;
    }

    const feature = data.features[0];
    const coordinates = feature.center as [number, number];

    // Verify result is within UAE bounds
    if (
      coordinates[1] < UAE_BOUNDS.south ||
      coordinates[1] > UAE_BOUNDS.north ||
      coordinates[0] < UAE_BOUNDS.west ||
      coordinates[0] > UAE_BOUNDS.east
    ) {
      console.warn(`[Geocode API] Mapbox result for "${locationName}" outside UAE: ${coordinates}`);
      return null;
    }

    console.log(`[Geocode API] Mapbox result for "${locationName}":`, coordinates);

    return {
      coordinates,
      confidence: feature.relevance ?? 0.5,
      source: 'mapbox',
    };
  } catch (error) {
    console.error(`[Geocode API] Mapbox error for "${locationName}":`, error);
    return null;
  }
}

// ===========================================
// API Route Handler
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locations } = body;

    if (!locations || !Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'locations array is required' },
        { status: 400 }
      );
    }

    const results: Record<string, {
      name: string;
      coordinates: [number, number];
      confidence: number;
      source: string;
    }> = {};

    for (const location of locations) {
      if (typeof location !== 'string' || !location.trim()) {
        continue;
      }

      const locationName = location.trim();

      // 1. Check known landmarks first
      const knownCoords = findKnownLandmark(locationName);
      if (knownCoords) {
        console.log(`[Geocode API] Known landmark for "${locationName}":`, knownCoords);
        results[locationName] = {
          name: locationName,
          coordinates: knownCoords,
          confidence: 1.0,
          source: 'known_landmarks',
        };
        continue;
      }

      // 2. Try Google Geocoding API
      const googleResult = await geocodeWithGoogle(locationName);
      if (googleResult) {
        results[locationName] = {
          name: locationName,
          ...googleResult,
        };
        continue;
      }

      // 3. Fallback to Mapbox
      const mapboxResult = await geocodeWithMapbox(locationName);
      if (mapboxResult) {
        results[locationName] = {
          name: locationName,
          ...mapboxResult,
        };
        continue;
      }

      // 4. If all fail, use Dubai center as default
      console.warn(`[Geocode API] All methods failed for "${locationName}", using Dubai default`);
      results[locationName] = {
        name: locationName,
        coordinates: [55.2708, 25.2048], // Dubai center
        confidence: 0.1,
        source: 'default',
      };
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[Geocode API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
