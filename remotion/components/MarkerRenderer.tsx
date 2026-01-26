/**
 * MarkerRenderer Component
 *
 * Renders animated text markers with entry/exit animations.
 * Used in Remotion compositions to display labels and markers on the map.
 */

import React from 'react';
import type {
  TextMarker,
  ElementTiming,
  TextEntryAnimation,
  ExitAnimationType,
  AnimationEasing,
} from '../../src/types';
import { ViewState, projectToScreen } from '../utils/projection';
import { applyEasing } from '../utils/easing';

/**
 * Simple linear interpolation between two values
 */
function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;

  // Clamp value to input range
  const clampedValue = Math.max(inputMin, Math.min(inputMax, value));

  // Calculate interpolation
  const ratio = (clampedValue - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
}

// ===========================================
// Types
// ===========================================

interface MarkerRendererProps {
  markers: TextMarker[];
  viewState: ViewState;
  width: number;
  height: number;
  frame?: number;
  fps?: number;
  currentTimeMs?: number;
}

interface AnimationState {
  opacity: number;
  scale: number;
  translateY: number;
  translateX: number;
  blur: number;
  rotation: number;
  clipPath?: string;
}

interface MarkerIconProps {
  marker: TextMarker;
  x: number;
  y: number;
  scale?: number;
}

// ===========================================
// Animation Calculation Functions
// ===========================================

function calculateEntryAnimation(
  entryType: TextEntryAnimation,
  progress: number,
  easing: AnimationEasing,
  textLength: number = 0
): AnimationState {
  const easedProgress = applyEasing(progress, easing);

  const baseState: AnimationState = {
    opacity: 1,
    scale: 1,
    translateY: 0,
    translateX: 0,
    blur: 0,
    rotation: 0,
  };

  switch (entryType) {
    case 'instant':
      return { ...baseState, opacity: progress > 0 ? 1 : 0 };

    case 'fadeIn':
      return { ...baseState, opacity: easedProgress };

    case 'scaleUp':
      return {
        ...baseState,
        opacity: easedProgress,
        scale: interpolate(easedProgress, [0, 1], [0.5, 1]),
      };

    case 'slideUp':
      return {
        ...baseState,
        opacity: easedProgress,
        translateY: interpolate(easedProgress, [0, 1], [20, 0]),
      };

    case 'bounce':
      // Custom bounce effect
      const bounceEased = applyEasing(progress, 'easeOutBounce');
      return {
        ...baseState,
        opacity: Math.min(1, progress * 2),
        scale: interpolate(bounceEased, [0, 1], [0.3, 1]),
        translateY: interpolate(bounceEased, [0, 1], [-30, 0]),
      };

    case 'blur':
      return {
        ...baseState,
        opacity: easedProgress,
        blur: interpolate(easedProgress, [0, 1], [10, 0]),
      };

    case 'typewriter':
      // Typewriter reveals characters progressively
      const charCount = Math.floor(textLength * easedProgress);
      const clipPercentage = textLength > 0 ? (charCount / textLength) * 100 : 100;
      return {
        ...baseState,
        opacity: 1,
        clipPath: `inset(0 ${100 - clipPercentage}% 0 0)`,
      };

    case 'wordByWord':
      // Word by word reveal
      return {
        ...baseState,
        opacity: easedProgress,
      };

    default:
      return { ...baseState, opacity: easedProgress };
  }
}

function calculateExitAnimation(
  exitType: ExitAnimationType,
  progress: number, // 0 = start of exit, 1 = fully exited
  easing: AnimationEasing
): AnimationState {
  const easedProgress = applyEasing(progress, easing);
  const invertedProgress = 1 - easedProgress;

  const baseState: AnimationState = {
    opacity: 1,
    scale: 1,
    translateY: 0,
    translateX: 0,
    blur: 0,
    rotation: 0,
  };

  switch (exitType) {
    case 'instant':
      return { ...baseState, opacity: progress < 1 ? 1 : 0 };

    case 'fadeOut':
      return { ...baseState, opacity: invertedProgress };

    case 'scaleDown':
      return {
        ...baseState,
        opacity: invertedProgress,
        scale: interpolate(easedProgress, [0, 1], [1, 0.5]),
      };

    case 'scaleUp':
      return {
        ...baseState,
        opacity: invertedProgress,
        scale: interpolate(easedProgress, [0, 1], [1, 1.5]),
      };

    case 'slideDown':
      return {
        ...baseState,
        opacity: invertedProgress,
        translateY: interpolate(easedProgress, [0, 1], [0, 20]),
      };

    case 'slideUp':
      return {
        ...baseState,
        opacity: invertedProgress,
        translateY: interpolate(easedProgress, [0, 1], [0, -20]),
      };

    default:
      return { ...baseState, opacity: invertedProgress };
  }
}

