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
}

function ZoneItem({ zone, pixelsPerSecond, isSelected, onSelect }: ZoneItemProps) {
  const startTime = zone.timing?.startTime ?? 0;
  const endTime = zone.timing?.endTime ?? 30;
  const x = startTime * pixelsPerSecond;
  const width = (endTime - startTime) * pixelsPerSecond;

  return (
    <div
      className={cn(
        'absolute top-1 h-6 rounded cursor-pointer transition-colors',
        'bg-green-500/80 hover:bg-green-500',
        isSelected && 'ring-2 ring-green-500 ring-offset-1'
      )}
      style={{
        left: x,
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
}

function RouteItem({ route, pixelsPerSecond, isSelected, onSelect }: RouteItemProps) {
  const startTime = route.timing?.startTime ?? 0;
  const endTime = route.timing?.endTime ?? 30;
  const x = startTime * pixelsPerSecond;
  const width = (endTime - startTime) * pixelsPerSecond;

  return (
    <div
      className={cn(
        'absolute top-1 h-6 rounded cursor-pointer transition-colors',
        'bg-orange-500/80 hover:bg-orange-500',
        isSelected && 'ring-2 ring-orange-500 ring-offset-1'
      )}
      style={{
        left: x,
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
}

function TextMarkerItem({ marker, pixelsPerSecond, isSelected, onSelect }: TextMarkerItemProps) {
  const startTime = marker.timing?.startTime ?? 0;
  const endTime = marker.timing?.endTime ?? 30;
  const x = startTime * pixelsPerSecond;
  const width = (endTime - startTime) * pixelsPerSecond;

  return (
    <div
      className={cn(
        'absolute top-1 h-6 rounded cursor-pointer transition-colors',
        'bg-purple-500/80 hover:bg-purple-500',
        isSelected && 'ring-2 ring-purple-500 ring-offset-1'
      )}
      style={{
        left: x,
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

  const duration = config?.settings.duration ?? 30;
  const keyframes = config?.keyframes ?? [];
  const zones = config?.zones ?? [];
  const routes = config?.routes ?? [];
  const textMarkers = config?.textMarkers ?? [];
  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * timelineZoom;

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
  };

  // Handle table item selection
  const handleTableItemSelect = (id: string, type: TimelineItemType) => {
    selectElement({ type, id });
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
                <div className="h-8 flex items-center px-2 border-b bg-green-500/5">
                  <span className="text-xs font-medium text-green-600">Zones</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{zones.length}</span>
                </div>
              )}
              {/* Routes Track Label */}
              {routes.length > 0 && (
                <div className="h-8 flex items-center px-2 border-b bg-orange-500/5">
                  <span className="text-xs font-medium text-orange-600">Routes</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{routes.length}</span>
                </div>
              )}
              {/* Markers Track Label */}
              {textMarkers.length > 0 && (
                <div className="h-8 flex items-center px-2 border-b bg-purple-500/5">
                  <span className="text-xs font-medium text-purple-600">Markers</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{textMarkers.length}</span>
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
                  <div className="relative h-8 border-b bg-green-500/5">
                    {zones.map((zone) => (
                      <ZoneItem
                        key={zone.id}
                        zone={zone}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={
                          selectedElement?.type === 'zone' &&
                          selectedElement.id === zone.id
                        }
                        onSelect={() => selectElement({ type: 'zone', id: zone.id })}
                      />
                    ))}
                  </div>
                )}

                {/* Routes Track */}
                {routes.length > 0 && (
                  <div className="relative h-8 border-b bg-orange-500/5">
                    {routes.map((route) => (
                      <RouteItem
                        key={route.id}
                        route={route}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={
                          selectedElement?.type === 'route' &&
                          selectedElement.id === route.id
                        }
                        onSelect={() => selectElement({ type: 'route', id: route.id })}
                      />
                    ))}
                  </div>
                )}

                {/* Text Markers Track */}
                {textMarkers.length > 0 && (
                  <div className="relative h-8 border-b bg-purple-500/5">
                    {textMarkers.map((marker) => (
                      <TextMarkerItem
                        key={marker.id}
                        marker={marker}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={
                          selectedElement?.type === 'textMarker' &&
                          selectedElement.id === marker.id
                        }
                        onSelect={() => selectElement({ type: 'textMarker', id: marker.id })}
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
