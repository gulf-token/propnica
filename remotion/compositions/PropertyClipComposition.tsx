import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type {
  ProjectConfig,
  Keyframe,
  TextMarker,
  Route,
  Zone,
  CameraState,
  EasingType,
  ElementTiming,
} from '../../src/types';
import { MapRenderer } from '../components/MapRenderer';
import { TitleOverlay } from '../components/TitleOverlay';
import { LogoOverlay } from '../components/LogoOverlay';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { MarkerRenderer } from '../components/MarkerRenderer';
import { RouteRenderer } from '../components/RouteRenderer';

// ===========================================
// Types
// ===========================================

interface PropertyClipCompositionProps {
  config: ProjectConfig;
}

interface ViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

// ===========================================
// Easing Functions
// ===========================================

const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: Easing.in(Easing.quad),
  easeOutQuad: Easing.out(Easing.quad),
  easeInOutQuad: Easing.inOut(Easing.quad),
  easeInCubic: Easing.in(Easing.cubic),
  easeOutCubic: Easing.out(Easing.cubic),
  easeInOutCubic: Easing.inOut(Easing.cubic),
  easeInQuart: Easing.in(Easing.poly(4)),
  easeOutQuart: Easing.out(Easing.poly(4)),
  easeInOutQuart: Easing.inOut(Easing.poly(4)),
  easeInExpo: Easing.in(Easing.exp),
  easeOutExpo: Easing.out(Easing.exp),
  easeInOutExpo: Easing.inOut(Easing.exp),
};

// ===========================================
// Keyframe Interpolation
// ===========================================

