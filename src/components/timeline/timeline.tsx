'use client';

import * as React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  LayoutList,
  LayoutPanelTop,
} from 'lucide-react';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn, formatTime } from '@/lib/utils';
import { Keyframe, Zone, Route, TextMarker } from '@/types';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  ScrollArea,
} from '@/components/ui';
import { TimelineTable, TimelineItemType } from '@/components/ai/timeline-table';

// ===========================================
// Constants
// ===========================================

const PIXELS_PER_SECOND_BASE = 50;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ITEM_HEIGHT = 24; // Height of each timeline item
const ITEM_GAP = 2; // Gap between stacked items
const TRACK_PADDING = 4; // Padding at top/bottom of track

// ===========================================
// Row Assignment Utility
// ===========================================

interface TimedItem {
  id: string;
  startTime: number;
  endTime: number;
}

/**
 * Assign row indices to items to avoid overlaps
 * Returns a map of item ID to row index
 */
function assignRows<T extends TimedItem>(items: T[]): Map<string, number> {
  const rowAssignments = new Map<string, number>();
  const rowEndTimes: number[] = []; // Track when each row becomes free

  // Sort by start time for greedy assignment
  const sortedItems = [...items].sort((a, b) => a.startTime - b.startTime);

  for (const item of sortedItems) {
    // Find the first row that's free (ends before this item starts)
    let assignedRow = -1;
    for (let row = 0; row < rowEndTimes.length; row++) {
      if (rowEndTimes[row] <= item.startTime) {
        assignedRow = row;
        break;
      }
    }

    // If no free row found, create a new one
    if (assignedRow === -1) {
      assignedRow = rowEndTimes.length;
      rowEndTimes.push(0);
    }

    // Assign this item to the row and update when the row becomes free
    rowAssignments.set(item.id, assignedRow);
    rowEndTimes[assignedRow] = item.endTime;
  }

  return rowAssignments;
}

/**
 * Calculate track height based on number of rows needed
 */
function calculateTrackHeight(rowCount: number): number {
  return TRACK_PADDING * 2 + rowCount * ITEM_HEIGHT + (rowCount - 1) * ITEM_GAP;
}

/**
 * Convert items to TimedItems for row assignment
 */
function toTimedItems(items: (Zone | Route | TextMarker)[]): TimedItem[] {
  return items.map(item => ({
    id: item.id,
    startTime: item.timing?.startTime ?? 0,
    endTime: item.timing?.endTime ?? 30,
  }));
}

// ===========================================
// Geometry Utilities for FlyTo
// ===========================================

/**
 * Calculate the centroid of a polygon (zone)
 */
function calculatePolygonCentroid(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) return [0, 0];

  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coordinates) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coordinates.length, sumLat / coordinates.length];
}

/**
 * Calculate the center of a route (line string)
 */
function calculateRouteCenter(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) return [0, 0];
  if (coordinates.length === 1) return coordinates[0];

  // Get the middle point of the route
  const midIndex = Math.floor(coordinates.length / 2);
  return coordinates[midIndex];
}

// ===========================================
// Timeline Ruler Component
// ===========================================

interface TimelineRulerProps {
  duration: number;
  pixelsPerSecond: number;
}

