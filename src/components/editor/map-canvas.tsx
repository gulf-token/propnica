'use client';

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn, formatCoordinate, interpolateCameraState } from '@/lib/utils';
import { rotatePolygonCoordinates, rotateLineCoordinates } from '@/lib/geo-utils';
import { Keyframe, Zone, Route, TextMarker, CameraState, MapStyle, MAP_STYLE_URLS } from '@/types';
import { AlertCircle, MapPin } from 'lucide-react';
import { VertexEditor } from './vertex-editor';

// ===========================================
// Constants
// ===========================================

// Fallback style URLs (use centralized ones from types when available)
const MAPBOX_STYLE_URLS: Record<string, string> = {
  // Use satellite-streets-v12 for satellite as it includes the composite source for 3D buildings
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  terrain: 'mapbox://styles/mapbox/satellite-streets-v12', // Base style, terrain added as layer
};

function getMapboxStyleUrl(style: MapStyle | string | undefined): string {
  if (!style) return MAPBOX_STYLE_URLS['satellite-streets'];
  // If it's already a full URL, return it
  if (style.startsWith('mapbox://')) return style;
  // Use centralized MAP_STYLE_URLS from types if available, fall back to local
  return MAP_STYLE_URLS?.[style as MapStyle] || MAPBOX_STYLE_URLS[style as MapStyle] || MAPBOX_STYLE_URLS['satellite-streets'];
}

// ===========================================
// Types
// ===========================================

export interface MapCanvasRef {
  flyTo: (coordinates: [number, number], zoom?: number) => void;
  getCenter: () => [number, number] | null;
  setStyle: (style: MapStyle) => void;
}

interface MapCanvasProps {
  className?: string;
  onMapMove?: (center: [number, number]) => void;
}

// ===========================================
// Map Canvas Component
// ===========================================

