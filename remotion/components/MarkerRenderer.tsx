import React from 'react';
import { interpolate, spring } from 'remotion';
import type { TextMarker, ElementTiming } from '../../src/types';

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
  markers: TextMarker[];
  viewState: ViewState;
  width: number;
  height: number;
  frame?: number;
  fps?: number;
  currentTimeMs?: number;
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Calculate element opacity based on timing configuration
 */
function calculateElementOpacity(timing: ElementTiming, currentTimeMs: number): number {
  const { startTime, endTime, fadeInDuration, fadeOutDuration } = timing;

  // Convert seconds to milliseconds if needed (timing uses seconds)
  const startMs = startTime * 1000;
  const endMs = endTime * 1000;
  const fadeInMs = fadeInDuration * 1000;
  const fadeOutMs = fadeOutDuration * 1000;

  // Before element should appear
  if (currentTimeMs < startMs) {
    return 0;
  }

  // During fade in
  if (currentTimeMs < startMs + fadeInMs) {
    return (currentTimeMs - startMs) / fadeInMs;
  }

  // During fade out
  if (currentTimeMs > endMs - fadeOutMs && currentTimeMs <= endMs) {
    return Math.max(0, (endMs - currentTimeMs) / fadeOutMs);
  }

  // After element should disappear
  if (currentTimeMs > endMs) {
    return 0;
  }

  // Fully visible
  return 1;
}

// ===========================================
// Coordinate Projection
// ===========================================

/**
 * Converts geographic coordinates to screen position
 * This is a simplified Web Mercator projection
 */
function projectToScreen(
  position: [number, number],
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
    const y =
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      scale;
    return { x, y };
  };

  // Get center and marker positions in Mercator
  const centerMerc = toMercator(center[0], center[1]);
  const markerMerc = toMercator(position[0], position[1]);

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
  marker: TextMarker;
  x: number;
  y: number;
  scale?: number;
}

const MarkerIconComponent: React.FC<MarkerIconProps> = ({
  marker,
  x,
  y,
  scale = 1,
}) => {
  // Get size from icon config or use default
  const size = marker.icon?.size ?? 24;
  const colour = marker.icon?.colour ?? marker.style.fontColour ?? '#ef4444';
  const iconType = marker.icon?.type ?? 'pin';

  // Custom icon URL (if type looks like a URL)
  if (iconType.startsWith('http') || iconType.startsWith('/')) {
    return (
      <div
        style={{
          position: 'absolute',
          left: x - (size * scale) / 2,
          top: y - size * scale,
          width: size * scale,
          height: size * scale,
          transform: `scale(${scale})`,
          transformOrigin: 'center bottom',
        }}
      >
        <img
          src={iconType}
          alt={marker.text || 'Marker'}
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
        top: y - size * scale,
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
          fill={colour}
        />
        {/* Inner circle */}
        <circle cx="12" cy="12" r="5" fill="white" />
        {/* Highlight */}
        <circle cx="9" cy="9" r="2" fill="rgba(255, 255, 255, 0.5)" />
      </svg>

      {/* Text label */}
      {marker.text && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: size * 1.4,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor:
              marker.style.backgroundColour ?? 'rgba(0, 0, 0, 0.75)',
            opacity: marker.style.backgroundOpacity ?? 1,
            color: marker.style.fontColour ?? 'white',
            padding: marker.style.padding ?? 4,
            borderRadius: marker.style.borderRadius ?? 4,
            fontSize: marker.style.fontSize ?? 12,
            fontFamily: marker.style.fontFamily ?? 'Inter, system-ui, sans-serif',
            fontWeight: marker.style.fontWeight ?? 'normal',
          }}
        >
          {marker.text}
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
  currentTimeMs,
}) => {
  // Calculate current time in milliseconds from frame if not provided
  const timeMs = currentTimeMs ?? (frame / fps) * 1000;

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
        // Check timing visibility
        const timingOpacity = calculateElementOpacity(marker.timing, timeMs);
        if (timingOpacity === 0) return null;

        // Project position to screen coordinates
        const screenPosition = projectToScreen(
          marker.position,
          viewState,
          width,
          height
        );

        if (!screenPosition.visible) return null;

        // Animate marker entry with spring animation
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
        const animationOpacity = interpolate(
          entryProgress,
          [0, 0.5, 1],
          [0, 1, 1]
        );

        // Combine timing opacity with animation opacity
        const finalOpacity = timingOpacity * animationOpacity;

        return (
          <div
            key={marker.id}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: finalOpacity,
            }}
          >
            <MarkerIconComponent
              marker={marker}
              x={screenPosition.x}
              y={screenPosition.y}
              scale={scale}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MarkerRenderer;
