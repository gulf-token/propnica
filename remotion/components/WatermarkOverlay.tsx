import React from 'react';
import type { OverlayPosition } from '../../src/types';

// ===========================================
// Types
// ===========================================

interface WatermarkOverlayProps {
  text: string;
  position: OverlayPosition;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  colour?: string;
}

// ===========================================
// Position Styles
// ===========================================

function getPositionStyles(position: OverlayPosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    margin: '16px',
  };

  switch (position) {
    case 'top-left':
      return { ...base, top: 0, left: 0 };
    case 'top-centre':
      return { ...base, top: 0, left: '50%', transform: 'translateX(-50%)' };
    case 'top-right':
      return { ...base, top: 0, right: 0 };
    case 'middle-left':
      return { ...base, top: '50%', left: 0, transform: 'translateY(-50%)' };
    case 'middle-centre':
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    case 'middle-right':
      return { ...base, top: '50%', right: 0, transform: 'translateY(-50%)' };
    case 'bottom-left':
      return { ...base, bottom: 0, left: 0 };
    case 'bottom-centre':
      return { ...base, bottom: 0, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-right':
      return { ...base, bottom: 0, right: 0 };
    default:
      return { ...base, bottom: 0, left: 0 };
  }
}

// ===========================================
// Main Component
// ===========================================

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  text,
  position,
  opacity = 0.5,
  fontSize = 14,
  fontFamily = 'Inter, system-ui, sans-serif',
  colour = '#ffffff',
}) => {
  const positionStyles = getPositionStyles(position);

  if (!text) return null;

  return (
    <div
      style={{
        ...positionStyles,
        opacity,
        fontFamily,
        fontSize,
        fontWeight: 500,
        color: colour,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        letterSpacing: 0.5,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  );
};

export default WatermarkOverlay;