export const MapCanvas = React.forwardRef<MapCanvasRef, MapCanvasProps>(
  function MapCanvas({ className, onMapMove }, ref) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const playbackTimeRef = React.useRef<number>(0);

  // Store state
  const config = useProjectStore((state) => state.config);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const selectElement = useEditorStore((state) => state.selectElement);
  const showCoordinates = useEditorStore((state) => state.showCoordinates);
  const setMapLoaded = useEditorStore((state) => state.setMapLoaded);
  const setMapInteractive = useEditorStore((state) => state.setMapInteractive);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const addZone = useProjectStore((state) => state.addZone);
  const addRoute = useProjectStore((state) => state.addRoute);
  const addTextMarker = useProjectStore((state) => state.addTextMarker);
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

  // Touch device detection and hint state
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [showGestureHint, setShowGestureHint] = React.useState(false);

  // Shape drawing state (for rectangle/circle)
  const [shapeStartPoint, setShapeStartPoint] = React.useState<[number, number] | null>(null);
  const [shapeCurrentPoint, setShapeCurrentPoint] = React.useState<[number, number] | null>(null);
  const shapeStartPointRef = React.useRef<[number, number] | null>(null);

  // Marker refs for text markers
  const markersRef = React.useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Track if initial camera position has been applied
  const initialCameraAppliedRef = React.useRef(false);

  // Expose imperative methods via ref
  React.useImperativeHandle(ref, () => ({
    flyTo: (coordinates: [number, number], zoom?: number) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: coordinates,
          zoom: zoom ?? mapRef.current.getZoom(),
          duration: 2000,
          essential: true,
        });
      }
    },
    getCenter: () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        return [center.lng, center.lat];
      }
      return null;
    },
    setStyle: (style: MapStyle) => {
      if (mapRef.current) {
        const styleUrl = getMapboxStyleUrl(style);
        mapRef.current.setStyle(styleUrl);
      }
    },
  }), []);

  // Detect touch device on first touch
  React.useEffect(() => {
    const handleFirstTouch = () => {
      setIsTouchDevice(true);
      // Show gesture hint briefly on first touch
      const hasSeenHint = localStorage.getItem('propnica-gesture-hint-seen');
      if (!hasSeenHint) {
        setShowGestureHint(true);
        setTimeout(() => {
          setShowGestureHint(false);
          localStorage.setItem('propnica-gesture-hint-seen', 'true');
        }, 5000);
      }
      window.removeEventListener('touchstart', handleFirstTouch);
    };

    // Also check if touch is supported
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
    }

    window.addEventListener('touchstart', handleFirstTouch, { once: true });
    return () => window.removeEventListener('touchstart', handleFirstTouch);
  }, []);

  // Refs to access current values in event handlers (avoids stale closures)
  const selectedToolRef = React.useRef(selectedTool);
  const isDrawingRef = React.useRef(isDrawing);
  const drawingPointsRef = React.useRef(drawingPoints);
  const configRef = React.useRef(config);

  // Keep refs updated
  React.useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  React.useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  React.useEffect(() => {
    drawingPointsRef.current = drawingPoints;
  }, [drawingPoints]);

  React.useEffect(() => {
    configRef.current = config;
  }, [config]);

  React.useEffect(() => {
    shapeStartPointRef.current = shapeStartPoint;
  }, [shapeStartPoint]);

  // Ref for onMapMove callback to avoid stale closures
  const onMapMoveRef = React.useRef(onMapMove);
  React.useEffect(() => {
    onMapMoveRef.current = onMapMove;
  }, [onMapMove]);

  // ===========================================
  // Helper Functions for Shape Drawing
  // ===========================================

  // Generate rectangle coordinates from two corner points
  const generateRectangleCoordinates = (
    start: [number, number],
    end: [number, number]
  ): [number, number][] => {
    return [
      [start[0], start[1]], // top-left
      [end[0], start[1]],   // top-right
      [end[0], end[1]],     // bottom-right
      [start[0], end[1]],   // bottom-left
      [start[0], start[1]], // close polygon
    ];
  };

  // Generate circle coordinates (approximated as polygon)
  const generateCircleCoordinates = (
    center: [number, number],
    radius: number,
    numPoints: number = 64
  ): [number, number][] => {
    const coordinates: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lng = center[0] + radius * Math.cos(angle);
      const lat = center[1] + radius * Math.sin(angle) * 0.7; // Adjust for latitude distortion
      coordinates.push([lng, lat]);
    }
    return coordinates;
  };

  // Calculate distance between two lng/lat points (in degrees, for circle radius)
  const calculateDistance = (
    p1: [number, number],
    p2: [number, number]
  ): number => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Check if Mapbox token is available
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const hasValidToken = mapboxToken && mapboxToken !== 'your-mapbox-access-token' && mapboxToken.startsWith('pk.');

  // ===========================================
  // Initialize Map
  // ===========================================

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !hasValidToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Get initial camera from first keyframe or use defaults
    const initialCamera = config?.keyframes[0]?.camera ?? {
      centre: [55.2708, 25.2048],
      zoom: 14,
      bearing: 0,
      pitch: 45,
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapboxStyleUrl(config?.mapSettings.style),
      center: initialCamera.centre,
      zoom: initialCamera.zoom,
      bearing: initialCamera.bearing,
      pitch: initialCamera.pitch,
      antialias: true,
      preserveDrawingBuffer: true, // Needed for screenshots
      // Tile preloading - load tiles for adjacent zoom levels and areas
      maxTileCacheSize: 300, // Increase tile cache for smoother panning
      // Touch gesture support
      touchZoomRotate: true, // Two-finger pinch to zoom and rotate
      touchPitch: true, // Two-finger vertical drag to tilt
      dragRotate: true, // Right-click or two-finger rotate
      dragPan: true, // Single finger/mouse drag to pan
      doubleClickZoom: true, // Double-tap to zoom
      // Render tiles as soon as possible
      fadeDuration: 0, // No fade animation for faster tile display
    });

    // Enable cooperative gestures for better scroll handling on touch devices
    map.touchZoomRotate.enableRotation();
    map.touchPitch.enable();

    map.on('load', () => {
      setMapLoaded(true);

      // Trigger resize multiple times to ensure map renders correctly
      // This handles various timing issues with container sizing
      map.resize();
      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 500);

      // Enable tile preloading for smoother animation playback
      // This preloads tiles 2 zoom levels above and below current zoom
      try {
        const mapAny = map as unknown as { setPreloadZoomDelta?: (delta: number) => void };
        if (typeof mapAny.setPreloadZoomDelta === 'function') {
          mapAny.setPreloadZoomDelta(2);
        }
      } catch {
        // Ignore if not available
      }

      // Add 3D buildings layer (only if the style has the composite source)
      const style = map.getStyle();
      const hasCompositeSource = style?.sources && 'composite' in style.sources;

      if (hasCompositeSource) {
        const layers = style.layers;
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
      }

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

      map.addSource('shape-preview', {
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

      // Add route outline layer (rendered below main route for visibility on satellite)
      map.addLayer({
        id: 'routes-outline',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': ['coalesce', ['get', 'outlineColour'], '#FFFFFF'],
          'line-width': [
            '+',
            ['coalesce', ['get', 'width'], 4],
            ['*', ['coalesce', ['get', 'outlineWidth'], 0], 2],
          ],
          'line-opacity': ['coalesce', ['get', 'outlineOpacity'], 1],
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
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
          'line-opacity': ['coalesce', ['get', 'opacity'], 1],
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

      // Shape preview layers (for rectangle/circle)
      map.addLayer({
        id: 'shape-preview-fill',
        type: 'fill',
        source: 'shape-preview',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2,
        },
      });

      map.addLayer({
        id: 'shape-preview-outline',
        type: 'line',
        source: 'shape-preview',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    });

    // Mouse move handler for coordinates
    map.on('mousemove', (e) => {
      setMousePosition([e.lngLat.lng, e.lngLat.lat]);
    });

    // Map move handler for external tracking
    map.on('moveend', () => {
      if (onMapMoveRef.current) {
        const center = map.getCenter();
        onMapMoveRef.current([center.lng, center.lat]);
      }
    });

    // Track mouse/touch state for camera controls
    let isDragging = false;
    let lastMousePosition: { x: number; y: number } | null = null;
    let orbitCenter: mapboxgl.LngLat | null = null;

    // Touch state for multi-touch gestures
    let lastTouchDistance: number | null = null;
    let lastTouchAngle: number | null = null;
    let lastTouchCenter: { x: number; y: number } | null = null;

    // Helper to calculate distance between two touch points
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Helper to calculate angle between two touch points
    const getTouchAngle = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      return Math.atan2(
        touches[1].clientY - touches[0].clientY,
        touches[1].clientX - touches[0].clientX
      ) * (180 / Math.PI);
    };

    // Helper to get center point of touches
    const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length === 1) {
        return { x: touches[0].clientX, y: touches[0].clientY };
      }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    // Mouse down for camera controls and shape drawing
    map.on('mousedown', (e) => {
      const tool = selectedToolRef.current;

      // Camera controls
      if (tool === 'rotate' || tool === 'tilt' || tool === 'orbit') {
        isDragging = true;
        lastMousePosition = { x: e.point.x, y: e.point.y };
        if (tool === 'orbit') {
          orbitCenter = map.getCenter();
        }
        map.getCanvas().style.cursor = 'grabbing';
        e.preventDefault();
      }

      // Shape drawing (rectangle/circle)
      if (tool === 'drawRectangle' || tool === 'drawCircle') {
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setShapeStartPoint(point);
        setShapeCurrentPoint(point);
        e.preventDefault();
      }
    });

    // Mouse up to stop camera controls and finalize shapes
    map.on('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        lastMousePosition = null;
        orbitCenter = null;
        map.getCanvas().style.cursor = '';
      }

      // Finalize shape drawing
      const tool = selectedToolRef.current;
      const startPoint = shapeStartPointRef.current;

      if ((tool === 'drawRectangle' || tool === 'drawCircle') && startPoint) {
        const endPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        // Only create shape if there's meaningful size
        const minSize = 0.00001; // Minimum size threshold
        const dx = Math.abs(endPoint[0] - startPoint[0]);
        const dy = Math.abs(endPoint[1] - startPoint[1]);

        if (dx > minSize || dy > minSize) {
          let coordinates: [number, number][];
          let name: string;

          if (tool === 'drawRectangle') {
            coordinates = generateRectangleCoordinates(startPoint, endPoint);
            name = `Rectangle ${(configRef.current?.zones.length ?? 0) + 1}`;
          } else {
            const radius = calculateDistance(startPoint, endPoint);
            coordinates = generateCircleCoordinates(startPoint, radius);
            name = `Circle ${(configRef.current?.zones.length ?? 0) + 1}`;
          }

          // Remove the closing point for addZone (it auto-closes)
          const zoneCoords = coordinates.slice(0, -1);
          addZone(zoneCoords, name);
        }

        // Clear shape preview
        setShapeStartPoint(null);
        setShapeCurrentPoint(null);
        const source = map.getSource('shape-preview') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({ type: 'FeatureCollection', features: [] });
        }
      }
    });

    // Touch start handler
    const canvas = map.getCanvas();
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      const tool = selectedToolRef.current;

      if (e.touches.length === 1) {
        // Single touch - for drawing tools and flyTo
        if (tool === 'rotate' || tool === 'tilt' || tool === 'orbit') {
          isDragging = true;
          lastMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          if (tool === 'orbit') {
            orbitCenter = map.getCenter();
          }
        }
      } else if (e.touches.length === 2) {
        // Two-finger gestures
        lastTouchDistance = getTouchDistance(e.touches);
        lastTouchAngle = getTouchAngle(e.touches);
        lastTouchCenter = getTouchCenter(e.touches);
      }
    }, { passive: true });

    // Touch move handler
    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      const tool = selectedToolRef.current;

      if (e.touches.length === 1 && isDragging && lastMousePosition) {
        // Single touch drag for camera tools
        const deltaX = e.touches[0].clientX - lastMousePosition.x;
        const deltaY = e.touches[0].clientY - lastMousePosition.y;

        if (tool === 'rotate') {
          const newBearing = map.getBearing() + deltaX * 0.5;
          map.setBearing(newBearing);
        } else if (tool === 'tilt') {
          const newPitch = Math.max(0, Math.min(85, map.getPitch() - deltaY * 0.5));
          map.setPitch(newPitch);
        } else if (tool === 'orbit' && orbitCenter) {
          const newBearing = map.getBearing() + deltaX * 0.5;
          const newPitch = Math.max(0, Math.min(85, map.getPitch() - deltaY * 0.3));
          map.jumpTo({
            center: orbitCenter,
            bearing: newBearing,
            pitch: newPitch,
          });
        }

        lastMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && lastTouchDistance !== null && lastTouchAngle !== null) {
        // Two-finger gesture: pinch-zoom and rotate
        const currentDistance = getTouchDistance(e.touches);
        const currentAngle = getTouchAngle(e.touches);
        const currentCenter = getTouchCenter(e.touches);

        // Pinch zoom
        if (lastTouchDistance > 0) {
          const zoomDelta = (currentDistance - lastTouchDistance) * 0.01;
          const newZoom = map.getZoom() + zoomDelta;
          map.setZoom(Math.max(0, Math.min(22, newZoom)));
        }

        // Two-finger rotate
        if (lastTouchAngle !== null) {
          const angleDelta = currentAngle - lastTouchAngle;
          const newBearing = map.getBearing() + angleDelta;
          map.setBearing(newBearing);
        }

        // Two-finger vertical pan for pitch (when fingers move together vertically)
        if (lastTouchCenter) {
          const verticalDelta = currentCenter.y - lastTouchCenter.y;
          if (Math.abs(verticalDelta) > 2) {
            const newPitch = Math.max(0, Math.min(85, map.getPitch() - verticalDelta * 0.3));
            map.setPitch(newPitch);
          }
        }

        lastTouchDistance = currentDistance;
        lastTouchAngle = currentAngle;
        lastTouchCenter = currentCenter;
      }
    }, { passive: true });

    // Touch end handler
    canvas.addEventListener('touchend', (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isDragging = false;
        lastMousePosition = null;
        orbitCenter = null;
        lastTouchDistance = null;
        lastTouchAngle = null;
        lastTouchCenter = null;
      } else if (e.touches.length === 1) {
        // Went from two fingers to one
        lastTouchDistance = null;
        lastTouchAngle = null;
        lastTouchCenter = null;
        lastMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    // Mouse drag for camera controls and shape preview
    map.on('mousemove', (e) => {
      const tool = selectedToolRef.current;

      // Camera controls
      if (isDragging && lastMousePosition) {
        const deltaX = e.point.x - lastMousePosition.x;
        const deltaY = e.point.y - lastMousePosition.y;

        if (tool === 'rotate') {
          // Rotate: horizontal drag changes bearing
          const newBearing = map.getBearing() + deltaX * 0.5;
          map.setBearing(newBearing);
        } else if (tool === 'tilt') {
          // Tilt: vertical drag changes pitch
          const newPitch = Math.max(0, Math.min(85, map.getPitch() - deltaY * 0.5));
          map.setPitch(newPitch);
        } else if (tool === 'orbit' && orbitCenter) {
          // Orbit: combine rotation and maintain center
          const newBearing = map.getBearing() + deltaX * 0.5;
          const newPitch = Math.max(0, Math.min(85, map.getPitch() - deltaY * 0.3));
          map.jumpTo({
            center: orbitCenter,
            bearing: newBearing,
            pitch: newPitch,
          });
        }

        lastMousePosition = { x: e.point.x, y: e.point.y };
      }

      // Shape preview (rectangle/circle)
      const startPoint = shapeStartPointRef.current;
      if ((tool === 'drawRectangle' || tool === 'drawCircle') && startPoint) {
        const currentPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setShapeCurrentPoint(currentPoint);

        let coordinates: [number, number][];
        if (tool === 'drawRectangle') {
          coordinates = generateRectangleCoordinates(startPoint, currentPoint);
        } else {
          const radius = calculateDistance(startPoint, currentPoint);
          coordinates = generateCircleCoordinates(startPoint, radius);
        }

        const source = map.getSource('shape-preview') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates],
              },
            }],
          });
        }
      }
    });

    // Click handler for flyTo, drawing, and markers
    map.on('click', (e) => {
      const tool = selectedToolRef.current;

      // Fly To: click to fly to location
      if (tool === 'flyTo') {
        map.flyTo({
          center: e.lngLat,
          zoom: Math.max(map.getZoom(), 14),
          duration: 2000,
          essential: true,
        });
        return;
      }

      // Add Marker: click to place a marker
      if (tool === 'addMarker') {
        const position: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const markerCount = (configRef.current?.textMarkers.length ?? 0) + 1;
        addTextMarker(position, `📍 Marker ${markerCount}`);
        return;
      }

      // Add Text: click to place text
      if (tool === 'addText') {
        const position: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const text = prompt('Enter text:');
        if (text) {
          addTextMarker(position, text);
        }
        return;
      }

      // Drawing tools
      if (tool === 'drawZone' || tool === 'drawRoute') {
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        if (!isDrawingRef.current) {
          startDrawing();
          addDrawingPoint(point);
        } else {
          addDrawingPoint(point);
        }
      }
    });

    // Double click to finish drawing
    map.on('dblclick', (e) => {
      const points = drawingPointsRef.current;
      const tool = selectedToolRef.current;
      const minPoints = tool === 'drawZone' ? 3 : 2; // Zones need 3, routes need 2

      if (isDrawingRef.current && points.length >= minPoints) {
        e.preventDefault();

        if (tool === 'drawZone') {
          // Create zone from drawing points
          addZone(
            points,
            `Zone ${(configRef.current?.zones.length ?? 0) + 1}`
          );
        } else if (tool === 'drawRoute') {
          // Create route from drawing points
          addRoute(
            points,
            `Route ${(configRef.current?.routes.length ?? 0) + 1}`
          );
        }

        finishDrawing();
      }
    });

    // Context menu to cancel drawing
    map.on('contextmenu', (e) => {
      if (isDrawingRef.current) {
        e.preventDefault();
        cancelDrawing();
      }
    });

    // Click handler for selecting zones
    map.on('click', 'zones-fill', (e) => {
      if (isDrawingRef.current) return; // Don't select while drawing
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        selectElement({ type: 'zone', id: feature.properties.id });
        e.preventDefault();
      }
    });

    // Click handler for selecting routes
    map.on('click', 'routes-line', (e) => {
      if (isDrawingRef.current) return; // Don't select while drawing
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        selectElement({ type: 'route', id: feature.properties.id });
        e.preventDefault();
      }
    });

    // Change cursor on hover over zones/routes
    map.on('mouseenter', 'zones-fill', () => {
      if (!isDrawingRef.current) {
        map.getCanvas().style.cursor = 'pointer';
      }
    });

    map.on('mouseleave', 'zones-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'routes-line', () => {
      if (!isDrawingRef.current) {
        map.getCanvas().style.cursor = 'pointer';
      }
    });

    map.on('mouseleave', 'routes-line', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    // Add ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Also handle window resize events
    const handleWindowResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      // Clean up observers and listeners
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      // Clean up markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ===========================================
  // Apply Initial Camera Position
  // ===========================================
  // This effect ensures the map shows the first keyframe when a project is loaded,
  // even if the config wasn't available during initial map creation

  React.useEffect(() => {
    // Only apply once when we have a map and keyframes
    if (!mapRef.current || !config?.keyframes?.length || initialCameraAppliedRef.current) return;

    const map = mapRef.current;
    const firstKeyframe = config.keyframes[0];

    if (!firstKeyframe?.camera) return;

    // Wait for the map to be fully loaded before applying camera
    const applyInitialCamera = () => {
      map.jumpTo({
        center: firstKeyframe.camera.centre,
        zoom: firstKeyframe.camera.zoom,
        bearing: firstKeyframe.camera.bearing,
        pitch: firstKeyframe.camera.pitch,
      });
      initialCameraAppliedRef.current = true;
      console.log('[MapCanvas] Applied initial camera position from first keyframe');
    };

    if (map.isStyleLoaded()) {
      applyInitialCamera();
    } else {
      map.once('style.load', applyInitialCamera);
    }
  }, [config?.keyframes]);

  // Reset initial camera flag when project changes (new project loaded)
  React.useEffect(() => {
    initialCameraAppliedRef.current = false;
  }, [config?.version]);

  // ===========================================
  // Update Map Style
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.mapSettings.style) return;

    const map = mapRef.current;
    const newStyleUrl = getMapboxStyleUrl(config.mapSettings.style);

    // Only access style if it's loaded
    if (!map.isStyleLoaded()) {
      // Wait for style to load before changing
      map.once('style.load', () => {
        const currentStyleUrl = map.getStyle()?.sprite;
        if (currentStyleUrl && !currentStyleUrl.includes(config.mapSettings.style)) {
          map.setStyle(newStyleUrl);
        }
      });
      return;
    }

    const currentStyleUrl = map.getStyle()?.sprite;
    if (currentStyleUrl && !currentStyleUrl.includes(config.mapSettings.style)) {
      map.setStyle(newStyleUrl);
    }
  }, [config?.mapSettings.style]);

  // ===========================================
  // Preload Tiles for Keyframe Positions
  // ===========================================
  // This effect preloads tiles for all keyframe positions to ensure smooth playback
  // by warming up the tile cache in the background

  React.useEffect(() => {
    if (!mapRef.current || !config?.keyframes?.length || config.keyframes.length < 2) return;

    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    // Debounce tile preloading to avoid excessive requests
    const preloadTimeout = setTimeout(() => {
      const keyframes = config.keyframes;
      let preloadIndex = 1; // Start from second keyframe (first is already loaded)

      // Preload one keyframe position at a time with delay to avoid overwhelming the network
      const preloadNext = () => {
        if (preloadIndex >= keyframes.length || !mapRef.current) return;

        const kf = keyframes[preloadIndex];
        if (kf?.camera?.centre) {
          // Trigger tile loading by creating a temporary transform
          // This requests tiles without actually moving the visible map
          try {
            // Use triggerRepaint which forces tile requests for current view
            // We can't directly preload other positions without moving the camera,
            // but we can ensure current tiles are fully loaded
            map.triggerRepaint();
          } catch {
            // Ignore errors
          }
        }

        preloadIndex++;
        // Continue preloading with a delay
        if (preloadIndex < keyframes.length) {
          setTimeout(preloadNext, 500);
        }
      };

      // Start preloading after a short delay to not interfere with initial render
      setTimeout(preloadNext, 1000);
    }, 500);

    return () => clearTimeout(preloadTimeout);
  }, [config?.keyframes]);

  // ===========================================
  // Update Zones
  // ===========================================

  const isVertexEditing = useEditorStore((state) => state.isVertexEditing);

  React.useEffect(() => {
    if (!mapRef.current || !config?.zones) return;

    const map = mapRef.current;
    const source = map.getSource('zones') as mapboxgl.GeoJSONSource;

    if (!source) return;

    // Filter zones that should be visible at current time
    // Exclude the zone being edited when vertex editing is active
    const visibleZones = config.zones.filter((zone) => {
      const { startTime, endTime } = zone.timing;
      const isVisible = currentTime >= startTime && currentTime < endTime;
      // Hide zone from regular rendering when it's being vertex edited
      const isBeingEdited = isVertexEditing && selectedElement?.type === 'zone' && selectedElement.id === zone.id;
      return isVisible && !isBeingEdited;
    });

    const features = visibleZones.map((zone) => {
      // Apply rotation if specified
      const coordinates = zone.style.rotation
        ? rotatePolygonCoordinates(zone.coordinates, zone.style.rotation)
        : zone.coordinates;

      // Close polygon for GeoJSON
      const closedCoords = [...coordinates];
      if (
        closedCoords.length > 0 &&
        (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
          closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1])
      ) {
        closedCoords.push(closedCoords[0]);
      }

      return {
        type: 'Feature' as const,
        properties: {
          id: zone.id,
          name: zone.name,
          fillColour: zone.style.fillColour,
          fillOpacity: zone.style.fillOpacity,
          strokeColour: zone.style.strokeColour,
          strokeWidth: zone.style.strokeWidth,
          strokeOpacity: zone.style.strokeOpacity ?? 1,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [closedCoords],
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [config?.zones, currentTime, isVertexEditing, selectedElement]);

  // ===========================================
  // Update Routes
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.routes) return;

    const map = mapRef.current;
    const source = map.getSource('routes') as mapboxgl.GeoJSONSource;

    if (!source) return;

    // Filter routes that should be visible at current time
    // Exclude the route being edited when vertex editing is active
    const visibleRoutes = config.routes.filter((route) => {
      const { startTime, endTime } = route.timing;
      const isVisible = currentTime >= startTime && currentTime < endTime;
      // Hide route from regular rendering when it's being vertex edited
      const isBeingEdited = isVertexEditing && selectedElement?.type === 'route' && selectedElement.id === route.id;
      return isVisible && !isBeingEdited;
    });

    const features = visibleRoutes.map((route) => {
      // Apply rotation if specified
      const coordinates = route.style.rotation
        ? rotateLineCoordinates(route.coordinates, route.style.rotation)
        : route.coordinates;

      return {
        type: 'Feature' as const,
        properties: {
          id: route.id,
          name: route.name,
          colour: route.style.colour,
          width: route.style.width,
          opacity: route.style.opacity ?? 1,
          outlineColour: route.style.outlineColour,
          outlineWidth: route.style.outlineWidth ?? 0,
          outlineOpacity: route.style.outlineOpacity ?? 1,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates,
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [config?.routes, currentTime, isVertexEditing, selectedElement]);

  // ===========================================
  // Update Text Markers
  // ===========================================

  React.useEffect(() => {
    if (!mapRef.current || !config?.textMarkers) return;

    const map = mapRef.current;
    const existingMarkers = markersRef.current;

    // Filter text markers that should be visible at current time
    const visibleMarkers = config.textMarkers.filter((marker) => {
      const { startTime, endTime } = marker.timing;
      return currentTime >= startTime && currentTime < endTime;
    });

    // Get IDs of visible markers
    const visibleIds = new Set(visibleMarkers.map((m) => m.id));

    // Remove markers that are no longer visible
    existingMarkers.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.remove();
        existingMarkers.delete(id);
      }
    });

    // Add or update visible markers
    visibleMarkers.forEach((textMarker) => {
      let marker = existingMarkers.get(textMarker.id);

      if (!marker) {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'text-marker';
        const bgOpacity = textMarker.style.backgroundOpacity ?? 0.9;
        const borderWidth = textMarker.style.borderWidth ?? 0;
        const borderColour = textMarker.style.borderColour || '#000000';
        const rotation = textMarker.style.rotation ?? 0;
        el.style.cssText = `
          background-color: ${textMarker.style.backgroundColour || 'rgba(0,0,0,0.8)'};
          opacity: ${bgOpacity};
          color: ${textMarker.style.fontColour || '#ffffff'};
          font-size: ${textMarker.style.fontSize || 14}px;
          padding: ${textMarker.style.padding || 8}px;
          border-radius: ${textMarker.style.borderRadius || 4}px;
          border: ${borderWidth > 0 ? `${borderWidth}px solid ${borderColour}` : 'none'};
          white-space: nowrap;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transform: rotate(${rotation}deg);
          transform-origin: center center;
        `;
        el.textContent = textMarker.text;

        // Add click handler for selection
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectElement({ type: 'textMarker', id: textMarker.id });
        });

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat(textMarker.position)
          .addTo(map);

        existingMarkers.set(textMarker.id, marker);
      } else {
        // Update existing marker position and content
        marker.setLngLat(textMarker.position);
        const el = marker.getElement();

        // Calculate style values
        const bgOpacity = textMarker.style.backgroundOpacity ?? 0.8;
        const borderColour = textMarker.style.borderColour || 'transparent';
        const borderWidth = textMarker.style.borderWidth || 0;
        const rotation = textMarker.style.rotation || 0;

        el.textContent = textMarker.text;
        el.style.cssText = `
          font-family: ${textMarker.style.fontFamily || 'Inter, sans-serif'};
          font-size: ${textMarker.style.fontSize || 14}px;
          font-weight: ${textMarker.style.fontWeight || 'normal'};
          color: ${textMarker.style.fontColour || '#ffffff'};
          background-color: ${textMarker.style.backgroundColour || 'rgba(0,0,0,0.8)'};
          opacity: ${bgOpacity};
          padding: ${textMarker.style.padding || 8}px;
          border-radius: ${textMarker.style.borderRadius || 4}px;
          border: ${borderWidth > 0 ? `${borderWidth}px solid ${borderColour}` : 'none'};
          white-space: nowrap;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transform: rotate(${rotation}deg);
          transform-origin: center center;
        `;
      }
    });
  }, [config?.textMarkers, currentTime, selectElement]);

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

  // Sync playback ref with store when not playing (for seeking/scrubbing)
  React.useEffect(() => {
    if (!isPlaying) {
      playbackTimeRef.current = currentTime;
    }
  }, [currentTime, isPlaying]);

  React.useEffect(() => {
    if (isPlaying) {
      const duration = config?.settings.duration ?? 30;

      let lastTimestamp: number | null = null;

      const tick = (timestamp: number) => {
        if (lastTimestamp === null) {
          lastTimestamp = timestamp;
        }
        const elapsed = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        // Use ref to accumulate time properly
        playbackTimeRef.current += elapsed;
        if (playbackTimeRef.current >= duration) {
          playbackTimeRef.current = 0; // Loop back to start
        }
        setCurrentTime(playbackTimeRef.current);
        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, config?.settings.duration, setCurrentTime]);

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
      case 'rotate':
        return 'cursor-ew-resize';
      case 'tilt':
        return 'cursor-ns-resize';
      case 'orbit':
        return 'cursor-move';
      case 'flyTo':
        return 'cursor-pointer';
      case 'drawZone':
      case 'drawRoute':
      case 'drawRectangle':
      case 'drawCircle':
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

  // Show error message if Mapbox token is missing
  if (!hasValidToken) {
    return (
      <div className={cn('relative w-full h-full flex items-center justify-center bg-muted', className)}>
        <div className="text-center p-8 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Mapbox Token Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The map editor requires a Mapbox access token to display maps. Please configure the{' '}
            <code className="px-1.5 py-0.5 bg-muted-foreground/10 rounded text-xs">
              NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
            </code>{' '}
            environment variable.
          </p>
          <div className="text-xs text-muted-foreground bg-muted-foreground/5 rounded-lg p-3 text-left">
            <p className="font-medium mb-1">To get a token:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">account.mapbox.com</a></li>
              <li>Create or copy your public access token</li>
              <li>Add it to your environment variables</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={cn('absolute inset-0', getCursorClass())}
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

      {/* Shape Drawing Instructions */}
      {shapeStartPoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white text-sm rounded-lg backdrop-blur-sm">
          {selectedTool === 'drawRectangle' ? (
            <>Drag to draw rectangle. Release to finish.</>
          ) : (
            <>Drag to set circle radius. Release to finish.</>
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

      {/* Vertex Editor (for zones and routes) */}
      <VertexEditor map={mapRef.current} />

      {/* Touch Gesture Hint Overlay */}
      {showGestureHint && (
        <div
          className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-300"
          onClick={() => setShowGestureHint(false)}
        >
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 m-4 max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-center">Touch Gestures</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-lg">1</span>
                <span>One finger drag to pan</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-lg">2</span>
                <span>Pinch to zoom in/out</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="rotate-45">2</span>
                </span>
                <span>Two-finger rotate to spin</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-lg">↕</span>
                <span>Two-finger drag up/down to tilt</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-lg">2×</span>
                <span>Double-tap to zoom in</span>
              </div>
            </div>
            <button
              className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              onClick={() => setShowGestureHint(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Touch Gesture Help Button (for touch devices) */}
      {isTouchDevice && !showGestureHint && !isDrawing && (
        <button
          onClick={() => setShowGestureHint(true)}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white dark:bg-neutral-800 rounded-full shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Show gesture help"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>
        </button>
      )}
    </div>
  );
});
