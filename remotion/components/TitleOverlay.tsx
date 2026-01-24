import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import type { OverlayPosition, TitleStyle } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface TitleOverlayProps {
  text: string;
  position: OverlayPosition;
  style: TitleStyle;
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
    padding: '16px 24px',
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
      return { ...base, top: 0, left: 0 };
  }
}

// ===========================================
// Animation Helpers
// ===========================================

function getSlideDirection(position: OverlayPosition): { x: number; y: number } {
  if (position.includes('left')) return { x: -50, y: 0 };
  if (position.includes('right')) return { x: 50, y: 0 };
  if (position.includes('top')) return { x: 0, y: -30 };
  if (position.includes('bottom')) return { x: 0, y: 30 };
  return { x: 0, y: -20 };
}

// ===========================================
// Main Component
// ===========================================

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  text,
  position,
  style,
  animateIn = true,
  animateOut = false,
  frame,
  fps,
  fadeInDuration = 0.5,
  fadeOutDuration = 0.5,
  fadeOutStart,
}) => {
  const { durationInFrames } = useVideoConfig();
  
  // Calculate animation values
  const fadeInFrames = Math.round(fadeInDuration * fps);
  const fadeOutFrames = Math.round(fadeOutDuration * fps);
  const fadeOutStartFrame = fadeOutStart
    ? Math.round(fadeOutStart * fps)
    : durationInFrames - fadeOutFrames;
  
  // Entry animation (spring-based)
  const entryProgress = animateIn
    ? spring({
        frame,
        fps,
        config: {
          damping: 20,
          stiffness: 100,
          mass: 0.5,
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
  const slideDirection = getSlideDirection(position);
  const translateX = interpolate(entryProgress, [0, 1], [slideDirection.x, 0]);
  const translateY = interpolate(entryProgress, [0, 1], [slideDirection.y, 0]);
  
  // Scale animation
  const scale = interpolate(entryProgress, [0, 1], [0.95, 1]);
  
  // Get base position styles
  const positionStyles = getPositionStyles(position);
  
  // Build transform string
  let transform = positionStyles.transform || '';
  transform += ` translate(${translateX}px, ${translateY}px) scale(${scale})`;
  
  if (!text) return null;

  return (
    <div
      style={{
        ...positionStyles,
        transform,
        opacity,
        fontFamily: style.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: style.fontSize || 32,
        fontWeight: style.fontWeight || 600,
        color: style.color || '#ffffff',
        backgroundColor: style.backgroundColor || 'rgba(0, 0, 0, 0.7)',
        borderRadius: style.borderRadius ?? 8,
        letterSpacing: style.letterSpacing ?? 0,
        textShadow: style.textShadow || '0 2px 4px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        whiteSpace: 'pre-wrap',
        maxWidth: '80%',
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
};

export default TitleOverlay;
