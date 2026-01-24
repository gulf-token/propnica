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
} from 'lucide-react';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn } from '@/lib/utils';
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
} from '@/components/ui';
import { EasingType, EASING_TYPES } from '@/types';

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
        {/* Label */}
        <Section title="Label">
          <Input
            value={keyframe.label || ''}
            onChange={(e) =>
              updateKeyframe(keyframe.id, { label: e.target.value })
            }
            placeholder="Keyframe label"
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
                {EASING_TYPES.map((easing) => (
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
              onChange={(value) =>
                updateZone(zone.id, {
                  style: { ...zone.style, fillColour: value },
                })
              }
            />
          </PropertyRow>
          <PropertyRow label="Fill Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[zone.style.fillOpacity]}
                onValueChange={([value]) =>
                  updateZone(zone.id, {
                    style: { ...zone.style, fillOpacity: value },
                  })
                }
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
              onChange={(value) =>
                updateZone(zone.id, {
                  style: { ...zone.style, strokeColour: value },
                })
              }
            />
          </PropertyRow>
          <PropertyRow label="Stroke Width">
            <Input
              type="number"
              value={zone.style.strokeWidth}
              onChange={(e) =>
                updateZone(zone.id, {
                  style: { ...zone.style, strokeWidth: parseFloat(e.target.value) },
                })
              }
              min={0}
              max={20}
              step={0.5}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>

        {/* Timing */}
        <Section title="Animation">
          <PropertyRow label="Visible From">
            <Input
              type="number"
              value={zone.timing.appearAt}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: { ...zone.timing, appearAt: parseFloat(e.target.value) },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
          <PropertyRow label="Disappear At">
            <Input
              type="number"
              value={zone.timing.disappearAt ?? ''}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: {
                    ...zone.timing,
                    disappearAt: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
              placeholder="Never"
            />
          </PropertyRow>
          <PropertyRow label="Fade Duration">
            <Input
              type="number"
              value={zone.timing.fadeDuration}
              onChange={(e) =>
                updateZone(zone.id, {
                  timing: {
                    ...zone.timing,
                    fadeDuration: parseFloat(e.target.value),
                  },
                })
              }
              min={0}
              step={0.1}
              className="h-8 text-xs"
            />
          </PropertyRow>
        </Section>

        {/* Label */}
        <Section title="Label">
          <PropertyRow label="Show Label">
            <Switch
              checked={zone.label?.show ?? false}
              onCheckedChange={(checked) =>
                updateZone(zone.id, {
                  label: { ...zone.label, show: checked, text: zone.label?.text || zone.name },
                })
              }
            />
          </PropertyRow>
          {zone.label?.show && (
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
      // Add more element type panels as needed
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
