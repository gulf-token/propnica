'use client';

/**
 * Vertex Editor Component
 *
 * Uses Mapbox GL Draw to enable vertex editing for zones and routes.
 * When a zone is selected and vertex editing is enabled, this component
 * takes over rendering of that zone and allows the user to drag vertices.
 */

import * as React from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useEditorStore, useProjectStore } from '@/stores';
import { Button } from '@/components/ui';
import { Check, X, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import Mapbox GL Draw styles
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// ===========================================
// Types
// ===========================================

interface VertexEditorProps {
  map: MapboxMap | null;
  className?: string;
}

// ===========================================
// Vertex Editor Component
// ===========================================

export function VertexEditor({ map, className }: VertexEditorProps) {
  const drawRef = React.useRef<MapboxDraw | null>(null);
  const [originalCoordinates, setOriginalCoordinates] = React.useState<[number, number][] | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Store state
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const isVertexEditing = useEditorStore((state) => state.isVertexEditing);
  const setVertexEditing = useEditorStore((state) => state.setVertexEditing);
  const stopVertexEditing = useEditorStore((state) => state.stopVertexEditing);
  const startVertexEditing = useEditorStore((state) => state.startVertexEditing);

  const zones = useProjectStore((state) => state.config?.zones ?? []);
  const routes = useProjectStore((state) => state.config?.routes ?? []);
  const updateZone = useProjectStore((state) => state.updateZone);
  const updateRoute = useProjectStore((state) => state.updateRoute);

  // Get the selected zone or route
  const selectedZone = selectedElement?.type === 'zone'
    ? zones.find(z => z.id === selectedElement.id)
    : null;

  const selectedRoute = selectedElement?.type === 'route'
    ? routes.find(r => r.id === selectedElement.id)
    : null;

  const canEditVertices = selectedZone || selectedRoute;

  // Initialize Mapbox GL Draw
  React.useEffect(() => {
    if (!map || !isVertexEditing) return;

    // Create draw control
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        line_string: false,
        point: false,
        trash: false,
        combine_features: false,
        uncombine_features: false,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.3,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
          },
        },
        // Line string (route)
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 4,
          },
        },
        // Vertex points (active)
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#ffffff',
            'circle-stroke-color': '#3b82f6',
            'circle-stroke-width': 3,
          },
        },
        // Midpoints (for adding new vertices)
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#3b82f6',
            'circle-opacity': 0.5,
          },
        },
      ],
    });

    map.addControl(draw);
    drawRef.current = draw;

    // Add the current geometry to draw
    if (selectedZone) {
      // Ensure polygon is closed
      const coords = [...selectedZone.coordinates];
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first] as [number, number]);
        }
      }

      setOriginalCoordinates(selectedZone.coordinates);

      const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        id: selectedZone.id,
        properties: { name: selectedZone.name },
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      };

      draw.add(feature);
      draw.changeMode('direct_select', { featureId: selectedZone.id });
    } else if (selectedRoute) {
      setOriginalCoordinates(selectedRoute.coordinates);

      const feature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        id: selectedRoute.id,
        properties: { name: selectedRoute.name },
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.coordinates,
        },
      };

      draw.add(feature);
      draw.changeMode('direct_select', { featureId: selectedRoute.id });
    }

    // Listen for updates
    const handleUpdate = () => {
      setHasChanges(true);
    };

    map.on('draw.update', handleUpdate);
    map.on('draw.selectionchange', handleUpdate);

    // Cleanup
    return () => {
      map.off('draw.update', handleUpdate);
      map.off('draw.selectionchange', handleUpdate);
      if (drawRef.current) {
        try {
          map.removeControl(drawRef.current);
        } catch {
          // Control may already be removed
        }
        drawRef.current = null;
      }
    };
  }, [map, isVertexEditing, selectedZone, selectedRoute]);

  // Handle confirm changes
  const handleConfirm = React.useCallback(() => {
    if (!drawRef.current) return;

    const features = drawRef.current.getAll();
    if (features.features.length === 0) return;

    const feature = features.features[0];

    if (selectedZone && feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0] as [number, number][];
      // Remove the closing point (we don't store it)
      const openCoords = coords.slice(0, -1);
      updateZone(selectedZone.id, { coordinates: openCoords });
      console.log(`[VertexEditor] Updated zone "${selectedZone.name}" with ${openCoords.length} vertices`);
    } else if (selectedRoute && feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates as [number, number][];
      updateRoute(selectedRoute.id, { coordinates: coords });
      console.log(`[VertexEditor] Updated route "${selectedRoute.name}" with ${coords.length} points`);
    }

    setHasChanges(false);
    stopVertexEditing();
  }, [selectedZone, selectedRoute, updateZone, updateRoute, stopVertexEditing]);

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    setHasChanges(false);
    stopVertexEditing();
  }, [stopVertexEditing]);

  // Handle start editing
  const handleStartEditing = React.useCallback(() => {
    startVertexEditing();
  }, [startVertexEditing]);

  // Show edit button when a zone/route is selected but not editing
  if (canEditVertices && !isVertexEditing) {
    return (
      <div className={cn('absolute top-4 right-4 z-10', className)}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleStartEditing}
          className="shadow-lg"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Vertices
        </Button>
      </div>
    );
  }

  // Show controls during editing
  if (isVertexEditing) {
    return (
      <div className={cn('absolute top-4 right-4 z-10 flex gap-2', className)}>
        <Button
          variant="default"
          size="sm"
          onClick={handleConfirm}
          className="shadow-lg"
        >
          <Check className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="shadow-lg bg-white"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    );
  }

  return null;
}

export default VertexEditor;
