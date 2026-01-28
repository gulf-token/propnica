'use client';

/**
 * AI Project Generator Component
 *
 * A multi-step wizard for creating projects from natural language scripts.
 *
 * Steps:
 * 1. Script Input - Free-form text or structured table
 * 2. AI Processing - Parse with streaming feedback
 * 3. Review & Edit - Timeline table with preview
 * 4. Create Project
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  FileText,
  Wand2,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Table,
  AlignLeft,
  Settings,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
import { TimelineTable, type TimelineTableItem, type TimelineItemType } from './timeline-table';
import { LocationAutocomplete, type LocationResult } from './location-autocomplete';
import { trpc } from '@/lib/trpc';
import { ParsedScript, TimelineItem } from '@/lib/ai/schemas';
import {
  convertToProjectConfig,
  extractLocations,
  type GeocodedLocation,
} from '@/lib/ai/parse-script';
import { formatSecondsToTime } from '@/lib/ai/time-parser';
import type { ProjectConfig, AspectRatioPreset, MapStyle, Keyframe, Zone, Route, TextMarker } from '@/types';
import { cn } from '@/lib/utils';

// ===========================================
// Known UAE Landmarks with Precise Coordinates
// ===========================================

const KNOWN_LANDMARKS: Record<string, [number, number]> = {
  // Dubai Landmarks
  'burj khalifa': [55.2744, 25.1972],
  'burj al arab': [55.1853, 25.1412],
  'dubai mall': [55.2796, 25.1985],
  'dubai marina': [55.1430, 25.0805],
  'palm jumeirah': [55.1384, 25.1124],
  'dubai frame': [55.3001, 25.2352],
  'museum of the future': [55.2826, 25.2198],
  'dubai creek': [55.3272, 25.2631],
  'dubai creek harbour': [55.3442, 25.2044],
  'downtown dubai': [55.2744, 25.1972],
  'business bay': [55.2646, 25.1850],
  'jbr': [55.1410, 25.0770],
  'jumeirah beach residence': [55.1410, 25.0770],
  'dubai international airport': [55.3647, 25.2528],
  'dxb airport': [55.3647, 25.2528],
  'emirates towers': [55.2829, 25.2176],
  'world trade centre dubai': [55.2829, 25.2288],
  'deira': [55.3258, 25.2728],
  'bur dubai': [55.3028, 25.2608],
  'city walk': [55.2611, 25.2111],
  'la mer': [55.2536, 25.2211],
  'bluewaters island': [55.1254, 25.0810],
  'ain dubai': [55.1244, 25.0783],
  'dubai hills': [55.2410, 25.1236],
  'arabian ranches': [55.2598, 25.0487],
  'motor city': [55.2358, 25.0432],
  'silicon oasis': [55.3911, 25.1186],
  'al barsha': [55.2098, 25.1025],
  'jumeirah village circle': [55.2090, 25.0635],
  'jvc': [55.2090, 25.0635],
  'mirdif': [55.4246, 25.2166],
  'ras al khor wildlife sanctuary': [55.3361, 25.1849],

  // Abu Dhabi Landmarks
  'sheikh zayed grand mosque': [54.4714, 24.4128],
  'louvre abu dhabi': [54.3983, 24.5336],
  'yas island': [54.6046, 24.4910],
  'yas marina circuit': [54.6026, 24.4677],
  'ferrari world': [54.6073, 24.4834],
  'emirates palace': [54.3172, 24.4619],
  'corniche abu dhabi': [54.3428, 24.4718],
  'qasr al watan': [54.3161, 24.4620],
  'saadiyat island': [54.4339, 24.5407],
  'al maryah island': [54.3893, 24.4994],

  // Sharjah Landmarks
  'sharjah museum': [55.3926, 25.3579],
  'al noor mosque sharjah': [55.3877, 25.3581],
  'al majaz waterfront': [55.3913, 25.3352],

  // Other Emirates
  'ajman corniche': [55.4434, 25.4167],
  'ras al khaimah': [55.9432, 25.7895],
  'fujairah': [56.3411, 25.1288],
  'umm al quwain': [55.5689, 25.5582],

  // Dubai Areas/Neighborhoods
  'bay square': [55.2646, 25.1850],
  'bay square business bay': [55.2646, 25.1850],
  'emaar beachfront': [55.1340, 25.0850],
  'dubai south': [55.1692, 24.8981],
  'expo city dubai': [55.0867, 24.9600],
  'dubai production city': [55.1932, 25.0358],
  'jumeirah lake towers': [55.1462, 25.0735],
  'jlt': [55.1462, 25.0735],
  'tecom': [55.1730, 25.0970],
  'al quoz': [55.2259, 25.1389],
  'al wasl': [55.2550, 25.1892],
};

// Normalize location name for matching
function normalizeLocationName(name: string): string {
  return name.toLowerCase().trim().replace(/[,.']/g, '');
}

// Find landmark coordinates with fuzzy matching
function findKnownLandmark(locationName: string): [number, number] | null {
  const normalized = normalizeLocationName(locationName);

  // Direct match
  if (KNOWN_LANDMARKS[normalized]) {
    return KNOWN_LANDMARKS[normalized];
  }

  // Partial match - check if location contains landmark name or vice versa
  for (const [landmark, coords] of Object.entries(KNOWN_LANDMARKS)) {
    if (normalized.includes(landmark) || landmark.includes(normalized)) {
      return coords;
    }
  }

  // Word-based match - check if any key words match
  const normalizedWords = normalized.split(/\s+/);
  for (const [landmark, coords] of Object.entries(KNOWN_LANDMARKS)) {
    const landmarkWords = landmark.split(/\s+/);
    // Check if at least 2 words match, or if it's a single-word match and both are short
    const matchingWords = normalizedWords.filter(w => landmarkWords.includes(w) && w.length > 2);
    if (matchingWords.length >= 2 || (matchingWords.length === 1 && landmarkWords.length === 1)) {
      return coords;
    }
  }

  return null;
}

// ===========================================
// Geocoding Helper (using Google for accuracy)
// ===========================================

import { geocodeWithGoogle, getZoomForPlaceType, calculateZoomFromViewport } from '@/lib/google-geocoding';

async function geocodeLocation(locationName: string): Promise<GeocodedLocation | null> {
  // First check known landmarks for precise coordinates
  const knownCoords = findKnownLandmark(locationName);
  if (knownCoords) {
    console.log(`[Geocoding] Found known landmark for "${locationName}":`, knownCoords);
    return {
      name: locationName,
      coordinates: knownCoords,
      confidence: 1.0, // High confidence for known landmarks
    };
  }

  // Use Google Geocoding API for more accurate results
  const googleResult = await geocodeWithGoogle(locationName);
  if (googleResult) {
    return {
      name: locationName,
      coordinates: googleResult.coordinates,
      confidence: googleResult.confidence,
    };
  }

  // Fall back to Mapbox geocoding if Google fails
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('Mapbox access token not configured for geocoding fallback');
    return null;
  }

  try {
    // Bias towards UAE for property focus
    const proximity = '55.2708,25.2048'; // Dubai coordinates

    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json`
    );
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('proximity', proximity);
    url.searchParams.set('limit', '1');
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Mapbox geocoding API error for "${locationName}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      console.log(`[Geocoding] Mapbox fallback for "${locationName}":`, feature.center, feature.place_type);
      return {
        name: locationName,
        coordinates: feature.center as [number, number],
        confidence: feature.relevance ?? 0.5,
      };
    }

    console.warn(`[Geocoding] No results found for "${locationName}"`);
    return null;
  } catch (error) {
    console.error(`Geocoding error for "${locationName}":`, error);
    return null;
  }
}

async function geocodeAllLocations(
  locations: string[],
  onProgress?: (message: string) => void
): Promise<Map<string, GeocodedLocation>> {
  const geocodedLocations = new Map<string, GeocodedLocation>();

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    onProgress?.(`Geocoding location ${i + 1}/${locations.length}: ${location}`);

    const result = await geocodeLocation(location);
    if (result) {
      geocodedLocations.set(location, result);
    }

    // Small delay to avoid rate limiting
    if (i < locations.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return geocodedLocations;
}

// ===========================================
// Types
// ===========================================

type WizardStep = 'input' | 'processing' | 'review' | 'creating' | 'success';

interface AIProjectGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
}

// ===========================================
// Step Indicator
// ===========================================

const STEPS = [
  { id: 'input', label: 'Script', icon: FileText },
  { id: 'processing', label: 'Process', icon: Wand2 },
  { id: 'review', label: 'Review', icon: Table },
  { id: 'creating', label: 'Create', icon: Loader2 },
  { id: 'success', label: 'Done', icon: CheckCircle },
] as const;

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={cn(
                  'h-0.5 w-8',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                isCurrent && 'bg-primary text-primary-foreground',
                isCompleted && 'bg-primary/20 text-primary',
                !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ===========================================
// Step 1: Script Input
// ===========================================

interface ScriptInputStepProps {
  script: string;
  onScriptChange: (script: string) => void;
  settings: {
    aspectRatio: AspectRatioPreset;
    mapStyle: MapStyle;
    duration: number;
  };
  onSettingsChange: (settings: ScriptInputStepProps['settings']) => void;
  onNext: () => void;
}

function ScriptInputStep({
  script,
  onScriptChange,
  settings,
  onSettingsChange,
  onNext,
}: ScriptInputStepProps) {
  const [inputMode, setInputMode] = React.useState<'text' | 'table'>('text');

  const exampleScript = `00:00 Start with a portrait screen size, suitable for TikTok video
00:00 The opening screen will show the extent of Dubai city area
00:03 We zoom into Business Bay area
00:05 A zone surrounding Bay Square is drawn with blue outline and semi-transparent blue fill
00:08 Text appears in white with black outline saying "Business Bay"
00:12 Draw a line from Burj Khalifa to Bay Square, animated over 4 seconds from start to end points in red
00:20 Circle around the zone for 10 seconds`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Describe Your Video</h2>
        <p className="text-sm text-muted-foreground">
          Write a script describing what should happen in your property video.
          Include timing, locations, camera movements, and any overlays.
        </p>
      </div>

      {/* Input Mode Toggle */}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'text' | 'table')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" className="gap-2">
            <AlignLeft className="w-4 h-4" />
            Free-form Script
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <Table className="w-4 h-4" />
            Structured Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-4">
          <div className="space-y-2">
            <Textarea
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              placeholder="Describe your video timeline..."
              className="min-h-[200px] font-mono text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onScriptChange(exampleScript)}
              className="text-xs"
            >
              Load example script
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-20">Time</th>
                  <th className="px-3 py-2 text-left w-20">Duration</th>
                  <th className="px-3 py-2 text-left">Action Description</th>
                </tr>
              </thead>
              <tbody>
                {/* Parse script into table rows or show empty state */}
                <tr className="border-t">
                  <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                    Table input coming soon. Use free-form text for now.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Aspect Ratio</Label>
            <Select
              value={settings.aspectRatio}
              onValueChange={(v) =>
                onSettingsChange({ ...settings, aspectRatio: v as AspectRatioPreset })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="4:5">Instagram (4:5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Map Style</Label>
            <Select
              value={settings.mapStyle}
              onValueChange={(v) =>
                onSettingsChange({ ...settings, mapStyle: v as MapStyle })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satellite">Satellite</SelectItem>
                <SelectItem value="satellite-streets">Satellite + Streets</SelectItem>
                <SelectItem value="streets">Streets</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default Duration</Label>
            <Select
              value={settings.duration.toString()}
              onValueChange={(v) =>
                onSettingsChange({ ...settings, duration: parseInt(v) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={script.length < 10}>
          Parse with AI
          <Sparkles className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ===========================================
// Step 2: Processing
// ===========================================

interface ProcessingStepProps {
  isProcessing: boolean;
  progress: string;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

function ProcessingStep({
  isProcessing,
  progress,
  error,
  onRetry,
  onBack,
}: ProcessingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {error ? (
        <>
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Parsing Failed</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            {error}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Edit Script
            </Button>
            <Button onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Parsing Your Script</h3>
          <p className="text-sm text-muted-foreground text-center mb-2">
            {progress || 'Analyzing your video description...'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            Powered by Claude AI
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================
// Step 3: Review & Edit
// ===========================================

interface ReviewStepProps {
  parsedScript: ParsedScript | null;
  projectConfig: ProjectConfig | null;
  onConfigChange: (config: ProjectConfig) => void;
  onBack: () => void;
  onRegenerate: () => void;
  onCreate: () => void;
}

function ReviewStep({
  parsedScript,
  projectConfig,
  onConfigChange,
  onBack,
  onRegenerate,
  onCreate,
}: ReviewStepProps) {
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();

  if (!parsedScript || !projectConfig) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No data to review</p>
      </div>
    );
  }

  // Handle item updates
  const handleItemUpdate = (id: string, type: TimelineItemType, updates: Partial<TimelineTableItem>) => {
    const newConfig = { ...projectConfig };

    if (type === 'keyframe') {
      newConfig.keyframes = projectConfig.keyframes.map((kf) => {
        if (kf.id !== id) return kf;
        return {
          ...kf,
          name: updates.name ?? kf.name,
          time: updates.startTime ?? kf.time,
          duration: updates.duration ?? kf.duration,
        };
      });
    } else if (type === 'zone') {
      newConfig.zones = projectConfig.zones.map((zone) => {
        if (zone.id !== id) return zone;
        return {
          ...zone,
          name: updates.name ?? zone.name,
          timing: {
            ...zone.timing,
            startTime: updates.startTime ?? zone.timing.startTime,
            endTime: updates.endTime ?? zone.timing.endTime,
          },
        };
      });
    } else if (type === 'route') {
      newConfig.routes = projectConfig.routes.map((route) => {
        if (route.id !== id) return route;
        return {
          ...route,
          name: updates.name ?? route.name,
          timing: {
            ...route.timing,
            startTime: updates.startTime ?? route.timing.startTime,
            endTime: updates.endTime ?? route.timing.endTime,
          },
        };
      });
    } else if (type === 'textMarker') {
      newConfig.textMarkers = projectConfig.textMarkers.map((marker) => {
        if (marker.id !== id) return marker;
        return {
          ...marker,
          text: updates.name ?? marker.text,
          timing: {
            ...marker.timing,
            startTime: updates.startTime ?? marker.timing.startTime,
            endTime: updates.endTime ?? marker.timing.endTime,
          },
        };
      });
    }

    onConfigChange(newConfig);
  };

  // Handle item deletion
  const handleItemDelete = (id: string, type: TimelineItemType) => {
    const newConfig = { ...projectConfig };

    if (type === 'keyframe') {
      newConfig.keyframes = projectConfig.keyframes.filter((kf) => kf.id !== id);
    } else if (type === 'zone') {
      newConfig.zones = projectConfig.zones.filter((zone) => zone.id !== id);
    } else if (type === 'route') {
      newConfig.routes = projectConfig.routes.filter((route) => route.id !== id);
    } else if (type === 'textMarker') {
      newConfig.textMarkers = projectConfig.textMarkers.filter((marker) => marker.id !== id);
    }

    onConfigChange(newConfig);
    if (selectedItemId === id) {
      setSelectedItemId(undefined);
    }
  };

  // Handle item selection
  const handleItemSelect = (id: string, _type: TimelineItemType) => {
    setSelectedItemId(id === selectedItemId ? undefined : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review Your Project</h2>
          <p className="text-sm text-muted-foreground">
            Review and edit the generated timeline before creating your project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="text-lg font-semibold">
            {formatSecondsToTime(parsedScript.settings.totalDuration)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Camera Shots</p>
          <p className="text-lg font-semibold">{projectConfig.keyframes.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Zones</p>
          <p className="text-lg font-semibold">{projectConfig.zones.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Routes</p>
          <p className="text-lg font-semibold">{projectConfig.routes.length}</p>
        </Card>
      </div>

      {/* Timeline Table */}
      <TimelineTable
        keyframes={projectConfig.keyframes}
        zones={projectConfig.zones}
        routes={projectConfig.routes}
        textMarkers={projectConfig.textMarkers}
        totalDuration={projectConfig.settings.duration}
        editable={true}
        selectedItemId={selectedItemId}
        onItemSelect={handleItemSelect}
        onItemUpdate={handleItemUpdate}
        onItemDelete={handleItemDelete}
      />

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Script
        </Button>
        <Button onClick={onCreate}>
          Create Project
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ===========================================
// Step 4: Success
// ===========================================

interface SuccessStepProps {
  projectId: string | null;
  projectName: string;
  onOpenEditor: () => void;
  onContinueEditing: () => void;
  onCreateAnother: () => void;
}

function SuccessStep({
  projectId,
  projectName,
  onOpenEditor,
  onContinueEditing,
  onCreateAnother,
}: SuccessStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Project Created!</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
        Your project "{projectName}" has been created successfully. What would you like to do next?
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={onOpenEditor} className="w-full">
          <ArrowRight className="w-4 h-4 mr-2" />
          Open in Editor
        </Button>
        <Button variant="outline" onClick={onContinueEditing} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Editing Timeline
        </Button>
        <Button variant="ghost" onClick={onCreateAnother} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Create Another Project
        </Button>
      </div>
    </div>
  );
}

// ===========================================
// Main Component
// ===========================================

export function AIProjectGenerator({
  open,
  onOpenChange,
  onProjectCreated,
}: AIProjectGeneratorProps) {
  const router = useRouter();

  // State
  const [step, setStep] = React.useState<WizardStep>('input');
  const [script, setScript] = React.useState('');
  const [settings, setSettings] = React.useState({
    aspectRatio: '16:9' as AspectRatioPreset,
    mapStyle: 'satellite' as MapStyle,
    duration: 30,
  });
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [parsedScript, setParsedScript] = React.useState<ParsedScript | null>(null);
  const [projectConfig, setProjectConfig] = React.useState<ProjectConfig | null>(null);
  const [createdProjectId, setCreatedProjectId] = React.useState<string | null>(null);

  // tRPC mutation for creating project
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      setCreatedProjectId(project.id);
      onProjectCreated?.(project.id);
      setStep('success');
    },
    onError: (error) => {
      setError(error.message);
      setStep('review');
    },
  });

  // Parse script with AI
  const parseWithAI = async () => {
    setStep('processing');
    setIsProcessing(true);
    setError(null);
    setProgress('Sending script to AI...');

    try {
      const response = await fetch('/api/ai/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          options: {
            defaultDuration: settings.duration,
            aspectRatio: settings.aspectRatio,
            mapStyle: settings.mapStyle,
            streaming: false,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse script');
      }

      setProgress('Processing timeline...');
      const parsedData = data.data as ParsedScript;
      setParsedScript(parsedData);

      // Extract and geocode all locations
      setProgress('Geocoding locations...');
      const locations = extractLocations(parsedData);
      console.log('[AI Generator] Extracted locations:', locations);

      const geocodedLocations = await geocodeAllLocations(locations, setProgress);
      console.log('[AI Generator] Geocoded locations:', Array.from(geocodedLocations.entries()));

      // Convert to ProjectConfig with geocoded coordinates
      setProgress('Generating project configuration...');
      const config = convertToProjectConfig(parsedData, { geocodedLocations });
      setProjectConfig(config);

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create the project
  const handleCreate = () => {
    if (!projectConfig || !parsedScript) return;

    setStep('creating');
    createProject.mutate({
      name: parsedScript.title || 'AI Generated Project',
      description: parsedScript.description || script.slice(0, 200),
      config: projectConfig,
    });
  };

  // Reset wizard
  const handleClose = () => {
    setStep('input');
    setScript('');
    setParsedScript(null);
    setProjectConfig(null);
    setCreatedProjectId(null);
    setError(null);
    onOpenChange(false);
  };

  // Success step handlers
  const handleOpenEditor = () => {
    if (createdProjectId) {
      onOpenChange(false);
      router.push(`/editor/${createdProjectId}`);
    }
  };

  const handleContinueEditing = () => {
    setStep('review');
  };

  const handleCreateAnother = () => {
    setStep('input');
    setScript('');
    setParsedScript(null);
    setProjectConfig(null);
    setCreatedProjectId(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Project Generator
          </DialogTitle>
          <DialogDescription>
            Create a property video from a natural language description
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        {step === 'input' && (
          <ScriptInputStep
            script={script}
            onScriptChange={setScript}
            settings={settings}
            onSettingsChange={setSettings}
            onNext={parseWithAI}
          />
        )}

        {step === 'processing' && (
          <ProcessingStep
            isProcessing={isProcessing}
            progress={progress}
            error={error}
            onRetry={parseWithAI}
            onBack={() => setStep('input')}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            parsedScript={parsedScript}
            projectConfig={projectConfig}
            onConfigChange={setProjectConfig}
            onBack={() => setStep('input')}
            onRegenerate={parseWithAI}
            onCreate={handleCreate}
          />
        )}

        {step === 'creating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold">Creating Your Project</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we set everything up...
            </p>
          </div>
        )}

        {step === 'success' && (
          <SuccessStep
            projectId={createdProjectId}
            projectName={parsedScript?.title || 'AI Generated Project'}
            onOpenEditor={handleOpenEditor}
            onContinueEditing={handleContinueEditing}
            onCreateAnother={handleCreateAnother}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AIProjectGenerator;
