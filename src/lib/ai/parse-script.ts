// @ts-nocheck
// TODO: Fix Zod parsing type safety - proper type assertions for parsed objects
/**
 * AI Script Parser
 *
 * Uses Anthropic Claude to parse natural language video scripts
 * into structured ProjectConfig data.
 */

import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { v4 as uuid } from 'uuid';
import {
  ParsedScriptSchema,
  ParsedScript,
  TimelineItem,
  parseColour,
  parseFontSize,
} from './schemas';
import { parseTimeToSeconds, calculateEndTime } from './time-parser';
import type {
  ProjectConfig,
  Keyframe,
  Zone,
  Route,
  TextMarker,
  CameraState,
  EasingType,
  MapStyle,
  AspectRatioPreset,
} from '@/types';

// ===========================================
// System Prompt for AI
// ===========================================

const SYSTEM_PROMPT = `You are a video script parser for a property showcase video platform called propNICA.

Your task is to extract structured timeline data from natural language video descriptions.

PARSING RULES:

1. TIME FORMATS - Convert all times to seconds:
   - "0:30" = 30 seconds
   - "1:15" = 75 seconds
   - "at 5 seconds" = 5
   - "after 10 seconds" = previous end time + 10
   - If no time given for first item, start at 0

2. DURATIONS:
   - "for 3 seconds" = 3
   - "over 5 seconds" = 5
   - If not specified, use reasonable defaults:
     - Camera movements: 3 seconds
     - Zone appearance: visible until end
     - Route animation: 2-4 seconds
     - Text: visible until end

3. CAMERA ACTIONS:
   - "show" / "display" / "open with" = show location
   - "zoom in" / "zoom to" = zoom_in action
   - "zoom out" = zoom_out action
   - "pan to" / "move to" = pan action
   - "orbit" / "circle" / "rotate around" = orbit action
   - "tilt" / "change angle" = tilt action

4. ZONES:
   - "draw zone" / "highlight area" / "outline" = zone
   - Extract colour from description
   - "semi-transparent" = 0.3-0.5 opacity
   - "solid" = 0.8-1.0 opacity

5. ROUTES:
   - "draw line from X to Y" = route
   - "path from X to Y" = route
   - "animated" = animated: true
   - Extract animation duration if mentioned

6. TEXT:
   - "show text" / "display label" / "text appears" = text
   - Extract the actual text content in quotes or after "saying"
   - "white with black outline" = white text with dark background

7. ASPECT RATIOS:
   - "portrait" / "vertical" / "TikTok" / "Reels" = 9:16
   - "landscape" / "horizontal" / "YouTube" = 16:9
   - "square" / "Instagram" = 1:1

8. LOCATIONS:
   - Preserve exact location names for geocoding
   - Include city/country context when mentioned
   - "Bay Square, Dubai" not just "Bay Square"

Always output complete timeline with all activities, sorted by start time.`;

// ===========================================
// Main Parse Function
// ===========================================

export interface ParseScriptOptions {
  defaultDuration?: number;
  defaultAspectRatio?: AspectRatioPreset;
  defaultMapStyle?: MapStyle;
}

export async function parseScript(
  script: string,
  options: ParseScriptOptions = {}
): Promise<ParsedScript> {
  const {
    defaultDuration = 30,
    defaultAspectRatio = '16:9',
    defaultMapStyle = 'satellite',
  } = options;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20241022'),
    schema: ParsedScriptSchema,
    system: SYSTEM_PROMPT,
    prompt: `Parse this video script into a structured timeline:

${script}

Default settings if not specified:
- Total duration: ${defaultDuration} seconds
- Aspect ratio: ${defaultAspectRatio}
- Map style: ${defaultMapStyle}`,
  });

  return object;
}

// ===========================================
// Convert to ProjectConfig
// ===========================================

export interface GeocodedLocation {
  name: string;
  coordinates: [number, number];
  confidence: number;
}

export interface ConversionOptions {
  geocodedLocations?: Map<string, GeocodedLocation>;
  defaultCoordinates?: [number, number];
}

