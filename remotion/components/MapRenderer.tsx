// @ts-nocheck
import React from 'react';
import { Img } from 'remotion';
import type { TextMarker, Route, Zone, MapSettings, CameraState } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface MapRendererProps {
  camera: CameraState;
  mapSettings: MapSettings;
  width: number;
  height: number;
  markers?: TextMarker[];
  routes?: (Route & { animationProgress?: number })[];
  zones?: Zone[];
}

// ===========================================
// Mapbox Style Mapping
// ===========================================

function getMapboxStyleUrl(style: string): string {
  const styleMap: Record<string, string> = {
    satellite: 'mapbox/satellite-v9',
    'satellite-streets': 'mapbox/satellite-streets-v12',
    streets: 'mapbox/streets-v12',
    light: 'mapbox/light-v11',
    dark: 'mapbox/dark-v11',
    outdoors: 'mapbox/outdoors-v12',
    terrain: 'mapbox/satellite-streets-v12', // Terrain is handled via elevation layer
  };

  return styleMap[style] || styleMap['satellite-streets'];
}

// ===========================================
// Mapbox Static API URL Builder
// ===========================================

function buildStaticMapUrl(props: MapRendererProps): string {
  const { camera, mapSettings, width, height, markers = [], routes = [], zones = [] } = props;

  const styleId = getMapboxStyleUrl(mapSettings.style);

  const accessToken =
    mapSettings.accessToken ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('Mapbox access token not found. Using placeholder.');
    return `https://via.placeholder.com/${width}x${height}/1a1a2e/ffffff?text=Map+Preview`;
  }

  // Build the base URL
  const baseUrl = `https://api.mapbox.com/styles/v1/${styleId}/static`;

  // Build overlays array
  const overlays: string[] = [];

  // Add zone overlays (must come first)
  zones.forEach((zone) => {
    if (zone.coordinates && zone.coordinates.length >= 3) {
      // Access nested style properties
      const fillColour = zone.style.fillColour?.replace('#', '') || '3b82f6';
      const fillOpacity = zone.style.fillOpacity ?? 0.3;
      const strokeColour = zone.style.strokeColour?.replace('#', '') || '2563eb';
      const strokeWidth = zone.style.strokeWidth ?? 2;

      // Build path string for zone polygon
      const pathCoords = zone.coordinates
        .map(([lng, lat]) => `${lng},${lat}`)
        .join(',');

      // Close the polygon by adding the first point at the end if not already closed
      const firstCoord = zone.coordinates[0];
      const lastCoord = zone.coordinates[zone.coordinates.length - 1];
      const closedPathCoords =
        firstCoord[0] === lastCoord[0] && firstCoord[1] === lastCoord[1]
          ? pathCoords
          : `${pathCoords},${firstCoord[0]},${firstCoord[1]}`;

      overlays.push(
        `path-${strokeWidth}+${strokeColour}-${fillOpacity}+${fillColour}(${encodeURIComponent(closedPathCoords)})`
      );
    }
  });

  // Add route overlays
  routes.forEach((route) => {
    if (route.coordinates && route.coordinates.length >= 2) {
      // Access nested style properties
      const colour = route.style.colour?.replace('#', '') || 'ff0000';
      const routeWidth = route.style.width ?? 3;

      // If route is animated, only show partial path
      let coords = route.coordinates;
      if (route.animationProgress !== undefined && route.animationProgress < 1) {
        const visiblePoints = Math.ceil(coords.length * route.animationProgress);
        coords = coords.slice(0, Math.max(2, visiblePoints));
      }

      const pathCoords = coords.map(([lng, lat]) => `${lng},${lat}`).join(',');

      overlays.push(
        `path-${routeWidth}+${colour}(${encodeURIComponent(pathCoords)})`
      );
    }
  });

  // Add marker overlays (pin-s for small, pin-m for medium, pin-l for large)
  markers.forEach((marker) => {
    // Access nested properties
    const colour = (marker.icon?.colour ?? marker.style.fontColour ?? '#ff0000').replace('#', '');
    const iconSize = marker.icon?.size ?? 24;
    const size = iconSize >= 36 ? 'l' : iconSize >= 24 ? 'm' : 's';
    const iconType = marker.icon?.type ?? 'marker';

    // Only use standard Mapbox icons
    const validIcon = ['marker', 'pin', 'star', 'heart', 'home', 'building'].includes(iconType)
      ? iconType
      : 'marker';

    overlays.push(
      `pin-${size}-${validIcon}+${colour}(${marker.position[0]},${marker.position[1]})`
    );
  });

  // Combine overlays
  const overlayString = overlays.length > 0 ? overlays.join(',') + '/' : '';

  // Build viewport string
  // Mapbox Static API format: longitude,latitude,zoom,bearing,pitch
  const viewport = `${camera.centre[0]},${camera.centre[1]},${camera.zoom},${camera.bearing}`;

  // Limit dimensions to Mapbox Static API limits (1280x1280 at @2x)
  const clampedWidth = Math.min(width, 1280);
  const clampedHeight = Math.min(height, 1280);

  return `${baseUrl}/${overlayString}${viewport}/${clampedWidth}x${clampedHeight}@2x?access_token=${accessToken}`;
}

// ===========================================
// Alternative: Tile-based rendering for larger resolutions
// ===========================================

interface TileConfig {
  x: number;
  y: number;
  z: number;
  size: number;
}

function calculateTiles(
  centre: [number, number],
  zoom: number,
  width: number,
  height: number,
  tileSize: number = 512
): TileConfig[] {
  const scale = Math.pow(2, zoom);

  // Convert centre to tile coordinates
  const centreX = ((centre[0] + 180) / 360) * scale;
  const centreY =
    ((1 -
      Math.log(
        Math.tan((centre[1] * Math.PI) / 180) +
          1 / Math.cos((centre[1] * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    scale;

  // Calculate tile range needed
  const tilesX = Math.ceil(width / tileSize) + 2;
  const tilesY = Math.ceil(height / tileSize) + 2;

  const startTileX = Math.floor(centreX - tilesX / 2);
  const startTileY = Math.floor(centreY - tilesY / 2);

  const tiles: TileConfig[] = [];

  for (let x = startTileX; x < startTileX + tilesX; x++) {
    for (let y = startTileY; y < startTileY + tilesY; y++) {
      tiles.push({
        x: ((x % scale) + scale) % scale, // Wrap around
        y: Math.max(0, Math.min(scale - 1, y)),
        z: Math.floor(zoom),
        size: tileSize,
      });
    }
  }

  return tiles;
}

// ===========================================
// Main Component
// ===========================================

export const MapRenderer: React.FC<MapRendererProps> = (props) => {
  const { width, height } = props;

  // For Remotion rendering, we use Mapbox Static API
  // This provides a single image of the map at the specified viewport
  const mapUrl = buildStaticMapUrl(props);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
      }}
    >
      <Img
        src={mapUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={(e) => {
          // Fallback to placeholder on error
          const target = e.target as HTMLImageElement;
          target.src = `https://via.placeholder.com/${width}x${height}/1a1a2e/ffffff?text=Map+Error`;
        }}
      />
    </div>
  );
};

export default MapRenderer;
