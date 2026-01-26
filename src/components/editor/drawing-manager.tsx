'use client';

import * as React from 'react';
import {
  Pencil,
  Square,
  Circle,
  Route,
  MapPin,
  Type,
  Check,
  X,
  Undo,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore, useProjectStore } from '@/stores';
import {
  Button,
  Label,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

// ===========================================
// Types
// ===========================================

export interface DrawingStyle {
  fillColour: string;
  fillOpacity: number;
  strokeColour: string;
  strokeWidth: number;
  strokeOpacity: number;
}

export interface DrawingManagerProps {
  className?: string;
  onZoneCreated?: (zoneId: string) => void;
  onRouteCreated?: (routeId: string) => void;
  onMarkerCreated?: (markerId: string) => void;
}

// ===========================================
// Preset Colours
// ===========================================

const presetColours = [
  { name: 'Blue', fill: '#3b82f6', stroke: '#1d4ed8' },
  { name: 'Green', fill: '#22c55e', stroke: '#15803d' },
  { name: 'Red', fill: '#ef4444', stroke: '#b91c1c' },
  { name: 'Orange', fill: '#f97316', stroke: '#c2410c' },
  { name: 'Purple', fill: '#a855f7', stroke: '#7c3aed' },
  { name: 'Pink', fill: '#ec4899', stroke: '#be185d' },
  { name: 'Yellow', fill: '#eab308', stroke: '#a16207' },
  { name: 'Cyan', fill: '#06b6d4', stroke: '#0891b2' },
];

// ===========================================
// Drawing Manager Component
// ===========================================

export function DrawingManager({
  className,
  onZoneCreated,
  onRouteCreated,
  onMarkerCreated,
}: DrawingManagerProps) {
  // Store state
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const setSelectedTool = useEditorStore((state) => state.setTool);
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const drawingPoints = useEditorStore((state) => state.drawingCoordinates);
  const finishDrawing = useEditorStore((state) => state.finishDrawing);
  const cancelDrawing = useEditorStore((state) => state.cancelDrawing);
  const removeLastDrawingPoint = useEditorStore((state) => state.removeLastDrawingPoint);
  const currentTime = useEditorStore((state) => state.currentTime);

  const addZone = useProjectStore((state) => state.addZone);
  const addRoute = useProjectStore((state) => state.addRoute);
  const zones = useProjectStore((state) => state.config?.zones ?? []);
  const routes = useProjectStore((state) => state.config?.routes ?? []);

  // Drawing style state
  const [style, setStyle] = React.useState<DrawingStyle>({
    fillColour: '#3b82f6',
    fillOpacity: 0.3,
    strokeColour: '#1d4ed8',
    strokeWidth: 2,
    strokeOpacity: 1,
  });

  const [selectedPreset, setSelectedPreset] = React.useState<string>('Blue');
  const [zoneName, setZoneName] = React.useState('');
  const [routeName, setRouteName] = React.useState('');

  // Drawing tool options
  const isDrawingTool = ['drawZone', 'drawRoute', 'addMarker', 'addText'].includes(
    selectedTool
  );

  // ===========================================
  // Preset Selection Handler
  // ===========================================

  const handlePresetChange = (presetName: string) => {
    const preset = presetColours.find((p) => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      setStyle((prev) => ({
        ...prev,
        fillColour: preset.fill,
        strokeColour: preset.stroke,
      }));
    }
  };

  // ===========================================
  // Finish Drawing Handler
  // ===========================================

  const handleFinishDrawing = () => {
    if (!isDrawing || drawingPoints.length < 2) return;

    if (selectedTool === 'drawZone' && drawingPoints.length >= 3) {
      const zoneId = addZone(
        drawingPoints,
        zoneName || `Zone ${zones.length + 1}`
      );

      if (zoneId && onZoneCreated) {
        onZoneCreated(zoneId);
      }
      setZoneName('');
    } else if (selectedTool === 'drawRoute' && drawingPoints.length >= 2) {
      const routeId = addRoute(
        drawingPoints,
        routeName || `Route ${routes.length + 1}`
      );

      if (routeId && onRouteCreated) {
        onRouteCreated(routeId);
      }
      setRouteName('');
    }

    finishDrawing();
  };

  // ===========================================
  // Cancel Drawing Handler
  // ===========================================

  const handleCancelDrawing = () => {
    cancelDrawing();
    setZoneName('');
    setRouteName('');
  };

  // ===========================================
  // Undo Last Point Handler
  // ===========================================

  const handleUndoPoint = () => {
    if (isDrawing && drawingPoints.length > 0) {
      removeLastDrawingPoint();
    }
  };

  // ===========================================
  // Render (only when drawing tool is active)
  // ===========================================

  if (!isDrawingTool) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute bottom-20 left-1/2 -translate-x-1/2 z-10',
        'bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg',
        'p-3 flex items-center gap-3',
        className
      )}
    >
      {/* Drawing Mode Indicator */}
      <div className="flex items-center gap-2 pr-3 border-r">
        {selectedTool === 'drawZone' && (
          <>
            <Square className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Draw Zone</span>
          </>
        )}
        {selectedTool === 'drawRoute' && (
          <>
            <Route className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Draw Route</span>
          </>
        )}
        {selectedTool === 'addMarker' && (
          <>
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Add Marker</span>
          </>
        )}
        {selectedTool === 'addText' && (
          <>
            <Type className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Add Text</span>
          </>
        )}
      </div>

      {/* Colour Preset Selector */}
      {(selectedTool === 'drawZone' || selectedTool === 'drawRoute') && (
        <div className="flex items-center gap-2 pr-3 border-r">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presetColours.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: preset.fill }}
                    />
                    <span>{preset.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stroke Width (for routes) */}
      {selectedTool === 'drawRoute' && (
        <div className="flex items-center gap-2 pr-3 border-r">
          <Label className="text-xs text-muted-foreground">Width</Label>
          <Slider
            value={[style.strokeWidth]}
            onValueChange={([v]) => setStyle((prev) => ({ ...prev, strokeWidth: v }))}
            min={1}
            max={10}
            step={1}
            className="w-16"
          />
          <span className="text-xs w-4 text-center">{style.strokeWidth}</span>
        </div>
      )}

      {/* Fill Opacity (for zones) */}
      {selectedTool === 'drawZone' && (
        <div className="flex items-center gap-2 pr-3 border-r">
          <Label className="text-xs text-muted-foreground">Opacity</Label>
          <Slider
            value={[style.fillOpacity * 100]}
            onValueChange={([v]) => setStyle((prev) => ({ ...prev, fillOpacity: v / 100 }))}
            min={10}
            max={100}
            step={10}
            className="w-16"
          />
          <span className="text-xs w-6 text-center">{Math.round(style.fillOpacity * 100)}%</span>
        </div>
      )}

      {/* Point Counter */}
      {isDrawing && (
        <div className="flex items-center gap-2 pr-3 border-r">
          <span className="text-sm text-muted-foreground">
            {drawingPoints.length} point{drawingPoints.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Drawing Controls */}
      {isDrawing ? (
        <div className="flex items-center gap-1">
          {/* Undo Last Point */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndoPoint}
                disabled={drawingPoints.length === 0}
              >
                <Undo className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo last point (Ctrl+Z)</TooltipContent>
          </Tooltip>

          {/* Finish Drawing */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handleFinishDrawing}
                disabled={
                  (selectedTool === 'drawZone' && drawingPoints.length < 3) ||
                  (selectedTool === 'drawRoute' && drawingPoints.length < 2)
                }
              >
                <Check className="w-4 h-4 mr-1" />
                Done
              </Button>
            </TooltipTrigger>
            <TooltipContent>Finish drawing (Double-click)</TooltipContent>
          </Tooltip>

          {/* Cancel Drawing */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleCancelDrawing}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel drawing (Right-click or Esc)</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {selectedTool === 'drawZone' && 'Click on the map to start drawing a zone'}
          {selectedTool === 'drawRoute' && 'Click on the map to start drawing a route'}
          {selectedTool === 'addMarker' && 'Click on the map to place a marker'}
          {selectedTool === 'addText' && 'Click on the map to add text'}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Shape Drawing Indicator
// ===========================================

export interface ShapeIndicatorProps {
  tool: 'rectangle' | 'circle';
  isActive: boolean;
  startPoint?: [number, number];
  endPoint?: [number, number];
}

export function ShapeDrawingIndicator({
  tool,
  isActive,
  startPoint,
  endPoint,
}: ShapeIndicatorProps) {
  if (!isActive || !startPoint || !endPoint) {
    return null;
  }

  // This would be rendered as an SVG overlay on the map
  // For actual implementation, this would need to be integrated with the map
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full">
        {tool === 'rectangle' && (
          <rect
            x={Math.min(startPoint[0], endPoint[0])}
            y={Math.min(startPoint[1], endPoint[1])}
            width={Math.abs(endPoint[0] - startPoint[0])}
            height={Math.abs(endPoint[1] - startPoint[1])}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#1d4ed8"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
        {tool === 'circle' && (
          <circle
            cx={startPoint[0]}
            cy={startPoint[1]}
            r={Math.sqrt(
              Math.pow(endPoint[0] - startPoint[0], 2) +
                Math.pow(endPoint[1] - startPoint[1], 2)
            )}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#1d4ed8"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}
