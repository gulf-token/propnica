/**
 * AI Parsing Schemas
 *
 * Zod schemas for AI-generated video script parsing.
 * These schemas define the structure that the AI should output.
 */

import { z } from 'zod';

// ===========================================
// Activity Types (What the AI should recognize)
// ===========================================

export const ActivityTypeSchema = z.enum([
  'camera',      // Camera movement/position
  'zone',        // Draw a zone/area
  'route',       // Draw a route/path
  'text',        // Show text/label
  'marker',      // Show a marker/pin
]);

export type ActivityType = z.infer<typeof ActivityTypeSchema>;

// ===========================================
// Camera Activity Schema
// ===========================================

export const CameraActivitySchema = z.object({
  type: z.literal('camera'),
  action: z.enum([
    'show',       // Show/display a location
    'zoom_in',    // Zoom in to location
    'zoom_out',   // Zoom out from location
    'pan',        // Pan to location
    'orbit',      // Orbit/rotate around location
    'tilt',       // Change pitch/tilt
    'fly_to',     // Fly to location
  ]),
  location: z.string().describe('Location name or description'),
  zoom: z.number().min(0).max(22).optional().describe('Zoom level 0-22'),
  bearing: z.number().min(0).max(360).optional().describe('Bearing 0-360 degrees'),
  pitch: z.number().min(0).max(85).optional().describe('Pitch 0-85 degrees'),
  orbitDegrees: z.number().optional().describe('Degrees to orbit (for orbit action)'),
});

// ===========================================
// Zone Activity Schema
// ===========================================

export const ZoneActivitySchema = z.object({
  type: z.literal('zone'),
  action: z.enum(['draw', 'highlight', 'show']),
  location: z.string().describe('Location/area name to highlight'),
  name: z.string().optional().describe('Display name for the zone'),
  colour: z.string().optional().describe('Colour description (e.g., "blue", "red", "#3B82F6")'),
  opacity: z.number().min(0).max(1).optional().describe('Fill opacity'),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
});

// ===========================================
// Route Activity Schema
// ===========================================

export const RouteActivitySchema = z.object({
  type: z.literal('route'),
  action: z.enum(['draw', 'show', 'animate']),
  from: z.string().describe('Starting location'),
  to: z.string().describe('Ending location'),
  waypoints: z.array(z.string()).optional().describe('Intermediate locations'),
  name: z.string().optional().describe('Route name'),
  colour: z.string().optional().describe('Route colour'),
  animated: z.boolean().optional().default(true),
  animationDuration: z.number().optional().describe('Animation duration in seconds'),
});

// ===========================================
// Text Activity Schema
// ===========================================

export const TextActivitySchema = z.object({
  type: z.literal('text'),
  action: z.enum(['show', 'appear', 'display']),
  text: z.string().describe('The text to display'),
  location: z.string().optional().describe('Location for the text'),
  style: z.object({
    colour: z.string().optional(),
    backgroundColour: z.string().optional(),
    fontSize: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
    position: z.enum(['top', 'centre', 'bottom']).optional(),
  }).optional(),
});

// ===========================================
// Marker Activity Schema
// ===========================================

export const MarkerActivitySchema = z.object({
  type: z.literal('marker'),
  action: z.enum(['show', 'place', 'add']),
  location: z.string().describe('Location for the marker'),
  label: z.string().optional().describe('Marker label'),
  icon: z.string().optional().describe('Icon type'),
  colour: z.string().optional(),
});

// ===========================================
// Combined Activity Schema
// ===========================================

export const ActivitySchema = z.discriminatedUnion('type', [
  CameraActivitySchema,
  ZoneActivitySchema,
  RouteActivitySchema,
  TextActivitySchema,
  MarkerActivitySchema,
]);

export type Activity = z.infer<typeof ActivitySchema>;

// ===========================================
// Timeline Item (Activity with timing)
// ===========================================

export const TimelineItemSchema = z.object({
  id: z.string().optional(),
  startTime: z.number().describe('Start time in seconds'),
  duration: z.number().optional().describe('Duration in seconds'),
  endTime: z.number().optional().describe('End time in seconds (alternative to duration)'),
  activity: ActivitySchema,
  description: z.string().optional().describe('Human-readable description'),
});

export type TimelineItem = z.infer<typeof TimelineItemSchema>;

// ===========================================
// Parsed Script (Complete AI Response)
// ===========================================

export const ParsedScriptSchema = z.object({
  title: z.string().optional().describe('Video title'),
  description: z.string().optional().describe('Video description'),
  settings: z.object({
    totalDuration: z.number().describe('Total video duration in seconds'),
    aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5', '21:9']).default('16:9'),
    mapStyle: z.enum([
      'satellite',
      'satellite-streets',
      'streets',
      'light',
      'dark',
      'outdoors',
    ]).default('satellite'),
    primaryLocation: z.string().optional().describe('Main location/city'),
  }),
  timeline: z.array(TimelineItemSchema).describe('List of timeline activities'),
  locations: z.array(z.object({
    name: z.string(),
    context: z.string().optional().describe('Additional context for geocoding'),
  })).optional().describe('All unique locations mentioned'),
});

export type ParsedScript = z.infer<typeof ParsedScriptSchema>;

// ===========================================
// Colour Parsing Helper
// ===========================================

const COLOUR_MAP: Record<string, string> = {
  // Basic colours
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  purple: '#A855F7',
  pink: '#EC4899',
  white: '#FFFFFF',
  black: '#000000',
  grey: '#6B7280',
  gray: '#6B7280',

  // Shades
  'light blue': '#93C5FD',
  'dark blue': '#1E3A8A',
  'light green': '#86EFAC',
  'dark green': '#166534',
  'light red': '#FCA5A5',
  'dark red': '#991B1B',

  // Descriptive
  transparent: 'transparent',
  'semi-transparent': 'rgba(0,0,0,0.5)',
};

export function parseColour(input: string): string {
  const normalized = input.toLowerCase().trim();

  // Already a hex code
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  // Already rgba
  if (normalized.startsWith('rgba') || normalized.startsWith('rgb')) {
    return normalized;
  }

  // Look up in colour map
  if (COLOUR_MAP[normalized]) {
    return COLOUR_MAP[normalized];
  }

  // Try to find partial match
  for (const [name, hex] of Object.entries(COLOUR_MAP)) {
    if (normalized.includes(name)) {
      return hex;
    }
  }

  // Default to blue
  return '#3B82F6';
}

// ===========================================
// Font Size Mapping
// ===========================================

export const FONT_SIZE_MAP: Record<string, number> = {
  small: 12,
  medium: 16,
  large: 24,
  xlarge: 32,
};

export function parseFontSize(input: string | number): number {
  if (typeof input === 'number') return input;
  return FONT_SIZE_MAP[input.toLowerCase()] ?? 16;
}