// ===========================================
// Marker Icon Component
// ===========================================

const MarkerIconComponent: React.FC<MarkerIconProps> = ({
  marker,
  x,
  y,
  scale = 1,
}) => {
  // Get size from icon config or use default
  const size = marker.icon?.size ?? 24;
  const colour = marker.icon?.colour ?? marker.style?.fontColour ?? '#ef4444';
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
              marker.style?.backgroundColour ?? 'rgba(0, 0, 0, 0.75)',
            opacity: marker.style?.backgroundOpacity ?? 1,
            color: marker.style?.fontColour ?? 'white',
            padding: marker.style?.padding ?? 4,
            borderRadius: marker.style?.borderRadius ?? 4,
            fontSize: marker.style?.fontSize ?? 12,
            fontFamily: marker.style?.fontFamily ?? 'Inter, system-ui, sans-serif',
            fontWeight: marker.style?.fontWeight ?? 'normal',
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
      {markers.map((marker) => {
        // Skip markers without timing
        if (!marker.timing) return null;

        // Get timing configuration
        const { startTime, endTime, fadeInDuration, fadeOutDuration } =
          marker.timing;
        const startMs = startTime * 1000;
        const endMs = endTime * 1000;
        const fadeInMs = fadeInDuration * 1000;
        const fadeOutMs = fadeOutDuration * 1000;

        // Check if marker should be visible
        if (timeMs < startMs || timeMs > endMs) return null;

        // Project position to screen coordinates
        const screenPosition = projectToScreen(
          marker.position,
          viewState,
          width,
          height
        );

        // Check if marker is visible on screen (with padding)
        const padding = 100;
        const isVisible =
          screenPosition.x > -padding &&
          screenPosition.x < width + padding &&
          screenPosition.y > -padding &&
          screenPosition.y < height + padding;

        if (!isVisible) return null;

        // Get animation config with defaults
        const animConfig = marker.animationConfig;
        const entryType: TextEntryAnimation =
          animConfig?.entryAnimation ?? 'fadeIn';
        const entryDuration = (animConfig?.entryDuration ?? 0.5) * 1000;
        const entryEasing: AnimationEasing =
          animConfig?.entryEasing ?? 'easeOutCubic';
        const exitType: ExitAnimationType = animConfig?.exitType ?? 'fadeOut';
        const exitDuration = (animConfig?.exitDuration ?? 0.5) * 1000;
        const exitEasing: AnimationEasing =
          animConfig?.exitEasing ?? 'easeInCubic';

        // Calculate animation state based on timing
        let animState: AnimationState;

        if (entryDuration > 0 && timeMs < startMs + entryDuration) {
          // Entry animation phase (with division by zero protection)
          const entryProgress = Math.min(1, (timeMs - startMs) / entryDuration);
          animState = calculateEntryAnimation(
            entryType,
            entryProgress,
            entryEasing,
            marker.text?.length ?? 0
          );
        } else if (exitDuration > 0 && timeMs > endMs - exitDuration) {
          // Exit animation phase (with division by zero protection)
          const exitProgress = Math.min(
            1,
            (timeMs - (endMs - exitDuration)) / exitDuration
          );
          animState = calculateExitAnimation(exitType, exitProgress, exitEasing);
        } else {
          // Fully visible phase
          animState = {
            opacity: 1,
            scale: 1,
            translateY: 0,
            translateX: 0,
            blur: 0,
            rotation: 0,
          };
        }

        // Construct transform string
        const transforms: string[] = [];
        if (animState.scale !== 1)
          transforms.push(`scale(${animState.scale})`);
        if (animState.translateX !== 0)
          transforms.push(`translateX(${animState.translateX}px)`);
        if (animState.translateY !== 0)
          transforms.push(`translateY(${animState.translateY}px)`);
        if (animState.rotation !== 0)
          transforms.push(`rotate(${animState.rotation}deg)`);

        const filterEffects: string[] = [];
        if (animState.blur > 0)
          filterEffects.push(`blur(${animState.blur}px)`);

        return (
          <div
            key={marker.id}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: animState.opacity,
              transform:
                transforms.length > 0 ? transforms.join(' ') : undefined,
              filter:
                filterEffects.length > 0 ? filterEffects.join(' ') : undefined,
              clipPath: animState.clipPath,
            }}
          >
            <MarkerIconComponent
              marker={marker}
              x={screenPosition.x}
              y={screenPosition.y}
              scale={animState.scale}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MarkerRenderer;