export function convertToProjectConfig(
  parsed: ParsedScript,
  options: ConversionOptions = {}
): ProjectConfig {
  const {
    geocodedLocations = new Map(),
    defaultCoordinates = [55.2708, 25.2048], // Dubai
  } = options;

  const totalDuration = parsed.settings.totalDuration;

  // Helper to get coordinates for a location
  const getCoordinates = (location: string): [number, number] => {
    const geocoded = geocodedLocations.get(location);
    if (geocoded) return geocoded.coordinates;

    // Try partial match
    for (const [name, data] of geocodedLocations.entries()) {
      if (
        location.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(location.toLowerCase())
      ) {
        return data.coordinates;
      }
    }

    return defaultCoordinates;
  };

  // Process timeline items into different element types
  const keyframes: Keyframe[] = [];
  const zones: Zone[] = [];
  const routes: Route[] = [];
  const textMarkers: TextMarker[] = [];

  for (const item of parsed.timeline) {
    const startTime = item.startTime;
    const endTime =
      item.endTime ?? (item.duration ? startTime + item.duration : totalDuration);

    switch (item.activity.type) {
      case 'camera':
        keyframes.push(convertCameraActivity(item, getCoordinates, totalDuration));
        break;

      case 'zone':
        zones.push(convertZoneActivity(item, getCoordinates, endTime, totalDuration));
        break;

      case 'route':
        routes.push(convertRouteActivity(item, getCoordinates, endTime, totalDuration));
        break;

      case 'text':
      case 'marker':
        textMarkers.push(
          convertTextActivity(item, getCoordinates, endTime, totalDuration)
        );
        break;
    }
  }

  // Ensure we have at least one keyframe
  if (keyframes.length === 0) {
    keyframes.push({
      id: uuid(),
      name: 'Initial View',
      time: 0,
      duration: totalDuration,
      camera: {
        centre: defaultCoordinates,
        zoom: 14,
        bearing: 0,
        pitch: 45,
      },
      easing: 'easeInOutCubic',
    });
  }

  return {
    version: '1.0.0',
    settings: {
      duration: totalDuration,
      fps: 30,
      resolution: '1080p',
      aspectRatio: parsed.settings.aspectRatio,
    },
    mapSettings: {
      style: parsed.settings.mapStyle,
    },
    keyframes,
    zones,
    routes,
    textMarkers,
    branding: {
      colours: {
        primary: '#1E3A8A',
        secondary: '#3B82F6',
        accent: '#F59E0B',
      },
    },
  };
}

// ===========================================
// Individual Converters
// ===========================================

function convertCameraActivity(
  item: TimelineItem,
  getCoordinates: (loc: string) => [number, number],
  totalDuration: number
): Keyframe {
  const activity = item.activity;
  if (activity.type !== 'camera') throw new Error('Not a camera activity');

  const coordinates = getCoordinates(activity.location);
  const duration = item.duration ?? 3;

  // Calculate camera settings based on action
  let zoom = activity.zoom ?? 14;
  let bearing = activity.bearing ?? 0;
  let pitch = activity.pitch ?? 45;

  switch (activity.action) {
    case 'zoom_in':
      zoom = activity.zoom ?? 16;
      break;
    case 'zoom_out':
      zoom = activity.zoom ?? 12;
      break;
    case 'orbit':
      // For orbit, we need to track the rotation
      bearing = activity.orbitDegrees ?? 360;
      break;
    case 'tilt':
      pitch = activity.pitch ?? 60;
      break;
    case 'fly_to':
      zoom = activity.zoom ?? 15;
      pitch = 50;
      break;
  }

  return {
    id: uuid(),
    name: item.description ?? `${activity.action} - ${activity.location}`,
    time: item.startTime,
    duration,
    camera: {
      centre: coordinates,
      zoom,
      bearing,
      pitch,
    },
    easing: 'easeInOutCubic' as EasingType,
  };
}

function convertZoneActivity(
  item: TimelineItem,
  getCoordinates: (loc: string) => [number, number],
  endTime: number,
  totalDuration: number
): Zone {
  const activity = item.activity;
  if (activity.type !== 'zone') throw new Error('Not a zone activity');

  const coordinates = getCoordinates(activity.location);
  const fillColour = parseColour(activity.colour ?? 'blue');
  const fillOpacity = activity.opacity ?? 0.35;

  // Create a simple polygon around the coordinates
  // In production, this would come from geocoding polygon data
  const offset = 0.003; // ~300m offset
  const polygon: [number, number][] = [
    [coordinates[0] - offset, coordinates[1] + offset],
    [coordinates[0] + offset, coordinates[1] + offset],
    [coordinates[0] + offset, coordinates[1] - offset],
    [coordinates[0] - offset, coordinates[1] - offset],
    [coordinates[0] - offset, coordinates[1] + offset], // Close polygon
  ];

  return {
    id: uuid(),
    name: activity.name ?? activity.location,
    coordinates: polygon,
    style: {
      fillColour,
      fillOpacity,
      strokeColour: fillColour,
      strokeWidth: 3,
      strokeOpacity: 1,
    },
    label: {
      text: activity.name ?? activity.location,
      fontSize: 14,
      fontColour: '#FFFFFF',
      visible: false,
    },
    timing: {
      startTime: item.startTime,
      endTime: Math.min(endTime, totalDuration),
      fadeInDuration: 1,
      fadeOutDuration: 1,
    },
  };
}

