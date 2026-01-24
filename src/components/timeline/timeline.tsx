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
} from 'lucide-react';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn, formatTime } from '@/lib/utils';
import { Keyframe } from '@/types';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  ScrollArea,
} from '@/components/ui';

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
      title={keyframe.label || `Keyframe at ${formatTime(keyframe.time)}`}
    >
      <div className="px-1.5 h-full flex items-center">
        <span className="text-[10px] text-primary-foreground truncate">
          {keyframe.label || formatTime(keyframe.time)}
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
              onClick={seekBackward}
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
              onClick={seekForward}
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

export function Timeline() {
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

  const selectedElement = useEditorStore((state) => state.selectedElement);
  const selectElement = useEditorStore((state) => state.selectElement);

  const duration = config?.settings.duration ?? 30;
  const keyframes = config?.keyframes ?? [];
  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * timelineZoom;

  // Handle ruler click to seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  };

  // Add new keyframe
  const handleAddKeyframe = (time: number) => {
    addKeyframe({
      time,
      duration: 3,
      easing: 'easeInOutCubic',
      camera: config?.mapSettings ?? {
        centre: [55.2708, 25.2048],
        zoom: 14,
        bearing: 0,
        pitch: 45,
      },
    });
  };

  // Select keyframe
  const handleSelectKeyframe = (id: string) => {
    selectElement({ type: 'keyframe', id });
  };

  if (!isTimelineExpanded) {
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
          {/* Zoom Controls */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={zoomTimelineOut}
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
                  onClick={zoomTimelineIn}
                  disabled={timelineZoom >= MAX_ZOOM}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
        <div className="flex h-full">
          {/* Track Labels */}
          <div className="w-32 shrink-0 border-r">
            <div className="h-6 bg-muted/30" />
            <div className="h-8 flex items-center px-2 border-b">
              <span className="text-xs font-medium">Camera</span>
            </div>
          </div>

          {/* Timeline Tracks */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
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

                {/* Playhead line extending through tracks */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
                  style={{ left: currentTime * pixelsPerSecond }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
