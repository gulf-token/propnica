'use client';

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn, formatCoordinate, interpolateCameraState } from '@/lib/utils';
import { Keyframe, Zone, Route, TextMarker, CameraState } from '@/types';

// ===========================================
// Types
// ===========================================

interface MapCanvasProps {
  className?: string;
}

// ===========================================
// Map Canvas Component
// ===========================================

export function MapCanvas({ className }: MapCanvasProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const animationRef = React.useRef<number | null>(null);

  // Store state
  const config = useProjectStore((state) => state.config);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const showCoordinates = useEditorStore((state) => state.showCoordinates);
  const setMapLoaded = useEditorStore((state) => state.setMapLoaded);
  const setMapInteractive = useEditorStore((state) => state.setMapInteractive);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const addZone = useProjectStore((state) => state.addZone);
  const updateKeyframe = useProjectStore((state) => state.updateKeyframe);

  // Drawing state
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const drawingPoints = useEditorStore((state) => state.drawingCoordinates);
  const startDrawing = useEditorStore((state) => state.startDrawing);
  const addDrawingPoint = useEditorStore((state) => state.addDrawingPoint);
  const finishDrawing = useEditorStore((state) => state.finishDrawing);
  const cancelDrawing = useEditorStore((state) => state.cancelDrawing);

  // Mouse position for coordinates display
  const [mousePosition, setMousePosition] = React.useState<[number, number] | null>(null);

  // ===========================================
  // Initialize Map
  // ===========================================

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: config?.mapSettings.style || 'mapbox://styles/mapbox/satellite-streets-v12',
      center: config?.mapSettings.centre || [55.2708, 25.2048],
      zoom: config?.mapSettings.zoom || 14,
      bearing: config?.mapSettings.bearing || 0,
      pitch: config?.mapSettings.pitch || 45,
      antialias: true,
      preserveDrawingBuffer: true, // Needed for screenshots
    });

    map.on('load', () => {
      setMapLoaded(true);

      // Add 3D buildings layer
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );

      // Add sources for zones, routes, markers
      map.addSource('zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('drawing', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Add zone fill layer
      map.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones',
        paint: {
          'fill-color': ['get', 'fillColour'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });

      // Add zone outline layer
      map.addLayer({
        id: 'zones-outline',
        type: 'line',
        source: 'zones',
        paint: {
          'line-color': ['get', 'strokeColour'],
          'line-width': ['get', 'strokeWidth'],
        },
      });

      // Add routes layer
      map.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': ['get', 'colour'],
          'line-width': ['get', 'width'],
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
      });

      // Add drawing layer
      map.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      map.addLayer({
        id: 'drawing-points',
        type: 'circle',
        source: 'drawing',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    });

    // Mouse move handler for coordinates
    map.on('mousemove', (e) => {
      setMousePosition([e.lngLat.lng, e.lngLat.lat]);
    });

    // Click handler for drawing
    map.on('click', (e) => {
      if (selectedTool === 'drawZone' || selectedTool === 'drawRoute') {
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        if (!isDrawing) {
          startDrawing();
          addDrawingPoint(point);
        } else {
          addDrawingPoint(point);
        }
      }
    });

    // Double click to finish drawing
    map.on('dblclick', (e) => {
      if (isDrawing && drawingPoints.length >= 3) {
        e.preventDefault();

        if (selectedTool === 'drawZone') {
          // Create zone from drawing points
          addZone({
            name: `Zone ${(config?.zones.length ?? 0) + 1}`,
            coordinates: drawingPoints,
            style: {
              fillColour: '#3b82f6',
              fillOpacity: 0.3,
              strokeColour: '#1d4ed8',
              strokeWidth: 2,
              strokeOpacity: 1,
            },
            timing: {
              appearAt: currentTime,
              fadeDuration: 0.5,
            },
          });
        }

        finishDrawing();
      }
    });

    // Context menu to cancel drawing
    map.on('contextmenu', (e) => {
      if (isDrawing) {
        e.preventDefault();
        cancelDrawing();
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ===========================================
  // Update Map Style
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.mapSettings.style) return;

    const map = mapRef.current;
    const currentStyle = map.getStyle()?.sprite;

    if (currentStyle !== config.mapSettings.style) {
      map.setStyle(config.mapSettings.style);
    }
  }, [config?.mapSettings.style]);

  // ===========================================
  // Update Zones
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.zones) return;

    const map = mapRef.current;
    const source = map.getSource('zones') as mapboxgl.GeoJSONSource;

    if (!source) return;

    // Filter zones that should be visible at current time
    const visibleZones = config.zones.filter((zone) => {
      const { appearAt, disappearAt } = zone.timing;
      return (
        currentTime >= appearAt &&
        (disappearAt === undefined || currentTime < disappearAt)
      );
    });

    const features = visibleZones.map((zone) => ({
      type: 'Feature' as const,
      properties: {
        id: zone.id,
        name: zone.name,
        fillColour: zone.style.fillColour,
        fillOpacity: zone.style.fillOpacity,
        strokeColour: zone.style.strokeColour,
        strokeWidth: zone.style.strokeWidth,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [zone.coordinates],
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [config?.zones, currentTime]);

  // ===========================================
  // Update Routes
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.routes) return;

    const map = mapRef.current;
    const source = map.getSource('routes') as mapboxgl.GeoJSONSource;

    if (!source) return;

    // Filter routes that should be visible at current time
    const visibleRoutes = config.routes.filter((route) => {
      const { appearAt, disappearAt } = route.timing;
      return (
        currentTime >= appearAt &&
        (disappearAt === undefined || currentTime < disappearAt)
      );
    });

    const features = visibleRoutes.map((route) => ({
      type: 'Feature' as const,
      properties: {
        id: route.id,
        name: route.name,
        colour: route.style.colour,
        width: route.style.width,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: route.waypoints,
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [config?.routes, currentTime]);

  // ===========================================
  // Update Drawing Preview
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const source = map.getSource('drawing') as mapboxgl.GeoJSONSource;

    if (!source) return;

    if (isDrawing && drawingPoints.length > 0) {
      const features: GeoJSON.Feature[] = [];

      // Add points
      drawingPoints.forEach((point) => {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: point,
          },
        });
      });

      // Add line if more than 1 point
      if (drawingPoints.length > 1) {
        const lineCoords =
          selectedTool === 'drawZone'
            ? [...drawingPoints, drawingPoints[0]] // Close polygon
            : drawingPoints;

        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: lineCoords,
          },
        });
      }

      source.setData({
        type: 'FeatureCollection',
        features,
      });
    } else {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [isDrawing, drawingPoints, selectedTool]);

  // ===========================================
  // Camera Animation
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.keyframes.length) return;

    const map = mapRef.current;
    const keyframes = config.keyframes;

    // Find the current keyframe based on time
    let currentKeyframeIndex = 0;
    for (let i = 0; i < keyframes.length; i++) {
      if (currentTime >= keyframes[i].time) {
        currentKeyframeIndex = i;
      }
    }

    const currentKeyframe = keyframes[currentKeyframeIndex];
    const nextKeyframe = keyframes[currentKeyframeIndex + 1];

    let targetCamera: CameraState;

    if (!nextKeyframe || currentTime < currentKeyframe.time) {
      // Before first keyframe or at last keyframe
      targetCamera = currentKeyframe.camera;
    } else {
      // Interpolate between current and next keyframe
      const keyframeDuration = nextKeyframe.time - currentKeyframe.time;
      const progress = (currentTime - currentKeyframe.time) / keyframeDuration;
      targetCamera = interpolateCameraState(
        currentKeyframe.camera,
        nextKeyframe.camera,
        Math.min(Math.max(progress, 0), 1),
        currentKeyframe.easing
      );
    }

    // Apply camera state (without animation if playing to avoid lag)
    if (isPlaying) {
      map.jumpTo({
        center: targetCamera.centre,
        zoom: targetCamera.zoom,
        bearing: targetCamera.bearing,
        pitch: targetCamera.pitch,
      });
    } else {
      map.easeTo({
        center: targetCamera.centre,
        zoom: targetCamera.zoom,
        bearing: targetCamera.bearing,
        pitch: targetCamera.pitch,
        duration: 100,
      });
    }
  }, [currentTime, config?.keyframes, isPlaying]);

  // ===========================================
  // Playback Timer
  // ===========================================

  React.useEffect(() => {
    if (isPlaying) {
      const duration = config?.settings.duration ?? 30;
      const fps = config?.settings.fps ?? 30;
      const frameTime = 1000 / fps;

      const tick = () => {
        setCurrentTime((prevTime: number) => {
          const newTime = prevTime + 1 / fps;
          if (newTime >= duration) {
            return 0; // Loop back to start
          }
          return newTime;
        });
        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, config?.settings.duration, config?.settings.fps, setCurrentTime]);

  // ===========================================
  // Save Current Camera to Selected Keyframe
  // ===========================================

  const handleSaveCameraPosition = React.useCallback(() => {
    if (!mapRef.current || selectedElement?.type !== 'keyframe') return;

    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    updateKeyframe(selectedElement.id, {
      camera: {
        centre: [center.lng, center.lat],
        zoom,
        bearing,
        pitch,
      },
    });
  }, [selectedElement, updateKeyframe]);

  // ===========================================
  // Cursor Style
  // ===========================================

  const getCursorClass = () => {
    switch (selectedTool) {
      case 'pan':
        return 'cursor-grab active:cursor-grabbing';
      case 'drawZone':
      case 'drawRoute':
        return 'cursor-crosshair';
      case 'addMarker':
      case 'addText':
        return 'cursor-copy';
      default:
        return 'cursor-default';
    }
  };

  // ===========================================
  // Render
  // ===========================================

  return (
    <div className={cn('relative', className)}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={cn('w-full h-full', getCursorClass())}
      />

      {/* Coordinates Display */}
      {showCoordinates && mousePosition && (
        <div className="map-coordinates">
          {formatCoordinate(mousePosition[0], 'lng')},{' '}
          {formatCoordinate(mousePosition[1], 'lat')}
        </div>
      )}

      {/* Drawing Instructions */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white text-sm rounded-lg backdrop-blur-sm">
          {selectedTool === 'drawZone' ? (
            <>
              Click to add points. Double-click to close polygon.
              <br />
              Right-click to cancel.
            </>
          ) : (
            <>
              Click to add waypoints. Double-click to finish.
              <br />
              Right-click to cancel.
            </>
          )}
        </div>
      )}

      {/* Save Camera Button (when keyframe selected) */}
      {selectedElement?.type === 'keyframe' && !isPlaying && (
        <div className="absolute top-4 right-4">
          <button
            onClick={handleSaveCameraPosition}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
          >
            Save Camera Position
          </button>
        </div>
      )}
    </div>
  );
}