function convertRouteActivity(
  item: TimelineItem,
  getCoordinates: (loc: string) => [number, number],
  endTime: number,
  totalDuration: number
): Route {
  const activity = item.activity;
  if (activity.type !== 'route') throw new Error('Not a route activity');

  const fromCoords = getCoordinates(activity.from);
  const toCoords = getCoordinates(activity.to);

  // Build route coordinates
  const coordinates: [number, number][] = [fromCoords];

  // Add waypoints if any
  if (activity.waypoints) {
    for (const wp of activity.waypoints) {
      coordinates.push(getCoordinates(wp));
    }
  }

  coordinates.push(toCoords);

  const colour = parseColour(activity.colour ?? 'red');
  const animationDuration = activity.animationDuration ?? item.duration ?? 4;

  return {
    id: uuid(),
    name: activity.name ?? `${activity.from} to ${activity.to}`,
    coordinates,
    style: {
      colour,
      width: 5,
      opacity: 1,
      dashPattern: 'solid',
      outlineColour: '#FFFFFF',
      outlineWidth: 2,
      outlineOpacity: 0.8,
    },
    label: {
      text: activity.name ?? 'Route',
      visible: false,
    },
    animation: {
      type: activity.animated !== false ? 'draw' : 'none',
      duration: animationDuration,
    },
    animationConfig: {
      drawEnabled: activity.animated !== false,
      drawDuration: animationDuration,
      drawStyle: 'solid',
      drawDirection: 'startToEnd',
      drawEasing: 'easeInOutCubic',
      trailEnabled: true,
      trailColour: colour,
      trailLength: 0.3,
      glowEnabled: true,
      glowColour: colour,
      glowIntensity: 0.5,
      pulseEnabled: false,
      pulseDuration: 1.5,
    },
    timing: {
      startTime: item.startTime,
      endTime: Math.min(endTime, totalDuration),
      fadeInDuration: 0,
      fadeOutDuration: 1,
    },
  };
}

function convertTextActivity(
  item: TimelineItem,
  getCoordinates: (loc: string) => [number, number],
  endTime: number,
  totalDuration: number
): TextMarker {
  const activity = item.activity;

  let text = '';
  let location = '';

  if (activity.type === 'text') {
    text = activity.text;
    location = activity.location ?? '';
  } else if (activity.type === 'marker') {
    text = activity.label ?? '';
    location = activity.location;
  }

  const coordinates = location ? getCoordinates(location) : [0, 0] as [number, number];

  // Parse style
  let fontColour = '#FFFFFF';
  let backgroundColour = 'rgba(0,0,0,0.6)';
  let fontSize = 24;

  if (activity.type === 'text' && activity.style) {
    if (activity.style.colour) {
      fontColour = parseColour(activity.style.colour);
    }
    if (activity.style.backgroundColour) {
      backgroundColour = parseColour(activity.style.backgroundColour);
    }
    if (activity.style.fontSize) {
      fontSize = parseFontSize(activity.style.fontSize);
    }
  }

  return {
    id: uuid(),
    position: coordinates,
    text,
    style: {
      fontFamily: 'Inter',
      fontSize,
      fontColour,
      fontWeight: 'bold',
      backgroundColour,
      backgroundOpacity: 1,
      padding: 12,
      borderRadius: 8,
      borderColour: '#000000',
      borderWidth: 2,
    },
    animationConfig: {
      entryAnimation: 'scaleUp',
      entryDuration: 0.5,
      entryEasing: 'easeOutBack',
      exitType: 'fadeOut',
      exitDuration: 0.5,
      exitEasing: 'easeInCubic',
    },
    timing: {
      startTime: item.startTime,
      endTime: Math.min(endTime, totalDuration),
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5,
    },
  };
}

// ===========================================
// Export all locations for geocoding
// ===========================================

export function extractLocations(parsed: ParsedScript): string[] {
  const locations = new Set<string>();

  for (const item of parsed.timeline) {
    const activity = item.activity;

    switch (activity.type) {
      case 'camera':
        locations.add(activity.location);
        break;
      case 'zone':
        locations.add(activity.location);
        break;
      case 'route':
        locations.add(activity.from);
        locations.add(activity.to);
        activity.waypoints?.forEach((wp) => locations.add(wp));
        break;
      case 'text':
        if (activity.location) locations.add(activity.location);
        break;
      case 'marker':
        locations.add(activity.location);
        break;
    }
  }

  // Add any explicitly listed locations
  parsed.locations?.forEach((loc) => locations.add(loc.name));

  return Array.from(locations).filter(Boolean);
}
