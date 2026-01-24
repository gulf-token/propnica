import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { ProjectConfig, Keyframe, MapMarker, Route, Polygon } from '../../src/types';
import { MapRenderer } from '../components/MapRenderer';
import { MarkerRenderer } from '../components/MarkerRenderer';
import { RouteRenderer } from '../components/RouteRenderer';

// ===========================================
// Types
// ===========================================

interface MapAnimationCompositionProps {
  config: ProjectConfig;
}

interface InterpolatedViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

// ===========================================
// Easing Functions
// ===========================================

const easingFunctions: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: Easing.in(Easing.cubic),
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  easeInQuad: Easing.in(Easing.quad),
  easeOutQuad: Easing.out(Easing.quad),
  easeInOutQuad: Easing.inOut(Easing.quad),
  easeInCubic: Easing.in(Easing.cubic),
  easeOutCubic: Easing.out(Easing.cubic),
  easeInOutCubic: Easing.inOut(Easing.cubic),
};

// ===========================================
// Keyframe Interpolation
// ===========================================

function interpolateKeyframes(
  keyframes: Keyframe[],
  currentTime: number,
  easingName: string
): InterpolatedViewState {
  if (keyframes.length === 0) {
    return {
      center: [0, 0],
      zoom: 10,
      pitch: 0,
      bearing: 0,
    };
  }

  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  let prevKeyframe = sortedKeyframes[0];
  let nextKeyframe = sortedKeyframes[0];

  for (let i = 0; i < sortedKeyframes.length; i++) {
    if (sortedKeyframes[i].time <= currentTime) {
      prevKeyframe = sortedKeyframes[i];
      nextKeyframe = sortedKeyframes[i + 1] || sortedKeyframes[i];
    }
  }

  if (currentTime < sortedKeyframes[0].time) {
    return {
      center: sortedKeyframes[0].center,
      zoom: sortedKeyframes[0].zoom,
      pitch: sortedKeyframes[0].pitch,
      bearing: sortedKeyframes[0].bearing,
    };
  }

  if (currentTime >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    const lastKf = sortedKeyframes[sortedKeyframes.length - 1];
    return {
      center: lastKf.center,
      zoom: lastKf.zoom,
      pitch: lastKf.pitch,
      bearing: lastKf.bearing,
    };
  }

  const easing = easingFunctions[easingName] || easingFunctions.linear;
  const progress = interpolate(
    currentTime,
    [prevKeyframe.time, nextKeyframe.time],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const easedProgress = easing(progress);

  return {
    center: [
      interpolate(easedProgress, [0, 1], [prevKeyframe.center[0], nextKeyframe.center[0]]),
      interpolate(easedProgress, [0, 1], [prevKeyframe.center[1], nextKeyframe.center[1]]),
    ] as [number, number],
    zoom: interpolate(easedProgress, [0, 1], [prevKeyframe.zoom, nextKeyframe.zoom]),
    pitch: interpolate(easedProgress, [0, 1], [prevKeyframe.pitch, nextKeyframe.pitch]),
    bearing: interpolate(easedProgress, [0, 1], [prevKeyframe.bearing, nextKeyframe.bearing]),
  };
}

// ===========================================
// Visibility Helpers
// ===========================================

function getVisibleMarkers(markers: MapMarker[], currentTime: number): MapMarker[] {
  return markers.filter((marker) => {
    const visibleFrom = marker.visibleFrom ?? 0;
    const visibleTo = marker.visibleTo ?? Infinity;
    return currentTime >= visibleFrom && currentTime <= visibleTo;
  });
}

function getVisibleRoutes(routes: Route[], currentTime: number): Route[] {
  return routes.filter((route) => {
    const visibleFrom = route.visibleFrom ?? 0;
    const visibleTo = route.visibleTo ?? Infinity;
    return currentTime >= visibleFrom && currentTime <= visibleTo;
  });
}

function getVisiblePolygons(polygons: Polygon[], currentTime: number): Polygon[] {
  return polygons.filter((polygon) => {
    const visibleFrom = polygon.visibleFrom ?? 0;
    const visibleTo = polygon.visibleTo ?? Infinity;
    return currentTime >= visibleFrom && currentTime <= visibleTo;
  });
}

function getRouteAnimationProgress(route: Route, currentTime: number): number {
  if (!route.animated) return 1;
  
  const animationStart = route.animationStart ?? route.visibleFrom ?? 0;
  const animationDuration = route.animationDuration ?? 2;
  const animationEnd = animationStart + animationDuration;
  
  if (currentTime < animationStart) return 0;
  if (currentTime >= animationEnd) return 1;
  
  return interpolate(
    currentTime,
    [animationStart, animationEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
}

// ===========================================
// Main Composition Component
// ===========================================

export const MapAnimationComposition: React.FC<MapAnimationCompositionProps> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const currentTime = frame / fps;
  
  const viewState = interpolateKeyframes(
    config.keyframes,
    currentTime,
    config.transitions?.easing || 'easeInOut'
  );
  
  const visibleMarkers = getVisibleMarkers(config.markers, currentTime);
  const visibleRoutes = getVisibleRoutes(config.routes, currentTime);
  const visiblePolygons = getVisiblePolygons(config.polygons, currentTime);
  
  const routesWithProgress = visibleRoutes.map((route) => ({
    ...route,
    animationProgress: getRouteAnimationProgress(route, currentTime),
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
          mapStyle={config.mapStyle}
          center={viewState.center}
          zoom={viewState.zoom}
          pitch={viewState.pitch}
          bearing={viewState.bearing}
          width={width}
          height={height}
          markers={visibleMarkers}
          routes={routesWithProgress}
          polygons={visiblePolygons}
        />
      </AbsoluteFill>
      
      {/* Markers Layer */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <MarkerRenderer
          markers={visibleMarkers}
          viewState={viewState}
          width={width}
          height={height}
        />
      </AbsoluteFill>
      
      {/* Routes Animation Layer */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <RouteRenderer
          routes={routesWithProgress}
          viewState={viewState}
          width={width}
          height={height}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default MapAnimationComposition;
