'use client';

import * as React from 'react';
import { GripVertical, Trash2, Copy, Settings } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { Keyframe } from '@/types';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';

// ===========================================
// Types
// ===========================================

export interface DraggableKeyframeProps {
  keyframe: Keyframe;
  pixelsPerSecond: number;
  duration: number;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.MouseEvent, keyframeId: string) => void;
  onResize: (keyframeId: string, newDuration: number) => void;
  onTimeChange: (keyframeId: string, newTime: number) => void;
}

// ===========================================
// Draggable Keyframe Component
// ===========================================

export function DraggableKeyframe({
  keyframe,
  pixelsPerSecond,
  duration,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  onResize,
  onTimeChange,
}: DraggableKeyframeProps) {
  const keyframeRef = React.useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const [resizeStartX, setResizeStartX] = React.useState(0);
  const [initialDuration, setInitialDuration] = React.useState(keyframe.duration);

  const x = keyframe.time * pixelsPerSecond;
  const width = Math.max(keyframe.duration * pixelsPerSecond, 30);

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setInitialDuration(keyframe.duration);
  };

  // Handle resize move
  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newDuration = Math.max(0.5, Math.min(initialDuration + deltaTime, duration - keyframe.time));
      onResize(keyframe.id, newDuration);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, initialDuration, pixelsPerSecond, keyframe.id, keyframe.time, duration, onResize]);

  // Get keyframe colour based on easing
  const getKeyframeColour = () => {
    switch (keyframe.easing) {
      case 'linear':
        return 'bg-blue-500/80 hover:bg-blue-500';
      case 'easeInOutCubic':
        return 'bg-purple-500/80 hover:bg-purple-500';
      case 'easeInOutQuad':
        return 'bg-green-500/80 hover:bg-green-500';
      case 'easeOutQuart':
        return 'bg-orange-500/80 hover:bg-orange-500';
      default:
        return 'bg-primary/80 hover:bg-primary';
    }
  };

  return (
    <div
      ref={keyframeRef}
      className={cn(
        'absolute top-1 h-6 rounded cursor-move transition-all',
        getKeyframeColour(),
        isSelected && 'ring-2 ring-white ring-offset-1 ring-offset-background z-10',
        isDragging && 'opacity-50 cursor-grabbing shadow-lg',
        isResizing && 'cursor-ew-resize'
      )}
      style={{
        left: x,
        width: width,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        if (!isResizing) {
          onDragStart(e, keyframe.id);
        }
      }}
    >
      {/* Drag Handle */}
      <div className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-grab opacity-60 hover:opacity-100">
        <GripVertical className="w-3 h-3 text-white" />
      </div>

      {/* Keyframe Content */}
      <div className="px-5 h-full flex items-center justify-between">
        <span className="text-[10px] text-white font-medium truncate flex-1">
          {keyframe.label || formatTime(keyframe.time)}
        </span>

        {/* Context Menu */}
        {isSelected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings className="w-3 h-3 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-3.5 h-3.5 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Resize Handle (Right Edge) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 transition-colors rounded-r"
        onMouseDown={handleResizeStart}
      />

      {/* Duration Tooltip */}
      {(isSelected || isDragging || isResizing) && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap bg-background/80 px-1 rounded">
          {formatTime(keyframe.time)} - {formatTime(keyframe.time + keyframe.duration)}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Timeline Track with Drag-and-Drop Support
// ===========================================

export interface DraggableTrackProps {
  name: string;
  keyframes: Keyframe[];
  pixelsPerSecond: number;
  duration: number;
  selectedKeyframeId: string | null;
  onSelectKeyframe: (id: string) => void;
  onDeleteKeyframe: (id: string) => void;
  onDuplicateKeyframe: (id: string) => void;
  onAddKeyframe: (time: number) => void;
  onUpdateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  onReorderKeyframes: (keyframeId: string, newTime: number) => void;
}

export function DraggableTrack({
  name,
  keyframes,
  pixelsPerSecond,
  duration,
  selectedKeyframeId,
  onSelectKeyframe,
  onDeleteKeyframe,
  onDuplicateKeyframe,
  onAddKeyframe,
  onUpdateKeyframe,
  onReorderKeyframes,
}: DraggableTrackProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = React.useState<{
    isDragging: boolean;
    keyframeId: string | null;
    startX: number;
    startTime: number;
  }>({
    isDragging: false,
    keyframeId: null,
    startX: 0,
    startTime: 0,
  });

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, keyframeId: string) => {
    e.preventDefault();
    const keyframe = keyframes.find((k) => k.id === keyframeId);
    if (!keyframe) return;

    setDragState({
      isDragging: true,
      keyframeId,
      startX: e.clientX,
      startTime: keyframe.time,
    });

    onSelectKeyframe(keyframeId);
  };

  // Handle drag move
  React.useEffect(() => {
    if (!dragState.isDragging || !dragState.keyframeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const keyframe = keyframes.find((k) => k.id === dragState.keyframeId);
      if (!keyframe) return;

      const newTime = Math.max(0, Math.min(dragState.startTime + deltaTime, duration - keyframe.duration));
      onReorderKeyframes(dragState.keyframeId, newTime);
    };

    const handleMouseUp = () => {
      setDragState((prev) => ({
        ...prev,
        isDragging: false,
        keyframeId: null,
      }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pixelsPerSecond, duration, keyframes, onReorderKeyframes]);

  // Handle track double-click to add keyframe
  const handleTrackDoubleClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, duration));

    // Check if clicking on an existing keyframe
    const clickedOnKeyframe = keyframes.some((keyframe) => {
      const keyframeX = keyframe.time * pixelsPerSecond;
      const keyframeWidth = keyframe.duration * pixelsPerSecond;
      return x >= keyframeX && x <= keyframeX + keyframeWidth;
    });

    if (!clickedOnKeyframe) {
      onAddKeyframe(time);
    }
  };

  // Handle resize
  const handleResize = (keyframeId: string, newDuration: number) => {
    onUpdateKeyframe(keyframeId, { duration: newDuration });
  };

  // Handle time change
  const handleTimeChange = (keyframeId: string, newTime: number) => {
    onUpdateKeyframe(keyframeId, { time: newTime });
  };

  // Sort keyframes by time for proper rendering order
  const sortedKeyframes = React.useMemo(
    () => [...keyframes].sort((a, b) => a.time - b.time),
    [keyframes]
  );

  return (
    <div className="flex border-b border-border">
      {/* Track Label */}
      <div className="w-32 shrink-0 p-2 bg-muted/30 border-r border-border flex items-center">
        <span className="text-xs font-medium truncate">{name}</span>
      </div>

      {/* Track Content */}
      <div
        ref={trackRef}
        className={cn(
          'relative h-8 flex-1 bg-muted/10',
          dragState.isDragging && 'cursor-grabbing'
        )}
        style={{ width: duration * pixelsPerSecond }}
        onDoubleClick={handleTrackDoubleClick}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-border/30"
              style={{ left: i * pixelsPerSecond }}
            />
          ))}
        </div>

        {/* Keyframes */}
        {sortedKeyframes.map((keyframe) => (
          <DraggableKeyframe
            key={keyframe.id}
            keyframe={keyframe}
            pixelsPerSecond={pixelsPerSecond}
            duration={duration}
            isSelected={selectedKeyframeId === keyframe.id}
            isDragging={dragState.isDragging && dragState.keyframeId === keyframe.id}
            onSelect={() => onSelectKeyframe(keyframe.id)}
            onDelete={() => onDeleteKeyframe(keyframe.id)}
            onDuplicate={() => onDuplicateKeyframe(keyframe.id)}
            onDragStart={handleDragStart}
            onResize={handleResize}
            onTimeChange={handleTimeChange}
          />
        ))}

        {/* Add Keyframe Hint */}
        {keyframes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Double-click to add a keyframe
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Snap-to-Grid Helper
// ===========================================

export function snapToGrid(time: number, gridSize: number = 0.5): number {
  return Math.round(time / gridSize) * gridSize;
}

// ===========================================
// Overlap Detection
// ===========================================

export function detectOverlap(
  keyframes: Keyframe[],
  targetId: string,
  newTime: number,
  newDuration: number
): boolean {
  const target = keyframes.find((k) => k.id === targetId);
  if (!target) return false;

  const targetEnd = newTime + newDuration;

  return keyframes.some((keyframe) => {
    if (keyframe.id === targetId) return false;

    const keyframeEnd = keyframe.time + keyframe.duration;
    return newTime < keyframeEnd && targetEnd > keyframe.time;
  });
}
