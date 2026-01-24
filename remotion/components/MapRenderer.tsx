import React from 'react';
import { Img, staticFile } from 'remotion';
import type { MapMarker, Route, Polygon } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface MapRendererProps {
  mapStyle: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  width: number;
  height: number;
  markers: MapMarker[];
  routes: (Route & { animationProgress?: number })[];
  polygons: Polygon[];
}

// ===========================================
// Mapbox Static API URL Builder
// ===========================================

function buildStaticMapUrl(props: MapRendererProps): string {
  const {
    mapStyle,
    center,
    zoom,
    pitch,
    bearing,
    width,
    height,
    markers,
    routes,
    polygons,
  } = props;

  // Extract style ID from Mapbox style URL
  const styleMatch = mapStyle.match(/mapbox:\/\/styles\/([^/]+\/[^/]+)/);
  const styleId = styleMatch ? styleMatch[1] : 'mapbox/streets-v12';

  const accessToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.warn('Mapbox access token not found. Using placeholder.');
    return `https://via.placeholder.com/${width}x${height}/1a1a2e/ffffff?text=Map+Preview`;
  }

  // Build the base URL
  const baseUrl = `https://api.mapbox.com/styles/v1/${styleId}/static`;

  // Build overlays array
  const overlays: string[] = [];

  // Add polygon overlays (must come first)
  polygons.forEach((polygon) => {
    if (polygon.coordinates && polygon.coordinates.length >= 3) {
      const fillColor = polygon.fillColor?.replace('#', '') || '3b82f6';
      const fillOpacity = polygon.fillOpacity ?? 0.3;
      const strokeColor = polygon.strokeColor?.replace('#', '') || '2563eb';
      const strokeWidth = polygon.strokeWidth ?? 2;
      
      // Build path string for polygon
      const pathCoords = polygon.coordinates.map(([lng, lat]) => `${lng},${lat}`).join(',');
      
      overlays.push(
        `path-${strokeWidth}+${strokeColor}-${fillOpacity}+${fillColor}(${encodeURIComponent(pathCoords)})`
      );
    }
  });

  // Add route overlays
  routes.forEach((route) => {
    if (route.coordinates && route.coordinates.length >= 2) {
      const color = route.color?.replace('#', '') || 'ff0000';
      const width = route.width ?? 3;
      
      // If route is animated, only show partial path
      let coords = route.coordinates;
      if (route.animationProgress !== undefined && route.animationProgress < 1) {
        const visiblePoints = Math.ceil(coords.length * route.animationProgress);
        coords = coords.slice(0, Math.max(2, visiblePoints));
      }
      
      const pathCoords = coords.map(([lng, lat]) => `${lng},${lat}`).join(',');
      
      overlays.push(
        `path-${width}+${color}(${encodeURIComponent(pathCoords)})`
      );
    }
  });

  // Add marker overlays (pin-s for small, pin-m for medium, pin-l for large)
  markers.forEach((marker) => {
    const color = marker.color?.replace('#', '') || 'ff0000';
    const size = marker.size === 'large' ? 'l' : marker.size === 'medium' ? 'm' : 's';
    const icon = marker.icon || 'marker';
    
    overlays.push(
      `pin-${size}-${icon}+${color}(${marker.coordinates[0]},${marker.coordinates[1]})`
    );
  });

  // Combine overlays
  const overlayString = overlays.length > 0 ? overlays.join(',') + '/' : '';

  // Build final URL with viewport
  // Note: Mapbox Static API doesn't support pitch in the same way
  // For now, we use center, zoom, bearing
  const viewport = `${center[0]},${center[1]},${zoom},${bearing}`;
  
  // Limit dimensions to Mapbox Static API limits
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
  center: [number, number],
  zoom: number,
  width: number,
  height: number,
  tileSize: number = 512
): TileConfig[] {
  const scale = Math.pow(2, zoom);
  
  // Convert center to tile coordinates
  const centerX = ((center[0] + 180) / 360) * scale;
  const centerY = ((1 - Math.log(Math.tan((center[1] * Math.PI) / 180) + 1 / Math.cos((center[1] * Math.PI) / 180)) / Math.PI) / 2) * scale;
  
  // Calculate tile range needed
  const tilesX = Math.ceil(width / tileSize) + 2;
  const tilesY = Math.ceil(height / tileSize) + 2;
  
  const startTileX = Math.floor(centerX - tilesX / 2);
  const startTileY = Math.floor(centerY - tilesY / 2);
  
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
