import React from 'react';
import { Composition } from 'remotion';
import { PropertyClipComposition } from './compositions/PropertyClipComposition';
import { MapAnimationComposition } from './compositions/MapAnimationComposition';
import { OverlayComposition } from './compositions/OverlayComposition';
import type { ProjectConfig } from '../src/types';

// ===========================================
// Default Props
// ===========================================

const defaultProjectConfig: ProjectConfig = {
  mapStyle: 'mapbox://styles/mapbox/streets-v12',
  center: [-0.1276, 51.5074], // London
  zoom: 12,
  pitch: 0,
  bearing: 0,
  duration: 30,
  fps: 30,
  resolution: {
    width: 1920,
    height: 1080,
  },
  markers: [],
  routes: [],
  polygons: [],
  keyframes: [],
  overlays: {
    title: {
      enabled: false,
      text: '',
      position: 'top-left',
      style: {
        fontFamily: 'Inter',
        fontSize: 24,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      },
    },
    logo: {
      enabled: false,
      url: '',
      position: 'bottom-right',
      size: 100,
    },
    watermark: {
      enabled: false,
      text: '',
      position: 'bottom-left',
      opacity: 0.5,
    },
  },
  transitions: {
    type: 'linear',
    easing: 'easeInOut',
  },
};

// ===========================================
// Root Component
// ===========================================

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main Property Clip Composition */}
      <Composition
        id="PropertyClip"
        component={PropertyClipComposition}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          config: defaultProjectConfig,
        }}
        calculateMetadata={({ props }) => {
          const config = props.config || defaultProjectConfig;
          const durationInFrames = Math.round(config.duration * config.fps);
          return {
            durationInFrames,
            fps: config.fps,
            width: config.resolution.width,
            height: config.resolution.height,
          };
        }}
      />

      {/* Map Animation Only Composition */}
      <Composition
        id="MapAnimation"
        component={MapAnimationComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          config: defaultProjectConfig,
        }}
        calculateMetadata={({ props }) => {
          const config = props.config || defaultProjectConfig;
          const durationInFrames = Math.round(config.duration * config.fps);
          return {
            durationInFrames,
            fps: config.fps,
            width: config.resolution.width,
            height: config.resolution.height,
          };
        }}
      />

      {/* Overlay Only Composition (for compositing) */}
      <Composition
        id="Overlay"
        component={OverlayComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          config: defaultProjectConfig,
        }}
        calculateMetadata={({ props }) => {
          const config = props.config || defaultProjectConfig;
          const durationInFrames = Math.round(config.duration * config.fps);
          return {
            durationInFrames,
            fps: config.fps,
            width: config.resolution.width,
            height: config.resolution.height,
          };
        }}
      />

      {/* 720p Preset */}
      <Composition
        id="PropertyClip720p"
        component={PropertyClipComposition}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          config: {
            ...defaultProjectConfig,
            resolution: { width: 1280, height: 720 },
          },
        }}
      />

      {/* 4K Preset */}
      <Composition
        id="PropertyClip4K"
        component={PropertyClipComposition}
        durationInFrames={900}
        fps={30}
        width={3840}
        height={2160}
        defaultProps={{
          config: {
            ...defaultProjectConfig,
            resolution: { width: 3840, height: 2160 },
          },
        }}
      />

      {/* Vertical/Portrait for Social Media */}
      <Composition
        id="PropertyClipVertical"
        component={PropertyClipComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          config: {
            ...defaultProjectConfig,
            resolution: { width: 1080, height: 1920 },
          },
        }}
      />

      {/* Square for Instagram */}
      <Composition
        id="PropertyClipSquare"
        component={PropertyClipComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          config: {
            ...defaultProjectConfig,
            resolution: { width: 1080, height: 1080 },
          },
        }}
      />
    </>
  );
};
