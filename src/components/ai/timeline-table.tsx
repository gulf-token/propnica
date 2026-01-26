'use client';

/**
 * Timeline Table Component
 *
 * Displays all project elements (keyframes, zones, routes, markers) in a unified
 * table view sorted by start time. Supports inline editing and AI modifications.
 */

import * as React from 'react';
import {
  Video,
  MapPin,
  Route as RouteIcon,
  Type,
  Trash2,
  Edit2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Plus,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { formatSecondsToTime } from '@/lib/ai/time-parser';
import type { Keyframe, Zone, Route, TextMarker } from '@/types';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

export type TimelineItemType = 'keyframe' | 'zone' | 'route' | 'textMarker';

export interface TimelineTableItem {
  id: string;
  type: TimelineItemType;
  startTime: number;
  endTime: number;
  duration: number;
  name: string;
  description?: string;
  data: Keyframe | Zone | Route | TextMarker;
}

interface TimelineTableProps {
  keyframes: Keyframe[];
  zones: Zone[];
  routes: Route[];
  textMarkers: TextMarker[];
  totalDuration: number;
  onItemSelect?: (id: string, type: TimelineItemType) => void;
  onItemUpdate?: (id: string, type: TimelineItemType, updates: Partial<TimelineTableItem>) => void;
  onItemDelete?: (id: string, type: TimelineItemType) => void;
  onAddItem?: (type: TimelineItemType) => void;
  selectedItemId?: string;
  editable?: boolean;
  className?: string;
}

// ===========================================
// Helper Functions
// ===========================================

function getItemIcon(type: TimelineItemType) {
  switch (type) {
    case 'keyframe':
      return <Video className="w-4 h-4" />;
    case 'zone':
      return <MapPin className="w-4 h-4" />;
    case 'route':
      return <RouteIcon className="w-4 h-4" />;
    case 'textMarker':
      return <Type className="w-4 h-4" />;
  }
}

function getItemTypeLabel(type: TimelineItemType) {
  switch (type) {
    case 'keyframe':
      return 'Camera';
    case 'zone':
      return 'Zone';
    case 'route':
      return 'Route';
    case 'textMarker':
      return 'Text';
  }
}

function getItemTypeColour(type: TimelineItemType) {
  switch (type) {
    case 'keyframe':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'zone':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'route':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'textMarker':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
  }
}

function convertToTableItems(
  keyframes: Keyframe[],
  zones: Zone[],
  routes: Route[],
  textMarkers: TextMarker[],
  totalDuration: number
): TimelineTableItem[] {
  const items: TimelineTableItem[] = [];

  // Convert keyframes
  for (const kf of keyframes) {
    items.push({
      id: kf.id,
      type: 'keyframe',
      startTime: kf.time,
      endTime: kf.time + kf.duration,
      duration: kf.duration,
      name: kf.name,
      description: `Zoom: ${kf.camera.zoom.toFixed(1)}, Bearing: ${kf.camera.bearing}°`,
      data: kf,
    });
  }

  // Convert zones
  for (const zone of zones) {
    items.push({
      id: zone.id,
      type: 'zone',
      startTime: zone.timing.startTime,
      endTime: zone.timing.endTime,
      duration: zone.timing.endTime - zone.timing.startTime,
      name: zone.name,
      description: zone.label.text || undefined,
      data: zone,
    });
  }

  // Convert routes
  for (const route of routes) {
    items.push({
      id: route.id,
      type: 'route',
      startTime: route.timing.startTime,
      endTime: route.timing.endTime,
      duration: route.timing.endTime - route.timing.startTime,
      name: route.name,
      description: route.animation.type === 'draw' ? `Draw (${route.animation.duration}s)` : undefined,
      data: route,
    });
  }

  // Convert text markers
  for (const marker of textMarkers) {
    items.push({
      id: marker.id,
      type: 'textMarker',
      startTime: marker.timing.startTime,
      endTime: marker.timing.endTime,
      duration: marker.timing.endTime - marker.timing.startTime,
      name: marker.text,
      data: marker,
    });
  }

  // Sort by start time
  items.sort((a, b) => a.startTime - b.startTime);

  return items;
}

// ===========================================
// Timeline Table Row Component
// ===========================================

interface TableRowProps {
  item: TimelineTableItem;
  isSelected: boolean;
  editable: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TimelineTableItem>) => void;
  onDelete: () => void;
}

