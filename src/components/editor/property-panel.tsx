'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Archive,
  RotateCw,
} from 'lucide-react';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { saveZoneColors, saveRouteColors, saveTextMarkerColors } from '@/lib/color-preferences';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import {
  EasingType,
  EASING_TYPES,
  ZoneFillAnimation,
  ZoneStrokeAnimation,
  RouteDrawStyle,
  RouteDrawDirection,
  TextEntryAnimation,
  ExitAnimationType,
  AnimationEasing,
  ANIMATION_PRESETS,
  AnimationPresetName,
  DEFAULT_ZONE_ANIMATION_CONFIG,
  DEFAULT_ROUTE_ANIMATION_CONFIG,
  DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
} from '@/types';

// ===========================================
// Section Component
// ===========================================

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

// ===========================================
// Property Row Component
// ===========================================

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
      <div className="flex-1 max-w-[140px]">{children}</div>
    </div>
  );
}

// ===========================================
// Colour Picker Input
// ===========================================

interface ColourPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function ColourPicker({ value, onChange }: ColourPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded border cursor-pointer"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs font-mono"
      />
    </div>
  );
}

// ===========================================
// Rotation Control Component
// ===========================================

interface RotationControlProps {
  value: number;
  onChange: (value: number) => void;
}

function RotationControl({ value, onChange }: RotationControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={360}
        step={1}
        className="flex-1"
      />
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={0}
          max={360}
          step={1}
          className="h-8 w-14 text-xs"
        />
        <span className="text-xs text-muted-foreground">°</span>
      </div>
    </div>
  );
}

// ===========================================
// Archive Button Component
// ===========================================

interface ArchiveButtonProps {
  type: 'ZONE' | 'ROUTE' | 'TEXT_MARKER';
  config: unknown;
  defaultName: string;
}

function ArchiveButton({ type, config, defaultName }: ArchiveButtonProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [name, setName] = React.useState(defaultName);
  const [description, setDescription] = React.useState('');

  const utils = trpc.useUtils();
  const createMutation = trpc.library.create.useMutation({
    onSuccess: () => {
      setDialogOpen(false);
      setName(defaultName);
      setDescription('');
      utils.library.list.invalidate();
    },
  });

  const handleArchive = () => {
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      config,
    });
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setName(defaultName);
              setDialogOpen(true);
            }}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Archive to Library</TooltipContent>
      </Tooltip>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Archive to Library</DialogTitle>
            <DialogDescription>
              Save this element to your library for reuse in other projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="archive-name">Name</Label>
              <Input
                id="archive-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="archive-description">Description (optional)</Label>
              <Input
                id="archive-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save to Library'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================
// Animation Option Arrays
// ===========================================

const ZONE_FILL_ANIMATIONS: { value: ZoneFillAnimation; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'expandCenter', label: 'Expand from Center' },
  { value: 'expandEdge', label: 'Expand from Edge' },
  { value: 'wipeLeft', label: 'Wipe Left' },
  { value: 'wipeRight', label: 'Wipe Right' },
  { value: 'wipeUp', label: 'Wipe Up' },
  { value: 'wipeDown', label: 'Wipe Down' },
  { value: 'reveal', label: 'Progressive Reveal' },
];

const ZONE_STROKE_ANIMATIONS: { value: ZoneStrokeAnimation; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'draw', label: 'Draw Around' },
  { value: 'dashMove', label: 'Moving Dashes' },
];

const ROUTE_DRAW_STYLES: { value: RouteDrawStyle; label: string }[] = [
  { value: 'solid', label: 'Solid Line' },
  { value: 'dashed', label: 'Animated Dashes' },
  { value: 'dotted', label: 'Animated Dots' },
  { value: 'gradient', label: 'Gradient Trail' },
];

const ROUTE_DRAW_DIRECTIONS: { value: RouteDrawDirection; label: string }[] = [
  { value: 'startToEnd', label: 'Start to End' },
  { value: 'endToStart', label: 'End to Start' },
  { value: 'middle', label: 'From Middle' },
  { value: 'both', label: 'Both Ends' },
];

const TEXT_ENTRY_ANIMATIONS: { value: TextEntryAnimation; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'wordByWord', label: 'Word by Word' },
  { value: 'scaleUp', label: 'Scale Up' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'blur', label: 'Blur to Clear' },
];

