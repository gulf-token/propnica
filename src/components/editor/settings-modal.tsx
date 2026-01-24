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
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui';
import type { MapStyle, ResolutionPreset } from '@/types';

// ===========================================
// Settings Modal Component
// ===========================================
// Modal for configuring project settings

export interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map style options - matching the MapStyle type
const mapStyles: { value: MapStyle; label: string }[] = [
  { value: 'satellite', label: 'Satellite' },
  { value: 'satellite-streets', label: 'Satellite Streets' },
  { value: 'streets', label: 'Streets' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  // Store state - using correct property names from project-store.ts
  const projectId = useProjectStore((state) => state.projectId);
  const projectName = useProjectStore((state) => state.projectName);
  const projectDescription = useProjectStore((state) => state.projectDescription);
  const config = useProjectStore((state) => state.config);
  const updateProjectMeta = useProjectStore((state) => state.updateProjectMeta);
  const updateSettings = useProjectStore((state) => state.updateSettings);
  const updateMapSettings = useProjectStore((state) => state.updateMapSettings);

  // Local state for form - using correct property names from types
  const [name, setLocalName] = React.useState(projectName);
  const [description, setLocalDescription] = React.useState(projectDescription || '');
  const [resolution, setResolution] = React.useState<ResolutionPreset>(config.settings.resolution);
  const [fps, setFps] = React.useState(config.settings.fps);
  const [duration, setDuration] = React.useState(config.settings.duration);
  const [mapStyle, setMapStyle] = React.useState<MapStyle>(config.mapSettings.style);

  // Update mutation
  const updateProject = trpc.projects.update.useMutation();

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalName(projectName);
      setLocalDescription(projectDescription || '');
      setResolution(config.settings.resolution);
      setFps(config.settings.fps);
      setDuration(config.settings.duration);
      setMapStyle(config.mapSettings.style);
    }
  }, [open, projectName, projectDescription, config]);

  const handleSave = () => {
    // Update store
    updateProjectMeta(name, description || null);
    updateSettings({
      resolution,
      fps,
      duration,
    });
    updateMapSettings({
      style: mapStyle,
    });

    // Save to server - using `config` not `settings`
    if (projectId) {
      updateProject.mutate({
        id: projectId,
        name,
        description: description || null,
        config: {
          ...config,
          settings: {
            ...config.settings,
            resolution,
            fps,
            duration,
          },
          mapSettings: {
            ...config.mapSettings,
            style: mapStyle,
          },
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
              <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionPreset)}>
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
              <Label htmlFor="fps">Frame Rate</Label>
              <Select
                value={String(fps)}
                onValueChange={(v) => setFps(Number(v))}
              >
                <SelectTrigger id="fps">
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
          </TabsContent>

          {/* Map Settings */}
          <TabsContent value="map" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="mapStyle">Map Style</Label>
              <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as MapStyle)}>
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