function TableRow({
  item,
  isSelected,
  editable,
  onSelect,
  onUpdate,
  onDelete,
}: TableRowProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(item.name);
  const [editStartTime, setEditStartTime] = React.useState(formatSecondsToTime(item.startTime));
  const [editDuration, setEditDuration] = React.useState(item.duration.toString());

  const handleSave = () => {
    // Parse time from MM:SS format
    const timeParts = editStartTime.split(':');
    const startTime = timeParts.length === 2
      ? parseInt(timeParts[0]) * 60 + parseInt(timeParts[1])
      : parseInt(editStartTime);

    const duration = parseFloat(editDuration);

    onUpdate({
      name: editName,
      startTime,
      duration,
      endTime: startTime + duration,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditStartTime(formatSecondsToTime(item.startTime));
    setEditDuration(item.duration.toString());
    setIsEditing(false);
  };

  return (
    <tr
      className={cn(
        'border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer',
        isSelected && 'bg-primary/5 hover:bg-primary/10'
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <td className="w-8 px-2">
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
      </td>

      {/* Time */}
      <td className="px-3 py-2 w-20">
        {isEditing ? (
          <Input
            value={editStartTime}
            onChange={(e) => setEditStartTime(e.target.value)}
            className="h-7 w-16 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="font-mono text-sm">{formatSecondsToTime(item.startTime)}</span>
        )}
      </td>

      {/* Duration */}
      <td className="px-3 py-2 w-20">
        {isEditing ? (
          <Input
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            className="h-7 w-14 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{item.duration}s</span>
        )}
      </td>

      {/* Type Badge */}
      <td className="px-3 py-2 w-24">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
            getItemTypeColour(item.type)
          )}
        >
          {getItemIcon(item.type)}
          {getItemTypeLabel(item.type)}
        </span>
      </td>

      {/* Name/Description */}
      <td className="px-3 py-2">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2 w-24">
        {editable && (
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ===========================================
// Main Timeline Table Component
// ===========================================

export function TimelineTable({
  keyframes,
  zones,
  routes,
  textMarkers,
  totalDuration,
  onItemSelect,
  onItemUpdate,
  onItemDelete,
  onAddItem,
  selectedItemId,
  editable = true,
  className,
}: TimelineTableProps) {
  const items = React.useMemo(
    () => convertToTableItems(keyframes, zones, routes, textMarkers, totalDuration),
    [keyframes, zones, routes, textMarkers, totalDuration]
  );

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium text-sm">Timeline ({items.length} items)</h3>
        {editable && onAddItem && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddItem('keyframe')}
            >
              <Plus className="w-3 h-3 mr-1" />
              Camera
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddItem('zone')}
            >
              <Plus className="w-3 h-3 mr-1" />
              Zone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddItem('route')}
            >
              <Plus className="w-3 h-3 mr-1" />
              Route
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddItem('textMarker')}
            >
              <Plus className="w-3 h-3 mr-1" />
              Text
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="px-3 py-2 text-left font-medium">Time</th>
              <th className="px-3 py-2 text-left font-medium">Duration</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-left font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No timeline items yet. Add camera movements, zones, routes, or text.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <TableRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  isSelected={selectedItemId === item.id}
                  editable={editable}
                  onSelect={() => onItemSelect?.(item.id, item.type)}
                  onUpdate={(updates) => onItemUpdate?.(item.id, item.type, updates)}
                  onDelete={() => onItemDelete?.(item.id, item.type)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
        <span>Total Duration: {formatSecondsToTime(totalDuration)}</span>
        <span>{items.length} items</span>
      </div>
    </div>
  );
}

export default TimelineTable;
