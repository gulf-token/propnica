import React from 'react';
import { interpolate, spring } from 'remotion';
import type { MapMarker } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface ViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

interface MarkerRendererProps {
  markers: MapMarker[];
  viewState: ViewState;
  width: number;
  height: number;
  frame?: number;
  fps?: number;
}

// ===========================================
// Coordinate Projection
// ===========================================

/**
 * Converts geographic coordinates to screen position
 * This is a simplified Web Mercator projection
 */
function projectToScreen(
  coordinates: [number, number],
  viewState: ViewState,
  width: number,
  height: number
): { x: number; y: number; visible: boolean } {
  const { center, zoom, bearing } = viewState;
  
  // Scale factor based on zoom level
  const scale = Math.pow(2, zoom) * 256;
  
  // Convert to Web Mercator
  const toMercator = (lng: number, lat: number) => {
    const x = ((lng + 180) / 360) * scale;
    const y = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * scale;
    return { x, y };
  };
  
  // Get center and marker positions in Mercator
  const centerMerc = toMercator(center[0], center[1]);
  const markerMerc = toMercator(coordinates[0], coordinates[1]);
  
  // Calculate offset from center
  let offsetX = markerMerc.x - centerMerc.x;
  let offsetY = markerMerc.y - centerMerc.y;
  
  // Apply bearing rotation
  if (bearing !== 0) {
    const bearingRad = (bearing * Math.PI) / 180;
    const cos = Math.cos(bearingRad);
    const sin = Math.sin(bearingRad);
    const rotatedX = offsetX * cos - offsetY * sin;
    const rotatedY = offsetX * sin + offsetY * cos;
    offsetX = rotatedX;
    offsetY = rotatedY;
  }
  
  // Convert to screen coordinates
  const screenX = width / 2 + offsetX;
  const screenY = height / 2 + offsetY;
  
  // Check if marker is visible on screen (with some padding)
  const padding = 100;
  const visible =
    screenX > -padding &&
    screenX < width + padding &&
    screenY > -padding &&
    screenY < height + padding;
  
  return { x: screenX, y: screenY, visible };
}

// ===========================================
// Marker Icon Component
// ===========================================

interface MarkerIconProps {
  marker: MapMarker;
  x: number;
  y: number;
  scale?: number;
}

const MarkerIcon: React.FC<MarkerIconProps> = ({ marker, x, y, scale = 1 }) => {
  const size = marker.size === 'large' ? 48 : marker.size === 'medium' ? 36 : 24;
  const color = marker.color || '#ef4444';
  
  // Custom icon or default pin
  if (marker.icon && marker.icon !== 'pin' && marker.icon !== 'marker') {
    // Custom icon URL
    return (
      <div
        style={{
          position: 'absolute',
          left: x - (size * scale) / 2,
          top: y - (size * scale),
          width: size * scale,
          height: size * scale,
          transform: `scale(${scale})`,
          transformOrigin: 'center bottom',
        }}
      >
        <img
          src={marker.icon}
          alt={marker.label || 'Marker'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }
  
  // Default pin marker
  return (
    <div
      style={{
        position: 'absolute',
        left: x - (size * scale) / 2,
        top: y - (size * scale),
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
      }}
    >
      <svg
        width={size}
        height={size * 1.3}
        viewBox="0 0 24 31"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pin shape */}
        <path
          d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 19 12 19s12-10.75 12-19c0-6.627-5.373-12-12-12z"
          fill={color}
        />
        {/* Inner circle */}
        <circle cx="12" cy="12" r="5" fill="white" />
        {/* Highlight */}
        <circle cx="9" cy="9" r="2" fill="rgba(255, 255, 255, 0.5)" />
      </svg>
      
      {/* Label */}
      {marker.label && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: size * 1.4,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          {marker.label}
        </div>
      )}
    </div>
  );
};

// ===========================================
// Main Component
// ===========================================

export const MarkerRenderer: React.FC<MarkerRendererProps> = ({
  markers,
  viewState,
  width,
  height,
  frame = 0,
  fps = 30,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {markers.map((marker, index) => {
        const position = projectToScreen(marker.coordinates, viewState, width, height);
        
        if (!position.visible) return null;
        
        // Animate marker entry
        const entryProgress = spring({
          frame: Math.max(0, frame - index * 3), // Stagger entry
          fps,
          config: {
            damping: 12,
            stiffness: 100,
            mass: 0.5,
          },
          durationInFrames: 15,
        });
        
        const scale = interpolate(entryProgress, [0, 1], [0, 1]);
        const opacity = interpolate(entryProgress, [0, 0.5, 1], [0, 1, 1]);
        
        return (
          <div
            key={marker.id}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity,
            }}
          >
            <MarkerIcon
              marker={marker}
              x={position.x}
              y={position.y}
              scale={scale}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MarkerRenderer;