function TimelineRuler({ duration, pixelsPerSecond }: TimelineRulerProps) {
  const marks = [];
  const majorInterval = pixelsPerSecond >= 100 ? 1 : pixelsPerSecond >= 50 ? 2 : 5;
  const minorInterval = majorInterval / 4;

  for (let time = 0; time <= duration; time += minorInterval) {
    const isMajor = time % majorInterval === 0;
    const x = time * pixelsPerSecond;

    marks.push(
      <div
        key={time}
        className="absolute top-0"
        style={{ left: x }}
      >
        <div
          className={cn(
            'w-px bg-border',
            isMajor ? 'h-4' : 'h-2'
          )}
        />
        {isMajor && (
          <span className="absolute top-4 left-0 -translate-x-1/2 text-[10px] text-muted-foreground">
            {formatTime(time)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="timeline-ruler relative"
      style={{ width: duration * pixelsPerSecond }}
    >
      {marks}
    </div>
  );
}

// ===========================================
// Playhead Component
// ===========================================

interface PlayheadProps {
  time: number;
  pixelsPerSecond: number;
}

function Playhead({ time, pixelsPerSecond }: PlayheadProps) {
  const x = time * pixelsPerSecond;

  return (
    <div
      className="timeline-playhead"
      style={{ left: x }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm rotate-45" />
    </div>
  );
}

// ===========================================
// Keyframe Item Component
// ===========================================

interface KeyframeItemProps {
  keyframe: Keyframe;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function KeyframeItem({
  keyframe,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onDelete,
}: KeyframeItemProps) {
  const x = keyframe.time * pixelsPerSecond;
  const width = keyframe.duration * pixelsPerSecond;

  return (
    <div
      className={cn(
        'absolute top-1 h-6 rounded cursor-pointer transition-colors',
        'bg-primary/80 hover:bg-primary',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
      style={{
        left: x,
        width: Math.max(width, 20),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={keyframe.name || `Keyframe at ${formatTime(keyframe.time)}`}
    >
      <div className="px-1.5 h-full flex items-center">
        <span className="text-[10px] text-primary-foreground truncate">
          {keyframe.name || formatTime(keyframe.time)}
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Zone Item Component
// ===========================================

interface ZoneItemProps {
  zone: Zone;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  row?: number;
}

function ZoneItem({ zone, pixelsPerSecond, isSelected, onSelect, row = 0 }: ZoneItemProps) {
  const startTime = zone.timing?.startTime ?? 0;
  const endTime = zone.timing?.endTime ?? 30;
  const x = startTime * pixelsPerSecond;
  const width = (endTime - startTime) * pixelsPerSecond;
  const top = TRACK_PADDING + row * (ITEM_HEIGHT + ITEM_GAP);

  return (
    <div
      className={cn(
        'absolute rounded cursor-pointer transition-colors',
        'bg-green-500/80 hover:bg-green-500',
        isSelected && 'ring-2 ring-green-500 ring-offset-1'
      )}
      style={{
        left: x,
        top,
        height: ITEM_HEIGHT,
        width: Math.max(width, 20),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={zone.name || 'Zone'}
    >
      <div className="px-1.5 h-full flex items-center">
        <span className="text-[10px] text-white truncate">
          {zone.name || 'Zone'}
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Route Item Component
// ===========================================

interface RouteItemProps {
  route: Route;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  row?: number;
}

function RouteItem({ route, pixelsPerSecond, isSelected, onSelect, row = 0 }: RouteItemProps) {
  const startTime = route.timing?.startTime ?? 0;
  const endTime = route.timing?.endTime ?? 30;
  const x = startTime * pixelsPerSecond;
  const width = (endTime - startTime) * pixelsPerSecond;
  const top = TRACK_PADDING + row * (ITEM_HEIGHT + ITEM_GAP);

  return (
    <div
      className={cn(
        'absolute rounded cursor-pointer transition-colors',
        'bg-orange-500/80 hover:bg-orange-500',
        isSelected && 'ring-2 ring-orange-500 ring-offset-1'
      )}
      style={{
        left: x,
        top,
        height: ITEM_HEIGHT,
        width: Math.max(width, 20),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={route.name || 'Route'}
    >
      <div className="px-1.5 h-full flex items-center">
        <span className="text-[10px] text-white truncate">
          {route.name || 'Route'}
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Text Marker Item Component
// ===========================================

interface TextMarkerItemProps {
  marker: TextMarker;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  row?: number;
}

function TextMarkerItem({ marker, pixelsPerSecond, isSelected, onSelect, row = 0 }: TextMarkerItemProps) {
  const startTime = marker.timing?.startTime ?? 0;
  const endTime = marker.timing?.endTime ?? 30;
  const x = startTime * pixelsPerSecond;
  const width = (endTime - startTime) * pixelsPerSecond;
  const top = TRACK_PADDING + row * (ITEM_HEIGHT + ITEM_GAP);

  return (
    <div
      className={cn(
        'absolute rounded cursor-pointer transition-colors',
        'bg-purple-500/80 hover:bg-purple-500',
        isSelected && 'ring-2 ring-purple-500 ring-offset-1'
      )}
      style={{
        left: x,
        top,
        height: ITEM_HEIGHT,
        width: Math.max(width, 20),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={marker.text || 'Marker'}
    >
      <div className="px-1.5 h-full flex items-center">
        <span className="text-[10px] text-white truncate">
          {marker.text || 'Marker'}
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Track Component
// ===========================================

interface TrackProps {
  name: string;
  items: Keyframe[];
  pixelsPerSecond: number;
  duration: number;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (time: number) => void;
}

function Track({
  name,
  items,
  pixelsPerSecond,
  duration,
  selectedId,
  onSelectItem,
  onDeleteItem,
  onAddItem,
}: TrackProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / pixelsPerSecond;
      onAddItem(Math.max(0, Math.min(time, duration)));
    }
  };

  return (
    <div className="flex border-b border-border">
      {/* Track Label */}
      <div className="w-32 shrink-0 p-2 bg-muted/30 border-r border-border flex items-center">
        <span className="text-xs font-medium truncate">{name}</span>
      </div>

      {/* Track Content */}
      <div
        ref={trackRef}
        className="relative h-8 flex-1 bg-muted/10"
        style={{ width: duration * pixelsPerSecond }}
        onDoubleClick={handleTrackClick}
      >
        {items.map((item) => (
          <KeyframeItem
            key={item.id}
            keyframe={item}
            pixelsPerSecond={pixelsPerSecond}
            isSelected={selectedId === item.id}
            onSelect={() => onSelectItem(item.id)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Transport Controls Component
// ===========================================

function TransportControls() {
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const currentTime = useEditorStore((state) => state.currentTime);
  const play = useEditorStore((state) => state.play);
  const pause = useEditorStore((state) => state.pause);
  const seekBackward = useEditorStore((state) => state.seekBackward);
  const seekForward = useEditorStore((state) => state.seekForward);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const config = useProjectStore((state) => state.config);

  const duration = config?.settings.duration ?? 30;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentTime(0)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to Start</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => seekBackward()}
            >
              <SkipBack className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back 1s</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8"
              onClick={isPlaying ? pause : play}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => seekForward()}
            >
              <SkipForward className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Forward 1s</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentTime(duration)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to End</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="ml-2 text-sm font-mono tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}

// ===========================================
// Timeline Component
// ===========================================

type ViewMode = 'timeline' | 'table';

export function Timeline() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>('timeline');

  const currentTime = useEditorStore((state) => state.currentTime);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const timelineZoom = useEditorStore((state) => state.timelineZoom);
  const setTimelineZoom = useEditorStore((state) => state.setTimelineZoom);
  const zoomIn = useEditorStore((state) => state.zoomIn);
  const zoomOut = useEditorStore((state) => state.zoomOut);
  const timelineExpanded = useEditorStore((state) => state.timelineExpanded);
  const toggleTimelineExpanded = useEditorStore(
    (state) => state.toggleTimelineExpanded
  );

  const config = useProjectStore((state) => state.config);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const deleteKeyframe = useProjectStore((state) => state.deleteKeyframe);
  const deleteZone = useProjectStore((state) => state.deleteZone);
  const deleteRoute = useProjectStore((state) => state.deleteRoute);
  const deleteTextMarker = useProjectStore((state) => state.deleteTextMarker);

  const selectedElement = useEditorStore((state) => state.selectedElement);
  const selectElement = useEditorStore((state) => state.selectElement);
  const flyToLocation = useEditorStore((state) => state.flyToLocation);

  const duration = config?.settings.duration ?? 30;
  const keyframes = config?.keyframes ?? [];
  const zones = config?.zones ?? [];
  const routes = config?.routes ?? [];
  const textMarkers = config?.textMarkers ?? [];
  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * timelineZoom;

  // Calculate row assignments for overlapping items
  const zoneRowAssignments = React.useMemo(
    () => assignRows(toTimedItems(zones)),
    [zones]
  );
  const routeRowAssignments = React.useMemo(
    () => assignRows(toTimedItems(routes)),
    [routes]
  );
  const markerRowAssignments = React.useMemo(
    () => assignRows(toTimedItems(textMarkers)),
    [textMarkers]
  );

  // Calculate track heights based on number of rows
  const zoneRowCount = zones.length > 0 ? Math.max(...Array.from(zoneRowAssignments.values())) + 1 : 1;
  const routeRowCount = routes.length > 0 ? Math.max(...Array.from(routeRowAssignments.values())) + 1 : 1;
  const markerRowCount = textMarkers.length > 0 ? Math.max(...Array.from(markerRowAssignments.values())) + 1 : 1;

  const zoneTrackHeight = zones.length > 0 ? calculateTrackHeight(zoneRowCount) : 32;
  const routeTrackHeight = routes.length > 0 ? calculateTrackHeight(routeRowCount) : 32;
  const markerTrackHeight = textMarkers.length > 0 ? calculateTrackHeight(markerRowCount) : 32;

  // Handle ruler click to seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  };

  // Add new keyframe
  const handleAddKeyframe = (_time: number) => {
    // Use camera from last keyframe or default
    const lastKeyframe = keyframes[keyframes.length - 1];
    const camera = lastKeyframe?.camera ?? {
      centre: [55.2708, 25.2048] as [number, number],
      zoom: 14,
      bearing: 0,
      pitch: 45,
    };

    addKeyframe(camera);
  };

  // Select keyframe
  const handleSelectKeyframe = (id: string) => {
    selectElement({ type: 'keyframe', id });
    // For keyframes, fly to the keyframe's camera position
    const keyframe = keyframes.find(k => k.id === id);
    if (keyframe?.camera?.centre) {
      flyToLocation(keyframe.camera.centre, keyframe.camera.zoom);
    }
  };

  // Select zone and fly to its center
  const handleSelectZone = (id: string) => {
    selectElement({ type: 'zone', id });
    const zone = zones.find(z => z.id === id);
    if (zone?.coordinates && zone.coordinates.length > 0) {
      const center = calculatePolygonCentroid(zone.coordinates);
      flyToLocation(center);
    }
  };

  // Select route and fly to its center
  const handleSelectRoute = (id: string) => {
    selectElement({ type: 'route', id });
    const route = routes.find(r => r.id === id);
    if (route?.coordinates && route.coordinates.length > 0) {
      const center = calculateRouteCenter(route.coordinates);
      flyToLocation(center);
    }
  };

  // Select text marker and fly to its position
  const handleSelectTextMarker = (id: string) => {
    selectElement({ type: 'textMarker', id });
    const marker = textMarkers.find(m => m.id === id);
    if (marker?.position) {
      flyToLocation(marker.position);
    }
  };

  // Handle table item selection (with flyTo)
  const handleTableItemSelect = (id: string, type: TimelineItemType) => {
    selectElement({ type, id });

    // Fly to the element's location
    switch (type) {
      case 'keyframe': {
        const keyframe = keyframes.find(k => k.id === id);
        if (keyframe?.camera?.centre) {
          flyToLocation(keyframe.camera.centre, keyframe.camera.zoom);
        }
        break;
      }
      case 'zone': {
        const zone = zones.find(z => z.id === id);
        if (zone?.coordinates && zone.coordinates.length > 0) {
          flyToLocation(calculatePolygonCentroid(zone.coordinates));
        }
        break;
      }
      case 'route': {
        const route = routes.find(r => r.id === id);
        if (route?.coordinates && route.coordinates.length > 0) {
          flyToLocation(calculateRouteCenter(route.coordinates));
        }
        break;
      }
      case 'textMarker': {
        const marker = textMarkers.find(m => m.id === id);
        if (marker?.position) {
          flyToLocation(marker.position);
        }
        break;
      }
    }
  };

  // Handle table item deletion
  const handleTableItemDelete = (id: string, type: TimelineItemType) => {
    switch (type) {
      case 'keyframe':
        deleteKeyframe(id);
        break;
      case 'zone':
        deleteZone(id);
        break;
      case 'route':
        deleteRoute(id);
        break;
      case 'textMarker':
        deleteTextMarker(id);
        break;
    }
  };

  if (!timelineExpanded) {
    return (
      <div className="h-10 bg-background border-t flex items-center justify-between px-4">
        <TransportControls />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTimelineExpanded}
          className="h-7"
        >
          <ChevronUp className="h-4 w-4 mr-1" />
          Expand Timeline
        </Button>
      </div>
    );
  }

  return (
    <div className="timeline-container flex flex-col">
      {/* Timeline Header */}
      <div className="h-10 border-b flex items-center justify-between px-4">
        <TransportControls />

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={cn(
                      'h-7 px-2 flex items-center transition-colors',
                      viewMode === 'timeline'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted'
                    )}
                  >
                    <LayoutPanelTop className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Timeline View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'h-7 px-2 flex items-center transition-colors',
                      viewMode === 'table'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted'
                    )}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Table View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Zoom Controls (only in timeline view) */}
          {viewMode === 'timeline' && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={zoomOut}
                      disabled={timelineZoom <= MIN_ZOOM}
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="text-xs text-muted-foreground w-12 text-center">
                {Math.round(timelineZoom * 100)}%
              </span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={zoomIn}
                      disabled={timelineZoom >= MAX_ZOOM}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          {/* Collapse */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTimelineExpanded}
            className="h-7 ml-2"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Collapse
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'timeline' ? (
          // Visual Timeline View
          <div className="flex h-full">
            {/* Track Labels */}
            <div className="w-32 shrink-0 border-r overflow-y-auto">
              <div className="h-6 bg-muted/30" />
              {/* Camera Track Label */}
              <div className="h-8 flex items-center justify-between px-2 border-b">
                <span className="text-xs font-medium">Camera</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleAddKeyframe(currentTime)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Add keyframe at playhead</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* Zones Track Label */}
              {zones.length > 0 && (
                <div
                  className="flex items-start px-2 border-b bg-green-500/5"
                  style={{ height: zoneTrackHeight }}
                >
                  <div className="flex items-center justify-between w-full pt-1">
                    <span className="text-xs font-medium text-green-600">Zones</span>
                    <span className="text-[10px] text-muted-foreground">{zones.length}</span>
                  </div>
                </div>
              )}
              {/* Routes Track Label */}
              {routes.length > 0 && (
                <div
                  className="flex items-start px-2 border-b bg-orange-500/5"
                  style={{ height: routeTrackHeight }}
                >
                  <div className="flex items-center justify-between w-full pt-1">
                    <span className="text-xs font-medium text-orange-600">Routes</span>
                    <span className="text-[10px] text-muted-foreground">{routes.length}</span>
                  </div>
                </div>
              )}
              {/* Markers Track Label */}
              {textMarkers.length > 0 && (
                <div
                  className="flex items-start px-2 border-b bg-purple-500/5"
                  style={{ height: markerTrackHeight }}
                >
                  <div className="flex items-center justify-between w-full pt-1">
                    <span className="text-xs font-medium text-purple-600">Markers</span>
                    <span className="text-[10px] text-muted-foreground">{textMarkers.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Tracks */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-x-auto overflow-y-auto"
            >
              <div style={{ width: duration * pixelsPerSecond }}>
                {/* Ruler */}
                <div
                  className="h-6 relative cursor-pointer"
                  onClick={handleRulerClick}
                >
                  <TimelineRuler
                    duration={duration}
                    pixelsPerSecond={pixelsPerSecond}
                  />
                  <Playhead time={currentTime} pixelsPerSecond={pixelsPerSecond} />
                </div>

                {/* Keyframes Track */}
                <div className="relative h-8 border-b bg-muted/10">
                  {keyframes.map((keyframe) => (
                    <KeyframeItem
                      key={keyframe.id}
                      keyframe={keyframe}
                      pixelsPerSecond={pixelsPerSecond}
                      isSelected={
                        selectedElement?.type === 'keyframe' &&
                        selectedElement.id === keyframe.id
                      }
                      onSelect={() => handleSelectKeyframe(keyframe.id)}
                      onDelete={() => deleteKeyframe(keyframe.id)}
                    />
                  ))}
                </div>

                {/* Zones Track */}
                {zones.length > 0 && (
                  <div
                    className="relative border-b bg-green-500/5"
                    style={{ height: zoneTrackHeight }}
                  >
                    {zones.map((zone) => (
                      <ZoneItem
                        key={zone.id}
                        zone={zone}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={
                          selectedElement?.type === 'zone' &&
                          selectedElement.id === zone.id
                        }
                        onSelect={() => handleSelectZone(zone.id)}
                        row={zoneRowAssignments.get(zone.id) ?? 0}
                      />
                    ))}
                  </div>
                )}

                {/* Routes Track */}
                {routes.length > 0 && (
                  <div
                    className="relative border-b bg-orange-500/5"
                    style={{ height: routeTrackHeight }}
                  >
                    {routes.map((route) => (
                      <RouteItem
                        key={route.id}
                        route={route}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={
                          selectedElement?.type === 'route' &&
                          selectedElement.id === route.id
                        }
                        onSelect={() => handleSelectRoute(route.id)}
                        row={routeRowAssignments.get(route.id) ?? 0}
                      />
                    ))}
                  </div>
                )}

                {/* Text Markers Track */}
                {textMarkers.length > 0 && (
                  <div
                    className="relative border-b bg-purple-500/5"
                    style={{ height: markerTrackHeight }}
                  >
                    {textMarkers.map((marker) => (
                      <TextMarkerItem
                        key={marker.id}
                        marker={marker}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={
                          selectedElement?.type === 'textMarker' &&
                          selectedElement.id === marker.id
                        }
                        onSelect={() => handleSelectTextMarker(marker.id)}
                        row={markerRowAssignments.get(marker.id) ?? 0}
                      />
                    ))}
                  </div>
                )}

                {/* Playhead line extending through all tracks */}
                <div
                  className="absolute top-6 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                  style={{ left: currentTime * pixelsPerSecond }}
                />
              </div>
            </div>
          </div>
        ) : (
          // Table View
          <div className="h-full overflow-auto">
            <TimelineTable
              keyframes={keyframes}
              zones={config?.zones ?? []}
              routes={config?.routes ?? []}
              textMarkers={config?.textMarkers ?? []}
              totalDuration={duration}
              onItemSelect={handleTableItemSelect}
              onItemDelete={handleTableItemDelete}
              selectedItemId={selectedElement?.id}
              editable={true}
              className="min-h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