const EXIT_ANIMATIONS: { value: ExitAnimationType; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'fadeOut', label: 'Fade Out' },
  { value: 'scaleDown', label: 'Scale Down' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'slideUp', label: 'Slide Up' },
];

const ANIMATION_EASINGS: { value: AnimationEasing; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'easeInCubic', label: 'Ease In Cubic' },
  { value: 'easeOutCubic', label: 'Ease Out Cubic' },
  { value: 'easeInOutCubic', label: 'Ease In Out Cubic' },
  { value: 'easeOutBack', label: 'Ease Out Back' },
  { value: 'easeOutBounce', label: 'Bounce' },
  { value: 'easeOutElastic', label: 'Elastic' },
];

const ANIMATION_PRESET_OPTIONS: { value: AnimationPresetName; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'slide', label: 'Slide' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'professional', label: 'Professional' },
];

// ===========================================
// Keyframe Properties Panel
// ===========================================

function KeyframeProperties() {
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const config = useProjectStore((state) => state.config);
  const updateKeyframe = useProjectStore((state) => state.updateKeyframe);
  const deleteKeyframe = useProjectStore((state) => state.deleteKeyframe);
  const duplicateKeyframe = useProjectStore((state) => state.duplicateKeyframe);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  if (!selectedElement || selectedElement.type !== 'keyframe') {
    return null;
  }

  const keyframe = config?.keyframes.find((k) => k.id === selectedElement.id);
  if (!keyframe) return null;

  const handleDelete = () => {
    deleteKeyframe(keyframe.id);
    clearSelection();
  };

  const handleDuplicate = () => {
    duplicateKeyframe(keyframe.id);
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm">Keyframe</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {/* Name */}
        <Section title="Name">
          <Input
            value={keyframe.name || ''}
            onChange={(e) =>
              updateKeyframe(keyframe.id, { name: e.target.value })
            }
            placeholder="Keyframe name"
            className="h-8 text-sm"
          />
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <PropertyRow label="Time">
            <Input
              type="number"
              value={keyframe.time}
              onChange={(e) =>
                updateKeyframe(keyframe.id, { time: parseFloat(e.target.value) })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Duration">
            <Input
              type="number"
              value={keyframe.duration}
              onChange={(e) =>
                updateKeyframe(keyframe.id, {
                  duration: parseFloat(e.target.value),
                })
              }
              min={0.1}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Easing">
            <Select
              value={keyframe.easing}
              onValueChange={(value) =>
                updateKeyframe(keyframe.id, { easing: value as EasingType })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EASING_TYPES.map((easing: EasingType) => (
                  <SelectItem key={easing} value={easing} className="text-xs">
                    {easing}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
        </Section>

        {/* Camera Position */}
        <Section title="Camera Position">
          <PropertyRow label="Longitude">
            <Input
              type="number"
              value={keyframe.camera.centre[0].toFixed(6)}
              onChange={(e) =>
                updateKeyframe(keyframe.id, {
                  camera: {
                    ...keyframe.camera,
                    centre: [parseFloat(e.target.value), keyframe.camera.centre[1]],
                  },
                })
              }
              step={0.0001}
              className="h-8 text-xs font-mono"
            />
          </PropertyRow>
          <PropertyRow label="Latitude">
            <Input
              type="number"
              value={keyframe.camera.centre[1].toFixed(6)}
              onChange={(e) =>
                updateKeyframe(keyframe.id, {
                  camera: {
                    ...keyframe.camera,
                    centre: [keyframe.camera.centre[0], parseFloat(e.target.value)],
                  },
                })
              }
              step={0.0001}
              className="h-8 text-xs font-mono"
            />
          </PropertyRow>
          <PropertyRow label="Zoom">
            <Input
              type="number"
              value={keyframe.camera.zoom.toFixed(2)}
              onChange={(e) =>
                updateKeyframe(keyframe.id, {
                  camera: {
                    ...keyframe.camera,
                    zoom: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              max={22}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Bearing">
            <Input
              type="number"
              value={keyframe.camera.bearing.toFixed(1)}
              onChange={(e) =>
                updateKeyframe(keyframe.id, {
                  camera: {
                    ...keyframe.camera,
                    bearing: parseFloat(e.target.value),
                  },
                })
              }
              min={-180}
              max={180}
              step={1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Pitch">
            <Input
              type="number"
              value={keyframe.camera.pitch.toFixed(1)}
              onChange={(e) =>
                updateKeyframe(keyframe.id, {
                  camera: {
                    ...keyframe.camera,
                    pitch: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              max={85}
              step={1}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>
      </ScrollArea>
    </div>
  );
}

// ===========================================
// Zone Properties Panel
// ===========================================

function ZoneProperties() {
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const config = useProjectStore((state) => state.config);
  const updateZone = useProjectStore((state) => state.updateZone);
  const deleteZone = useProjectStore((state) => state.deleteZone);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  if (!selectedElement || selectedElement.type !== 'zone') {
    return null;
  }

  const zone = config?.zones.find((z) => z.id === selectedElement.id);
  if (!zone) return null;

  const handleDelete = () => {
    deleteZone(zone.id);
    clearSelection();
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm">Zone</h3>
        <div className="flex items-center gap-1">
          <ArchiveButton type="ZONE" config={zone} defaultName={zone.name} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {/* Name */}
        <Section title="Name">
          <Input
            value={zone.name}
            onChange={(e) => updateZone(zone.id, { name: e.target.value })}
            placeholder="Zone name"
            className="h-8 text-sm"
          />
        </Section>

        {/* Style */}
        <Section title="Style">
          <PropertyRow label="Fill Colour">
            <ColourPicker
              value={zone.style.fillColour}
              onChange={(value) => {
                updateZone(zone.id, {
                  style: { ...zone.style, fillColour: value },
                });
                saveZoneColors({ fillColour: value });
              }}
            />
          </PropertyRow>
          <PropertyRow label="Fill Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[zone.style.fillOpacity]}
                onValueChange={([value]) => {
                  updateZone(zone.id, {
                    style: { ...zone.style, fillOpacity: value },
                  });
                  saveZoneColors({ fillOpacity: value });
                }}
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">
                {Math.round(zone.style.fillOpacity * 100)}%
              </span>
            </div>
          </PropertyRow>
          <PropertyRow label="Stroke Colour">
            <ColourPicker
              value={zone.style.strokeColour}
              onChange={(value) => {
                updateZone(zone.id, {
                  style: { ...zone.style, strokeColour: value },
                });
                saveZoneColors({ strokeColour: value });
              }}
            />
          </PropertyRow>
          <PropertyRow label="Stroke Width">
            <Input
              type="number"
              value={zone.style.strokeWidth}
              onChange={(e) => {
                const strokeWidth = parseFloat(e.target.value);
                updateZone(zone.id, {
                  style: { ...zone.style, strokeWidth },
                });
                saveZoneColors({ strokeWidth });
              }}
              min={0}
              max={20}
              step={0.5}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Stroke Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[zone.style.strokeOpacity ?? 1]}
                onValueChange={([value]) =>
                  updateZone(zone.id, {
                    style: { ...zone.style, strokeOpacity: value },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">
                {Math.round((zone.style.strokeOpacity ?? 1) * 100)}%
              </span>
            </div>
          </PropertyRow>
        </Section>

        {/* Transform */}
        <Section title="Transform">
          <PropertyRow label="Rotation">
            <RotationControl
              value={zone.style.rotation ?? 0}
              onChange={(value) =>
                updateZone(zone.id, {
                  style: { ...zone.style, rotation: value },
                })
              }
            />
          </PropertyRow>
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <PropertyRow label="Start Time">
            <Input
              type="number"
              value={zone.timing.startTime}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: { ...zone.timing, startTime: parseFloat(e.target.value) },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="End Time">
            <Input
              type="number"
              value={zone.timing.endTime}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: {
                    ...zone.timing,
                    endTime: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fade In">
            <Input
              type="number"
              value={zone.timing.fadeInDuration}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: {
                    ...zone.timing,
                    fadeInDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fade Out">
            <Input
              type="number"
              value={zone.timing.fadeOutDuration}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: {
                    ...zone.timing,
                    fadeOutDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>

        {/* Animation Effects */}
        <Section title="Animation Effects" defaultOpen={false}>
          <PropertyRow label="Fill Animation">
            <Select
              value={zone.animationConfig?.fillAnimation || 'fadeIn'}
              onValueChange={(value: ZoneFillAnimation) =>
                updateZone(zone.id, {
                  animationConfig: {
                    ...DEFAULT_ZONE_ANIMATION_CONFIG,
                    ...zone.animationConfig,
                    fillAnimation: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONE_FILL_ANIMATIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
          <PropertyRow label="Fill Duration">
            <Input
              type="number"
              value={zone.animationConfig?.fillDuration ?? 0.5}
              onChange={(e) =>
                updateZone(zone.id, {
                  animationConfig: {
                    ...DEFAULT_ZONE_ANIMATION_CONFIG,
                    ...zone.animationConfig,
                    fillDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              max={5}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fill Easing">
            <Select
              value={zone.animationConfig?.fillEasing || 'easeOutCubic'}
              onValueChange={(value: AnimationEasing) =>
                updateZone(zone.id, {
                  animationConfig: {
                    ...DEFAULT_ZONE_ANIMATION_CONFIG,
                    ...zone.animationConfig,
                    fillEasing: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_EASINGS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
          <Separator className="my-2" />
          <PropertyRow label="Stroke Animation">
            <Select
              value={zone.animationConfig?.strokeAnimation || 'instant'}
              onValueChange={(value: ZoneStrokeAnimation) =>
                updateZone(zone.id, {
                  animationConfig: {
                    ...DEFAULT_ZONE_ANIMATION_CONFIG,
                    ...zone.animationConfig,
                    strokeAnimation: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONE_STROKE_ANIMATIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
          <PropertyRow label="Stroke Duration">
            <Input
              type="number"
              value={zone.animationConfig?.strokeDuration ?? 0.5}
              onChange={(e) =>
                updateZone(zone.id, {
                  animationConfig: {
                    ...DEFAULT_ZONE_ANIMATION_CONFIG,
                    ...zone.animationConfig,
                    strokeDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              max={5}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <Separator className="my-2" />
          <PropertyRow label="Pulse Effect">
            <Switch
              checked={zone.animationConfig?.pulseEnabled ?? false}
              onCheckedChange={(checked) =>
                updateZone(zone.id, {
                  animationConfig: {
                    ...DEFAULT_ZONE_ANIMATION_CONFIG,
                    ...zone.animationConfig,
                    pulseEnabled: checked,
                  },
                })
              }
            />
          </PropertyRow>
          {zone.animationConfig?.pulseEnabled && (
            <PropertyRow label="Pulse Duration">
              <Input
                type="number"
                value={zone.animationConfig?.pulseDuration ?? 2}
                onChange={(e) =>
                  updateZone(zone.id, {
                    animationConfig: {
                      ...DEFAULT_ZONE_ANIMATION_CONFIG,
                      ...zone.animationConfig,
                      pulseDuration: parseFloat(e.target.value),
                    },
                  })
                }
                min={0.5}
                max={5}
                step={0.1}
                className="h-8 text-xs"
              />
            </PropertyRow>
          )}
        </Section>

        {/* Label */}
        <Section title="Label">
          <PropertyRow label="Show Label">
            <Switch
              checked={zone.label?.visible ?? false}
              onCheckedChange={(checked) =>
                updateZone(zone.id, {
                  label: { ...zone.label, visible: checked, text: zone.label?.text || zone.name },
                })
              }
            />
          </PropertyRow>
          {zone.label?.visible && (
            <>
              <PropertyRow label="Label Text">
                <Input
                  value={zone.label.text}
                  onChange={(e) =>
                    updateZone(zone.id, {
                      label: { ...zone.label, text: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
              </PropertyRow>
              <PropertyRow label="Font Size">
                <Input
                  type="number"
                  value={zone.label.fontSize ?? 14}
                  onChange={(e) =>
                    updateZone(zone.id, {
                      label: { ...zone.label, fontSize: parseInt(e.target.value) },
                    })
                  }
                  min={8}
                  max={72}
                  className="h-8 text-xs"
                />
              </PropertyRow>
            </>
          )}
        </Section>
      </ScrollArea>
    </div>
  );
}

// ===========================================
// Route Properties Panel
// ===========================================

function RouteProperties() {
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const config = useProjectStore((state) => state.config);
  const updateRoute = useProjectStore((state) => state.updateRoute);
  const deleteRoute = useProjectStore((state) => state.deleteRoute);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  if (!selectedElement || selectedElement.type !== 'route') {
    return null;
  }

  const route = config?.routes.find((r) => r.id === selectedElement.id);
  if (!route) return null;

  const handleDelete = () => {
    deleteRoute(route.id);
    clearSelection();
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm">Route</h3>
        <div className="flex items-center gap-1">
          <ArchiveButton type="ROUTE" config={route} defaultName={route.name} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {/* Name */}
        <Section title="Name">
          <Input
            value={route.name}
            onChange={(e) => updateRoute(route.id, { name: e.target.value })}
            placeholder="Route name"
            className="h-8 text-sm"
          />
        </Section>

        {/* Style */}
        <Section title="Style">
          <PropertyRow label="Colour">
            <ColourPicker
              value={route.style.colour}
              onChange={(value) => {
                updateRoute(route.id, {
                  style: { ...route.style, colour: value },
                });
                saveRouteColors({ colour: value });
              }}
            />
          </PropertyRow>
          <PropertyRow label="Width">
            <Input
              type="number"
              value={route.style.width}
              onChange={(e) => {
                const width = parseFloat(e.target.value);
                updateRoute(route.id, {
                  style: { ...route.style, width },
                });
                saveRouteColors({ width });
              }}
              min={1}
              max={20}
              step={0.5}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[route.style.opacity ?? 1]}
                onValueChange={([value]) => {
                  updateRoute(route.id, {
                    style: { ...route.style, opacity: value },
                  });
                  saveRouteColors({ opacity: value });
                }}
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">
                {Math.round((route.style.opacity ?? 1) * 100)}%
              </span>
            </div>
          </PropertyRow>
        </Section>

        {/* Outline (for visibility on satellite) */}
        <Section title="Outline" defaultOpen={false}>
          <PropertyRow label="Outline Colour">
            <ColourPicker
              value={route.style.outlineColour || '#FFFFFF'}
              onChange={(value) =>
                updateRoute(route.id, {
                  style: { ...route.style, outlineColour: value },
                })
              }
            />
          </PropertyRow>
          <PropertyRow label="Outline Width">
            <Input
              type="number"
              value={route.style.outlineWidth ?? 0}
              onChange={(e) =>
                updateRoute(route.id, {
                  style: { ...route.style, outlineWidth: parseFloat(e.target.value) },
                })
              }
              min={0}
              max={10}
              step={0.5}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Outline Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[route.style.outlineOpacity ?? 1]}
                onValueChange={([value]) =>
                  updateRoute(route.id, {
                    style: { ...route.style, outlineOpacity: value },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">
                {Math.round((route.style.outlineOpacity ?? 1) * 100)}%
              </span>
            </div>
          </PropertyRow>
        </Section>

        {/* Transform */}
        <Section title="Transform">
          <PropertyRow label="Rotation">
            <RotationControl
              value={route.style.rotation ?? 0}
              onChange={(value) =>
                updateRoute(route.id, {
                  style: { ...route.style, rotation: value },
                })
              }
            />
          </PropertyRow>
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <PropertyRow label="Start Time">
            <Input
              type="number"
              value={route.timing.startTime}
              onChange={(e) =>
                updateRoute(route.id, {
                  timing: { ...route.timing, startTime: parseFloat(e.target.value) },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="End Time">
            <Input
              type="number"
              value={route.timing.endTime}
              onChange={(e) =>
                updateRoute(route.id, {
                  timing: { ...route.timing, endTime: parseFloat(e.target.value) },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fade In">
            <Input
              type="number"
              value={route.timing.fadeInDuration}
              onChange={(e) =>
                updateRoute(route.id, {
                  timing: {
                    ...route.timing,
                    fadeInDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fade Out">
            <Input
              type="number"
              value={route.timing.fadeOutDuration}
              onChange={(e) =>
                updateRoute(route.id, {
                  timing: {
                    ...route.timing,
                    fadeOutDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>

        {/* Animation Effects */}
        <Section title="Animation Effects" defaultOpen={false}>
          <PropertyRow label="Draw Animation">
            <Switch
              checked={route.animationConfig?.drawEnabled ?? true}
              onCheckedChange={(checked) =>
                updateRoute(route.id, {
                  animationConfig: {
                    ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                    ...route.animationConfig,
                    drawEnabled: checked,
                  },
                })
              }
            />
          </PropertyRow>
          {(route.animationConfig?.drawEnabled ?? true) && (
            <>
              <PropertyRow label="Draw Duration">
                <Input
                  type="number"
                  value={route.animationConfig?.drawDuration ?? 2}
                  onChange={(e) =>
                    updateRoute(route.id, {
                      animationConfig: {
                        ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                        ...route.animationConfig,
                        drawDuration: parseFloat(e.target.value),
                      },
                    })
                  }
                  min={0.1}
                  max={10}
                  step={0.1}
                  className="h-8 text-xs"
                />
              </PropertyRow>
              <PropertyRow label="Draw Style">
                <Select
                  value={route.animationConfig?.drawStyle || 'solid'}
                  onValueChange={(value: RouteDrawStyle) =>
                    updateRoute(route.id, {
                      animationConfig: {
                        ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                        ...route.animationConfig,
                        drawStyle: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_DRAW_STYLES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
              <PropertyRow label="Draw Direction">
                <Select
                  value={route.animationConfig?.drawDirection || 'startToEnd'}
                  onValueChange={(value: RouteDrawDirection) =>
                    updateRoute(route.id, {
                      animationConfig: {
                        ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                        ...route.animationConfig,
                        drawDirection: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_DRAW_DIRECTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
              <PropertyRow label="Draw Easing">
                <Select
                  value={route.animationConfig?.drawEasing || 'easeOutCubic'}
                  onValueChange={(value: AnimationEasing) =>
                    updateRoute(route.id, {
                      animationConfig: {
                        ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                        ...route.animationConfig,
                        drawEasing: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATION_EASINGS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
            </>
          )}
          <Separator className="my-2" />
          <PropertyRow label="Trail Effect">
            <Switch
              checked={route.animationConfig?.trailEnabled ?? false}
              onCheckedChange={(checked) =>
                updateRoute(route.id, {
                  animationConfig: {
                    ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                    ...route.animationConfig,
                    trailEnabled: checked,
                  },
                })
              }
            />
          </PropertyRow>
          {route.animationConfig?.trailEnabled && (
            <>
              <PropertyRow label="Trail Colour">
                <ColourPicker
                  value={route.animationConfig?.trailColour || route.style.colour}
                  onChange={(value) =>
                    updateRoute(route.id, {
                      animationConfig: {
                        ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                        ...route.animationConfig,
                        trailColour: value,
                      },
                    })
                  }
                />
              </PropertyRow>
              <PropertyRow label="Trail Length">
                <div className="flex items-center gap-2">
                  <Slider
                    value={[route.animationConfig?.trailLength ?? 0.3]}
                    onValueChange={([value]) =>
                      updateRoute(route.id, {
                        animationConfig: {
                          ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                          ...route.animationConfig,
                          trailLength: value,
                        },
                      })
                    }
                    min={0.1}
                    max={1}
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-xs w-8 text-right">
                    {Math.round((route.animationConfig?.trailLength ?? 0.3) * 100)}%
                  </span>
                </div>
              </PropertyRow>
            </>
          )}
          <Separator className="my-2" />
          <PropertyRow label="Glow Effect">
            <Switch
              checked={route.animationConfig?.glowEnabled ?? false}
              onCheckedChange={(checked) =>
                updateRoute(route.id, {
                  animationConfig: {
                    ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                    ...route.animationConfig,
                    glowEnabled: checked,
                  },
                })
              }
            />
          </PropertyRow>
          {route.animationConfig?.glowEnabled && (
            <>
              <PropertyRow label="Glow Colour">
                <ColourPicker
                  value={route.animationConfig?.glowColour || route.style.colour}
                  onChange={(value) =>
                    updateRoute(route.id, {
                      animationConfig: {
                        ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                        ...route.animationConfig,
                        glowColour: value,
                      },
                    })
                  }
                />
              </PropertyRow>
              <PropertyRow label="Glow Intensity">
                <div className="flex items-center gap-2">
                  <Slider
                    value={[route.animationConfig?.glowIntensity ?? 0.5]}
                    onValueChange={([value]) =>
                      updateRoute(route.id, {
                        animationConfig: {
                          ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                          ...route.animationConfig,
                          glowIntensity: value,
                        },
                      })
                    }
                    min={0.1}
                    max={1}
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-xs w-8 text-right">
                    {Math.round((route.animationConfig?.glowIntensity ?? 0.5) * 100)}%
                  </span>
                </div>
              </PropertyRow>
            </>
          )}
          <Separator className="my-2" />
          <PropertyRow label="Pulse Effect">
            <Switch
              checked={route.animationConfig?.pulseEnabled ?? false}
              onCheckedChange={(checked) =>
                updateRoute(route.id, {
                  animationConfig: {
                    ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                    ...route.animationConfig,
                    pulseEnabled: checked,
                  },
                })
              }
            />
          </PropertyRow>
          {route.animationConfig?.pulseEnabled && (
            <PropertyRow label="Pulse Duration">
              <Input
                type="number"
                value={route.animationConfig?.pulseDuration ?? 2}
                onChange={(e) =>
                  updateRoute(route.id, {
                    animationConfig: {
                      ...DEFAULT_ROUTE_ANIMATION_CONFIG,
                      ...route.animationConfig,
                      pulseDuration: parseFloat(e.target.value),
                    },
                  })
                }
                min={0.5}
                max={5}
                step={0.1}
                className="h-8 text-xs"
              />
            </PropertyRow>
          )}
        </Section>
      </ScrollArea>
    </div>
  );
}

// ===========================================
// Text Marker Properties Panel
// ===========================================

function TextMarkerProperties() {
  const selectedElement = useEditorStore((state) => state.selectedElement);
  const config = useProjectStore((state) => state.config);
  const updateTextMarker = useProjectStore((state) => state.updateTextMarker);
  const deleteTextMarker = useProjectStore((state) => state.deleteTextMarker);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  if (!selectedElement || selectedElement.type !== 'textMarker') {
    return null;
  }

  const textMarker = config?.textMarkers.find((t) => t.id === selectedElement.id);
  if (!textMarker) return null;

  const handleDelete = () => {
    deleteTextMarker(textMarker.id);
    clearSelection();
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm">Text Marker</h3>
        <div className="flex items-center gap-1">
          <ArchiveButton type="TEXT_MARKER" config={textMarker} defaultName={textMarker.text} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {/* Text */}
        <Section title="Text">
          <Input
            value={textMarker.text}
            onChange={(e) => updateTextMarker(textMarker.id, { text: e.target.value })}
            placeholder="Marker text"
            className="h-8 text-sm"
          />
        </Section>

        {/* Position */}
        <Section title="Position">
          <PropertyRow label="Longitude">
            <Input
              type="number"
              value={textMarker.position[0].toFixed(6)}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  position: [parseFloat(e.target.value), textMarker.position[1]],
                })
              }
              step={0.0001}
              className="h-8 text-xs font-mono"
            />
          </PropertyRow>
          <PropertyRow label="Latitude">
            <Input
              type="number"
              value={textMarker.position[1].toFixed(6)}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  position: [textMarker.position[0], parseFloat(e.target.value)],
                })
              }
              step={0.0001}
              className="h-8 text-xs font-mono"
            />
          </PropertyRow>
        </Section>

        {/* Style */}
        <Section title="Style">
          <PropertyRow label="Font Size">
            <Input
              type="number"
              value={textMarker.style.fontSize}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  style: { ...textMarker.style, fontSize: parseInt(e.target.value) },
                })
              }
              min={8}
              max={72}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Font Colour">
            <ColourPicker
              value={textMarker.style.fontColour}
              onChange={(value) => {
                updateTextMarker(textMarker.id, {
                  style: { ...textMarker.style, fontColour: value },
                });
                saveTextMarkerColors({ fontColour: value });
              }}
            />
          </PropertyRow>
          <PropertyRow label="Background">
            <ColourPicker
              value={textMarker.style.backgroundColour || 'rgba(0,0,0,0.8)'}
              onChange={(value) => {
                updateTextMarker(textMarker.id, {
                  style: { ...textMarker.style, backgroundColour: value },
                });
                saveTextMarkerColors({ backgroundColour: value });
              }}
            />
          </PropertyRow>
          <PropertyRow label="Bg Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[textMarker.style.backgroundOpacity ?? 0.9]}
                onValueChange={([value]) =>
                  updateTextMarker(textMarker.id, {
                    style: { ...textMarker.style, backgroundOpacity: value },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">
                {Math.round((textMarker.style.backgroundOpacity ?? 0.9) * 100)}%
              </span>
            </div>
          </PropertyRow>
          <PropertyRow label="Border Colour">
            <ColourPicker
              value={textMarker.style.borderColour || '#000000'}
              onChange={(value) =>
                updateTextMarker(textMarker.id, {
                  style: { ...textMarker.style, borderColour: value },
                })
              }
            />
          </PropertyRow>
          <PropertyRow label="Border Width">
            <Input
              type="number"
              value={textMarker.style.borderWidth ?? 0}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  style: { ...textMarker.style, borderWidth: parseFloat(e.target.value) },
                })
              }
              min={0}
              max={10}
              step={0.5}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>

        {/* Transform */}
        <Section title="Transform">
          <PropertyRow label="Rotation">
            <RotationControl
              value={textMarker.style.rotation ?? 0}
              onChange={(value) =>
                updateTextMarker(textMarker.id, {
                  style: { ...textMarker.style, rotation: value },
                })
              }
            />
          </PropertyRow>
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <PropertyRow label="Start Time">
            <Input
              type="number"
              value={textMarker.timing.startTime}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  timing: { ...textMarker.timing, startTime: parseFloat(e.target.value) },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="End Time">
            <Input
              type="number"
              value={textMarker.timing.endTime}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  timing: { ...textMarker.timing, endTime: parseFloat(e.target.value) },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fade In">
            <Input
              type="number"
              value={textMarker.timing.fadeInDuration}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  timing: {
                    ...textMarker.timing,
                    fadeInDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Fade Out">
            <Input
              type="number"
              value={textMarker.timing.fadeOutDuration}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  timing: {
                    ...textMarker.timing,
                    fadeOutDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>

        {/* Animation Effects */}
        <Section title="Animation Effects" defaultOpen={false}>
          <PropertyRow label="Entry Animation">
            <Select
              value={textMarker.animationConfig?.entryAnimation || 'fadeIn'}
              onValueChange={(value: TextEntryAnimation) =>
                updateTextMarker(textMarker.id, {
                  animationConfig: {
                    ...DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
                    ...textMarker.animationConfig,
                    entryAnimation: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_ENTRY_ANIMATIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
          <PropertyRow label="Entry Duration">
            <Input
              type="number"
              value={textMarker.animationConfig?.entryDuration ?? 0.5}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  animationConfig: {
                    ...DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
                    ...textMarker.animationConfig,
                    entryDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              max={5}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Entry Easing">
            <Select
              value={textMarker.animationConfig?.entryEasing || 'easeOutCubic'}
              onValueChange={(value: AnimationEasing) =>
                updateTextMarker(textMarker.id, {
                  animationConfig: {
                    ...DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
                    ...textMarker.animationConfig,
                    entryEasing: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_EASINGS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
          <Separator className="my-2" />
          <PropertyRow label="Exit Animation">
            <Select
              value={textMarker.animationConfig?.exitType || 'fadeOut'}
              onValueChange={(value: ExitAnimationType) =>
                updateTextMarker(textMarker.id, {
                  animationConfig: {
                    ...DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
                    ...textMarker.animationConfig,
                    exitType: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXIT_ANIMATIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
          <PropertyRow label="Exit Duration">
            <Input
              type="number"
              value={textMarker.animationConfig?.exitDuration ?? 0.5}
              onChange={(e) =>
                updateTextMarker(textMarker.id, {
                  animationConfig: {
                    ...DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
                    ...textMarker.animationConfig,
                    exitDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              max={5}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Exit Easing">
            <Select
              value={textMarker.animationConfig?.exitEasing || 'easeInCubic'}
              onValueChange={(value: AnimationEasing) =>
                updateTextMarker(textMarker.id, {
                  animationConfig: {
                    ...DEFAULT_TEXT_MARKER_ANIMATION_CONFIG,
                    ...textMarker.animationConfig,
                    exitEasing: value,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_EASINGS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>
        </Section>
      </ScrollArea>
    </div>
  );
}

// ===========================================
// No Selection Panel
// ===========================================

function NoSelectionPanel() {
  const config = useProjectStore((state) => state.config);

  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground text-center">
        Select an element to view its properties
      </p>

      <Separator className="my-4" />

      <div className="space-y-2 text-xs text-muted-foreground">
        <p>
          <strong>Keyframes:</strong> {config?.keyframes.length ?? 0}
        </p>
        <p>
          <strong>Zones:</strong> {config?.zones.length ?? 0}
        </p>
        <p>
          <strong>Routes:</strong> {config?.routes.length ?? 0}
        </p>
        <p>
          <strong>Markers:</strong> {config?.textMarkers.length ?? 0}
        </p>
      </div>
    </div>
  );
}

// ===========================================
// Property Panel Component
// ===========================================

export function PropertyPanel() {
  const selectedElement = useEditorStore((state) => state.selectedElement);

  const renderContent = () => {
    if (!selectedElement) {
      return <NoSelectionPanel />;
    }

    switch (selectedElement.type) {
      case 'keyframe':
        return <KeyframeProperties />;
      case 'zone':
        return <ZoneProperties />;
      case 'route':
        return <RouteProperties />;
      case 'textMarker':
        return <TextMarkerProperties />;
      default:
        return <NoSelectionPanel />;
    }
  };

  return (
    <div className="w-64 bg-background border-l flex flex-col">
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm">Properties</h2>
      </div>
      {renderContent()}
    </div>
  );
}