function interpolateKeyframes(
  keyframes: Keyframe[],
  currentTimeMs: number
): CameraState {
  // Default camera state
  const defaultCamera: CameraState = {
    centre: [55.2708, 25.2048], // Dubai
    zoom: 14,
    bearing: 0,
    pitch: 45,
  };

  if (keyframes.length === 0) {
    return defaultCamera;
  }

  // Sort keyframes by time
  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  // If we're before the first keyframe
  if (currentTimeMs < sortedKeyframes[0].time) {
    return sortedKeyframes[0].camera;
  }

  // If we're at or past the last keyframe
  const lastKf = sortedKeyframes[sortedKeyframes.length - 1];
  if (currentTimeMs >= lastKf.time + lastKf.duration) {
    return lastKf.camera;
  }

  // Find the current and next keyframe
  let prevKeyframe = sortedKeyframes[0];
  let nextKeyframe = sortedKeyframes[0];

  for (let i = 0; i < sortedKeyframes.length; i++) {
    const kf = sortedKeyframes[i];
    const kfEndTime = kf.time + kf.duration;

    if (currentTimeMs >= kf.time && currentTimeMs <= kfEndTime) {
      prevKeyframe = kf;
      nextKeyframe = sortedKeyframes[i + 1] || kf;
      break;
    } else if (currentTimeMs > kfEndTime) {
      prevKeyframe = kf;
      nextKeyframe = sortedKeyframes[i + 1] || kf;
    }
  }

  // If prev and next are the same, return prev's camera
  if (prevKeyframe.id === nextKeyframe.id) {
    return prevKeyframe.camera;
  }

  // Calculate interpolation progress
  const transitionStart = prevKeyframe.time + prevKeyframe.duration;
  const transitionEnd = nextKeyframe.time;

  if (currentTimeMs < transitionStart) {
    return prevKeyframe.camera;
  }

  if (currentTimeMs >= transitionEnd) {
    return nextKeyframe.camera;
  }

  // Get easing function
  const easing = easingFunctions[nextKeyframe.easing] || easingFunctions.linear;

  const progress = interpolate(
    currentTimeMs,
    [transitionStart, transitionEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const easedProgress = easing(progress);

  // Interpolate camera properties
  return {
    centre: [
      interpolate(
        easedProgress,
        [0, 1],
        [prevKeyframe.camera.centre[0], nextKeyframe.camera.centre[0]]
      ),
      interpolate(
        easedProgress,
        [0, 1],
        [prevKeyframe.camera.centre[1], nextKeyframe.camera.centre[1]]
      ),
    ] as [number, number],
    zoom: interpolate(
      easedProgress,
      [0, 1],
      [prevKeyframe.camera.zoom, nextKeyframe.camera.zoom]
    ),
    pitch: interpolate(
      easedProgress,
      [0, 1],
      [prevKeyframe.camera.pitch, nextKeyframe.camera.pitch]
    ),
    bearing: interpolateBearing(
      prevKeyframe.camera.bearing,
      nextKeyframe.camera.bearing,
      easedProgress
    ),
  };
}

/**
 * Interpolate bearing values, handling the wrap-around at 360 degrees
 */
function interpolateBearing(
  fromBearing: number,
  toBearing: number,
  progress: number
): number {
  // Normalise bearings to 0-360 range
  const from = ((fromBearing % 360) + 360) % 360;
  const to = ((toBearing % 360) + 360) % 360;

  // Find the shortest path
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  return ((from + delta * progress) % 360 + 360) % 360;
}

// ===========================================
// Element Visibility Calculator
// ===========================================

function isElementVisible(timing: ElementTiming, currentTimeMs: number): boolean {
  const startMs = timing.startTime * 1000;
  const endMs = timing.endTime * 1000;
  return currentTimeMs >= startMs && currentTimeMs <= endMs;
}

function getVisibleMarkers(
  markers: TextMarker[],
  currentTimeMs: number
): TextMarker[] {
  return markers.filter((marker) => isElementVisible(marker.timing, currentTimeMs));
}

function getVisibleRoutes(routes: Route[], currentTimeMs: number): Route[] {
  return routes.filter((route) => isElementVisible(route.timing, currentTimeMs));
}

function getVisibleZones(zones: Zone[], currentTimeMs: number): Zone[] {
  return zones.filter((zone) => isElementVisible(zone.timing, currentTimeMs));
}

// ===========================================
// Animation Progress Calculator
// ===========================================

function getRouteAnimationProgress(route: Route, currentTimeMs: number): number {
  // If no animation, return fully visible
  if (route.animation.type === 'none') return 1;

  const startMs = route.timing.startTime * 1000;
  const animationDurationMs = route.animation.duration * 1000;
  const animationEnd = startMs + animationDurationMs;

  if (currentTimeMs < startMs) return 0;
  if (currentTimeMs >= animationEnd) return 1;

  return interpolate(currentTimeMs, [startMs, animationEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// ===========================================
// Main Composition Component
// ===========================================

export const PropertyClipComposition: React.FC<PropertyClipCompositionProps> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Calculate current time in milliseconds
  const currentTimeMs = (frame / fps) * 1000;

  // Get interpolated camera state from keyframes
  const camera = interpolateKeyframes(config.keyframes, currentTimeMs);

  // Convert camera state to view state for renderers (using US spelling for internal use)
  const viewState: ViewState = {
    center: camera.centre,
    zoom: camera.zoom,
    pitch: camera.pitch,
    bearing: camera.bearing,
  };

  // Get visible elements based on timing
  const visibleMarkers = getVisibleMarkers(config.textMarkers, currentTimeMs);
  const visibleRoutes = getVisibleRoutes(config.routes, currentTimeMs);
  const visibleZones = getVisibleZones(config.zones, currentTimeMs);

  // Calculate route animation progress
  const routesWithProgress = visibleRoutes.map((route) => ({
    ...route,
    animationProgress: getRouteAnimationProgress(route, currentTimeMs),
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
      }}
    >
      {/* Map Layer */}
      <AbsoluteFill>
        <MapRenderer
          camera={camera}
          mapSettings={config.mapSettings}
          width={width}
          height={height}
          markers={visibleMarkers}
          routes={routesWithProgress}
          zones={visibleZones}
        />
      </AbsoluteFill>

      {/* Markers Layer (rendered on top for better visibility) */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <MarkerRenderer
          markers={visibleMarkers}
          viewState={viewState}
          width={width}
          height={height}
          frame={frame}
          fps={fps}
          currentTimeMs={currentTimeMs}
        />
      </AbsoluteFill>

      {/* Routes Animation Layer */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <RouteRenderer
          routes={routesWithProgress}
          viewState={viewState}
          width={width}
          height={height}
          frame={frame}
          fps={fps}
          currentTimeMs={currentTimeMs}
        />
      </AbsoluteFill>

      {/* Overlays Layer */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {/* Title Overlay */}
        {config.branding.title && (
          <TitleOverlay
            text={config.branding.title.text}
            subtitle={config.branding.title.subtitle}
            position={config.branding.title.position}
            style={config.branding.title.style}
            animateIn={true}
            animateOut={true}
            frame={frame}
            fps={fps}
            fadeInDuration={config.branding.title.timing.fadeInDuration}
            fadeOutDuration={config.branding.title.timing.fadeOutDuration}
            fadeOutStart={config.branding.title.timing.endTime - config.branding.title.timing.fadeOutDuration}
          />
        )}

        {/* Logo Overlay */}
        {config.branding.logo && config.branding.logo.url && (
          <LogoOverlay
            url={config.branding.logo.url}
            position={config.branding.logo.position}
            size={config.branding.logo.width}
            opacity={config.branding.logo.opacity}
            animateIn={true}
            frame={frame}
            fps={fps}
          />
        )}

        {/* Watermark Overlay */}
        {config.branding.watermark && config.branding.watermark.text && (
          <WatermarkOverlay
            text={config.branding.watermark.text}
            position={config.branding.watermark.position}
            fontSize={config.branding.watermark.fontSize}
            colour={config.branding.watermark.colour}
            opacity={config.branding.watermark.opacity}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default PropertyClipComposition;
