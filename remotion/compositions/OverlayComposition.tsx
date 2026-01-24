import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { ProjectConfig } from '../../src/types';
import { TitleOverlay } from '../components/TitleOverlay';
import { LogoOverlay } from '../components/LogoOverlay';
import { WatermarkOverlay } from '../components/WatermarkOverlay';

// ===========================================
// Types
// ===========================================

interface OverlayCompositionProps {
  config: ProjectConfig;
}

// ===========================================
// Main Composition Component
// ===========================================

export const OverlayComposition: React.FC<OverlayCompositionProps> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Title Overlay */}
      {config.overlays.title.enabled && (
        <TitleOverlay
          text={config.overlays.title.text}
          position={config.overlays.title.position}
          style={config.overlays.title.style}
          animateIn={true}
          frame={frame}
          fps={fps}
        />
      )}
      
      {/* Logo Overlay */}
      {config.overlays.logo.enabled && config.overlays.logo.url && (
        <LogoOverlay
          url={config.overlays.logo.url}
          position={config.overlays.logo.position}
          size={config.overlays.logo.size}
          animateIn={true}
          frame={frame}
          fps={fps}
        />
      )}
      
      {/* Watermark Overlay */}
      {config.overlays.watermark.enabled && config.overlays.watermark.text && (
        <WatermarkOverlay
          text={config.overlays.watermark.text}
          position={config.overlays.watermark.position}
          opacity={config.overlays.watermark.opacity}
        />
      )}
    </AbsoluteFill>
  );
};

export default OverlayComposition;
