import React from 'react';
import { Img, interpolate, spring, useVideoConfig } from 'remotion';
import type { OverlayPosition } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface LogoOverlayProps {
  url: string;
  position: OverlayPosition;
  size: number;
  animateIn?: boolean;
  animateOut?: boolean;
  frame: number;
  fps: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  fadeOutStart?: number;
}

// ===========================================
// Position Styles
// ===========================================

function getPositionStyles(position: OverlayPosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    margin: '24px',
  };

  switch (position) {
    case 'top-left':
      return { ...base, top: 0, left: 0 };
    case 'top-center':
      return { ...base, top: 0, left: '50%', transform: 'translateX(-50%)' };
    case 'top-right':
      return { ...base, top: 0, right: 0 };
    case 'center-left':
      return { ...base, top: '50%', left: 0, transform: 'translateY(-50%)' };
    case 'center':
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    case 'center-right':
      return { ...base, top: '50%', right: 0, transform: 'translateY(-50%)' };
    case 'bottom-left':
      return { ...base, bottom: 0, left: 0 };
    case 'bottom-center':
      return { ...base, bottom: 0, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-right':
      return { ...base, bottom: 0, right: 0 };
    default:
      return { ...base, bottom: 0, right: 0 };
  }
}

// ===========================================
// Animation Helpers
// ===========================================

function getEntryDirection(position: OverlayPosition): { x: number; y: number } {
  if (position.includes('left')) return { x: -30, y: 0 };
  if (position.includes('right')) return { x: 30, y: 0 };
  if (position.includes('top')) return { x: 0, y: -20 };
  if (position.includes('bottom')) return { x: 0, y: 20 };
  return { x: 0, y: 0 };
}

// ===========================================
// Main Component
// ===========================================

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  url,
  position,
  size,
  animateIn = true,
  animateOut = false,
  frame,
  fps,
  fadeInDuration = 0.6,
  fadeOutDuration = 0.4,
  fadeOutStart,
}) => {
  const { durationInFrames } = useVideoConfig();
  
  // Calculate animation values
  const fadeInFrames = Math.round(fadeInDuration * fps);
  const fadeOutFrames = Math.round(fadeOutDuration * fps);
  const fadeOutStartFrame = fadeOutStart
    ? Math.round(fadeOutStart * fps)
    : durationInFrames - fadeOutFrames;
  
  // Delay the logo entry slightly
  const entryDelay = Math.round(0.3 * fps);
  const delayedFrame = Math.max(0, frame - entryDelay);
  
  // Entry animation (spring-based)
  const entryProgress = animateIn
    ? spring({
        frame: delayedFrame,
        fps,
        config: {
          damping: 15,
          stiffness: 80,
          mass: 0.8,
        },
        durationInFrames: fadeInFrames,
      })
    : 1;
  
  // Exit animation
  const exitProgress = animateOut && frame >= fadeOutStartFrame
    ? interpolate(
        frame,
        [fadeOutStartFrame, fadeOutStartFrame + fadeOutFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 1;
  
  // Combined opacity
  const opacity = entryProgress * exitProgress;
  
  // Slide animation
  const entryDirection = getEntryDirection(position);
  const translateX = interpolate(entryProgress, [0, 1], [entryDirection.x, 0]);
  const translateY = interpolate(entryProgress, [0, 1], [entryDirection.y, 0]);
  
  // Scale animation (subtle pop effect)
  const scale = interpolate(entryProgress, [0, 0.8, 1], [0.8, 1.05, 1]);
  
  // Get base position styles
  const positionStyles = getPositionStyles(position);
  
  // Build transform string
  let transform = positionStyles.transform || '';
  transform += ` translate(${translateX}px, ${translateY}px) scale(${scale})`;
  
  if (!url) return null;

  return (
    <div
      style={{
        ...positionStyles,
        transform,
        opacity,
        width: size,
        height: 'auto',
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
      }}
    >
      <Img
        src={url}
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default LogoOverlay;
