// @ts-nocheck
import React from 'react';
import { Composition } from 'remotion';
import { PropertyClipComposition } from './compositions/PropertyClipComposition';
import { DEFAULT_PROJECT_CONFIG, RESOLUTION_PRESETS } from '../src/types';
import type { ProjectConfig } from '../src/types';

// ===========================================
// Default Props for Compositions
// ===========================================

const defaultProjectConfig: ProjectConfig = {
  ...DEFAULT_PROJECT_CONFIG,
  keyframes: [
    {
      id: 'kf-1',
      name: 'Start',
      time: 0,
      duration: 10,
      camera: {
        centre: [55.2708, 25.2048], // Dubai
        zoom: 14,
        bearing: 0,
        pitch: 45,
      },
      easing: 'easeInOutCubic',
    },
    {
      id: 'kf-2',
      name: 'Pan',
      time: 10,
      duration: 10,
      camera: {
        centre: [55.2750, 25.2100],
        zoom: 15,
        bearing: 45,
        pitch: 60,
      },
      easing: 'easeInOutCubic',
    },
    {
      id: 'kf-3',
      name: 'End',
      time: 20,
      duration: 10,
      camera: {
        centre: [55.2708, 25.2048],
        zoom: 16,
        bearing: 90,
        pitch: 45,
      },
      easing: 'easeOutCubic',
    },
  ],
};

// ===========================================
// Calculate Metadata Helper
// ===========================================

interface CalculateMetadataProps {
  props: { config: ProjectConfig };
}

function calculateCompositionMetadata({ props }: CalculateMetadataProps) {
  const config = props.config || defaultProjectConfig;
  const settings = config.settings;
  const resolution = RESOLUTION_PRESETS[settings.resolution];
  const durationInFrames = Math.round(settings.duration * settings.fps);

  return {
    durationInFrames,
    fps: settings.fps,
    width: resolution.width,
    height: resolution.height,
  };
}

// ===========================================
// Root Component
// ===========================================

export const RemotionRoot: React.FC = () => {
  const defaultResolution = RESOLUTION_PRESETS[defaultProjectConfig.settings.resolution];
  const defaultDuration = defaultProjectConfig.settings.duration;
  const defaultFps = defaultProjectConfig.settings.fps;
  const defaultDurationInFrames = Math.round(defaultDuration * defaultFps);

  return (
    <>
      {/* Main Property Clip Composition */}
      <Composition
        id="PropertyClip"
        component={PropertyClipComposition}
        durationInFrames={defaultDurationInFrames}
        fps={defaultFps}
        width={defaultResolution.width}
        height={defaultResolution.height}
        defaultProps={{
          config: defaultProjectConfig,
        }}
        calculateMetadata={calculateCompositionMetadata}
      />

      {/* 720p Preset */}
      <Composition
        id="PropertyClip720p"
        component={PropertyClipComposition}
        durationInFrames={defaultDurationInFrames}
        fps={defaultFps}
        width={RESOLUTION_PRESETS['720p'].width}
        height={RESOLUTION_PRESETS['720p'].height}
        defaultProps={{
          config: {
            ...defaultProjectConfig,
            settings: {
              ...defaultProjectConfig.settings,
              resolution: '720p',
            },
          },
        }}
        calculateMetadata={calculateCompositionMetadata}
      />

      {/* 4K Preset */}
      <Composition
        id="PropertyClip4K"
        component={PropertyClipComposition}
        durationInFrames={defaultDurationInFrames}
        fps={defaultFps}
        width={RESOLUTION_PRESETS['4k'].width}
        height={RESOLUTION_PRESETS['4k'].height}
        defaultProps={{
          config: {
            ...defaultProjectConfig,
            settings: {
              ...defaultProjectConfig.settings,
              resolution: '4k',
            },
          },
        }}
        calculateMetadata={calculateCompositionMetadata}
      />

      {/* Vertical/Portrait for Social Media (1080x1920) */}
      <Composition
        id="PropertyClipVertical"
        component={PropertyClipComposition}
        durationInFrames={defaultDurationInFrames}
        fps={defaultFps}
        width={1080}
        height={1920}
        defaultProps={{
          config: defaultProjectConfig,
        }}
      />

      {/* Square for Instagram (1080x1080) */}
      <Composition
        id="PropertyClipSquare"
        component={PropertyClipComposition}
        durationInFrames={defaultDurationInFrames}
        fps={defaultFps}
        width={1080}
        height={1080}
        defaultProps={{
          config: defaultProjectConfig,
        }}
      />
    </>
  );
};
