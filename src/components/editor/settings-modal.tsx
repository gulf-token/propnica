'use client';

import * as React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui';

// ===========================================
// Settings Modal Component
// ===========================================
// Modal for configuring project settings

export interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map style options
const mapStyles = [
  { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
  { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' },
  { value: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
  { value: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
  { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
  { value: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite Streets' },
  { value: 'mapbox://styles/mapbox/navigation-day-v1', label: 'Navigation Day' },
  { value: 'mapbox://styles/mapbox/navigation-night-v1', label: 'Navigation Night' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const projectId = useProjectStore((state) => state.id);
  const projectName = useProjectStore((state) => state.name);
  const projectDescription = useProjectStore((state) => state.description);
  const settings = useProjectStore((state) => state.settings);
  const setName = useProjectStore((state) => state.setName);
  const setDescription = useProjectStore((state) => state.setDescription);
  const updateSettings = useProjectStore((state) => state.updateSettings);

  // Local state for form
  const [name, setLocalName] = React.useState(projectName);
  const [description, setLocalDescription] = React.useState(projectDescription || '');
  const [resolution, setResolution] = React.useState(settings.resolution);
  const [frameRate, setFrameRate] = React.useState(settings.frameRate);
  const [duration, setDuration] = React.useState(settings.duration);
  const [mapStyle, setMapStyle] = React.useState(settings.mapStyle);
  const [show3DBuildings, setShow3DBuildings] = React.useState(settings.show3DBuildings ?? true);
  const [showLabels, setShowLabels] = React.useState(settings.showLabels ?? true);
  const [backgroundColor, setBackgroundColor] = React.useState(settings.backgroundColor ?? '#000000');

  // Update mutation
  const updateProject = trpc.projects.update.useMutation();

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalName(projectName);
      setLocalDescription(projectDescription || '');
      setResolution(settings.resolution);
      setFrameRate(settings.frameRate);
      setDuration(settings.duration);
      setMapStyle(settings.mapStyle);
      setShow3DBuildings(settings.show3DBuildings ?? true);
      setShowLabels(settings.showLabels ?? true);
      setBackgroundColor(settings.backgroundColor ?? '#000000');
    }
  }, [open, projectName, projectDescription, settings]);

  const handleSave = () => {
    // Update store
    setName(name);
    setDescription(description || undefined);
    updateSettings({
      resolution,
      frameRate,
      duration,
      mapStyle,
      show3DBuildings,
      showLabels,
      backgroundColor,
    });

    // Save to server
    if (projectId) {
      updateProject.mutate({
        id: projectId,
        name,
        description: description || undefined,
        settings: {
          resolution,
          frameRate,
          duration,
          mapStyle,
          show3DBuildings,
          showLabels,
          backgroundColor,
        },
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Configure your project settings and video output options
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="Enter project description (optional)"
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Video Settings */}
          <TabsContent value="video" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger id="resolution">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (1280x720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                  <SelectItem value="4k">4K (3840x2160)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frameRate">Frame Rate</Label>
              <Select
                value={String(frameRate)}
                onValueChange={(v) => setFrameRate(Number(v))}
              >
                <SelectTrigger id="frameRate">
                  <SelectValue placeholder="Select frame rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 fps (Film)</SelectItem>
                  <SelectItem value="30">30 fps (Standard)</SelectItem>
                  <SelectItem value="60">60 fps (Smooth)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Duration: {duration} seconds</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                </span>
              </div>
              <Slider
                value={[duration]}
                onValueChange={([v]) => setDuration(v)}
                min={5}
                max={300}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5s</span>
                <span>5:00</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Colour</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </TabsContent>

          {/* Map Settings */}
          <TabsContent value="map" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="mapStyle">Map Style</Label>
              <Select value={mapStyle} onValueChange={setMapStyle}>
                <SelectTrigger id="mapStyle">
                  <SelectValue placeholder="Select map style" />
                </SelectTrigger>
                <SelectContent>
                  {mapStyles.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show3DBuildings">3D Buildings</Label>
                <p className="text-sm text-muted-foreground">
                  Show extruded 3D buildings on the map
                </p>
              </div>
              <Switch
                id="show3DBuildings"
                checked={show3DBuildings}
                onCheckedChange={setShow3DBuildings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showLabels">Map Labels</Label>
                <p className="text-sm text-muted-foreground">
                  Show place names and road labels
                </p>
              </div>
              <Switch
                id="showLabels"
                checked={showLabels}
                onCheckedChange={setShowLabels}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateProject.isPending}>
            {updateProject.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
