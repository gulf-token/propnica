/**
 * Google Places/Geocoding API Integration
 *
 * This module provides geocoding services using Google's APIs for more accurate
 * POI and landmark locations, while the app continues to use Mapbox for map rendering.
 */

// ===========================================
// Types
// ===========================================

export interface GoogleGeocodingResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: [number, number]; // [longitude, latitude] - Mapbox format
  types: string[];
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  confidence: number;
}

export interface GooglePlaceAutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

// ===========================================
// Constants
// ===========================================

// UAE bounds for biasing results
const UAE_BOUNDS = {
  north: 26.1,
  south: 22.6,
  east: 56.4,
  west: 51.5,
};

// Dubai center for proximity bias
const DUBAI_CENTER = {
  lat: 25.2048,
  lng: 55.2708,
};

// ===========================================
// Geocoding Functions
// ===========================================

/**
 * Geocode a location name using Google Geocoding API
 * Returns coordinates in Mapbox format [longitude, latitude]
 */
export async function geocodeWithGoogle(
  locationName: string,
  options?: {
    region?: string;
    bounds?: { north: number; south: number; east: number; west: number };
  }
): Promise<GoogleGeocodingResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('[Google Geocoding] API key not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      address: locationName,
      key: apiKey,
      region: options?.region ?? 'ae', // UAE region bias
    });

    // Add bounds for UAE bias
    const bounds = options?.bounds ?? UAE_BOUNDS;
    params.set('bounds', `${bounds.south},${bounds.west}|${bounds.north},${bounds.east}`);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`[Google Geocoding] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`[Google Geocoding] No results for "${locationName}": ${data.status}`);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Convert to Mapbox format [longitude, latitude]
    const coordinates: [number, number] = [location.lng, location.lat];

    console.log(`[Google Geocoding] Result for "${locationName}":`, coordinates, result.types);

    return {
      placeId: result.place_id,
      name: locationName,
      formattedAddress: result.formatted_address,
      coordinates,
      types: result.types || [],
      viewport: result.geometry.viewport ? {
        northeast: result.geometry.viewport.northeast,
        southwest: result.geometry.viewport.southwest,
      } : undefined,
      confidence: result.geometry.location_type === 'ROOFTOP' ? 1.0 :
                  result.geometry.location_type === 'RANGE_INTERPOLATED' ? 0.8 :
                  result.geometry.location_type === 'GEOMETRIC_CENTER' ? 0.6 : 0.5,
    };
  } catch (error) {
    console.error(`[Google Geocoding] Error for "${locationName}":`, error);
    return null;
  }
}

/**
 * Search for places using Google Places Autocomplete API
 * Returns a list of place predictions for autocomplete
 */
export async function searchPlacesWithGoogle(
  query: string,
  options?: {
    sessionToken?: string;
    types?: string[];
  }
): Promise<GooglePlaceAutocompleteResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !query || query.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      input: query,
      key: apiKey,
      // Bias towards UAE
      location: `${DUBAI_CENTER.lat},${DUBAI_CENTER.lng}`,
      radius: '200000', // 200km radius
      components: 'country:ae|country:om|country:sa|country:bh|country:qa|country:kw', // GCC countries
      language: 'en',
    });

    if (options?.sessionToken) {
      params.set('sessiontoken', options.sessionToken);
    }

    if (options?.types?.length) {
      params.set('types', options.types.join('|'));
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`[Google Places] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.predictions?.length) {
      return [];
    }

    return data.predictions.map((prediction: any) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || '',
      types: prediction.types || [],
    }));
  } catch (error) {
    console.error('[Google Places] Autocomplete error:', error);
    return [];
  }
}

/**
 * Get place details including precise coordinates from a Place ID
 * This is more accurate than geocoding for POIs
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<GoogleGeocodingResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !placeId) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      fields: 'place_id,name,formatted_address,geometry,types',
    });

    if (sessionToken) {
      params.set('sessiontoken', sessionToken);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`[Google Places] Details API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.warn(`[Google Places] No details for place ID "${placeId}": ${data.status}`);
      return null;
    }

    const result = data.result;
    const location = result.geometry.location;

    // Convert to Mapbox format [longitude, latitude]
    const coordinates: [number, number] = [location.lng, location.lat];

    console.log(`[Google Places] Details for "${result.name}":`, coordinates, result.types);

    return {
      placeId: result.place_id,
      name: result.name,
      formattedAddress: result.formatted_address,
      coordinates,
      types: result.types || [],
      viewport: result.geometry.viewport ? {
        northeast: result.geometry.viewport.northeast,
        southwest: result.geometry.viewport.southwest,
      } : undefined,
      confidence: 1.0, // Place details are always precise
    };
  } catch (error) {
    console.error(`[Google Places] Details error for "${placeId}":`, error);
    return null;
  }
}

/**
 * Generate a unique session token for Place Autocomplete
 * Using the same token for autocomplete + details saves on API costs
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Calculate optimal zoom level based on Google viewport
 */
export function calculateZoomFromViewport(viewport?: {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}): number {
  if (!viewport) {
    return 16; // Default zoom for POIs
  }

  const latDiff = Math.abs(viewport.northeast.lat - viewport.southwest.lat);
  const lngDiff = Math.abs(viewport.northeast.lng - viewport.southwest.lng);
  const maxDiff = Math.max(latDiff, lngDiff);

  // Approximate zoom level based on viewport size
  if (maxDiff < 0.002) return 18;      // Building level
  if (maxDiff < 0.005) return 17;      // Block level
  if (maxDiff < 0.01) return 16;       // Street level
  if (maxDiff < 0.02) return 15;       // Neighborhood
  if (maxDiff < 0.05) return 14;       // District
  if (maxDiff < 0.1) return 13;        // City area
  if (maxDiff < 0.2) return 12;        // City
  if (maxDiff < 0.5) return 11;        // Metro area
  if (maxDiff < 1) return 10;          // Region
  return 9;                             // Wide area
}

/**
 * Determine the best zoom level for a place type
 */
export function getZoomForPlaceType(types: string[]): number {
  // Specific POIs - close zoom
  if (types.some(t => ['premise', 'establishment', 'point_of_interest', 'lodging', 'restaurant', 'store'].includes(t))) {
    return 17;
  }
  // Addresses - close zoom
  if (types.some(t => ['street_address', 'route'].includes(t))) {
    return 17;
  }
  // Neighborhoods
  if (types.some(t => ['neighborhood', 'sublocality', 'sublocality_level_1'].includes(t))) {
    return 15;
  }
  // Localities/cities
  if (types.some(t => ['locality', 'administrative_area_level_2'].includes(t))) {
    return 13;
  }
  // Regions
  if (types.some(t => ['administrative_area_level_1', 'country'].includes(t))) {
    return 10;
  }
  // Default
  return 16;
}
