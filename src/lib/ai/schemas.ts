/**
 * AI Parsing Schemas
 *
 * Zod schemas for AI-generated video script parsing.
 * These schemas define the structure that the AI should output.
 * Made lenient to handle variations in AI output.
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
  action: z.string().transform((val) => {
    // Normalize action names
    const normalized = val.toLowerCase().replace(/[_-]/g, '_');
    const valid = ['show', 'zoom_in', 'zoom_out', 'pan', 'orbit', 'tilt', 'fly_to'];
    if (valid.includes(normalized)) return normalized;
    if (normalized.includes('zoom') && normalized.includes('in')) return 'zoom_in';
    if (normalized.includes('zoom') && normalized.includes('out')) return 'zoom_out';
    if (normalized.includes('fly')) return 'fly_to';
    return 'show'; // Default
  }),
  location: z.string(),
  zoom: z.number().optional(),
  bearing: z.number().optional(),
  pitch: z.number().optional(),
  orbitDegrees: z.number().optional(),
}).passthrough();

// ===========================================
// Zone Activity Schema
// ===========================================

export const ZoneActivitySchema = z.object({
  type: z.literal('zone'),
  action: z.string().transform((val) => {
    const normalized = val.toLowerCase();
    if (['draw', 'highlight', 'show'].includes(normalized)) return normalized;
    return 'draw';
  }),
  location: z.string(),
  name: z.string().optional(),
  colour: z.string().optional(),
  color: z.string().optional(), // US spelling
  opacity: z.number().optional(),
  style: z.string().optional(),
}).passthrough().transform((data) => ({
  ...data,
  colour: data.colour || data.color, // Normalize to UK spelling
}));

// ===========================================
// Route Activity Schema
// ===========================================

export const RouteActivitySchema = z.object({
  type: z.literal('route'),
  action: z.string().transform((val) => {
    const normalized = val.toLowerCase();
    if (['draw', 'show', 'animate'].includes(normalized)) return normalized;
    return 'draw';
  }),
  from: z.string(),
  to: z.string(),
  waypoints: z.array(z.string()).optional(),
  name: z.string().optional(),
  colour: z.string().optional(),
  color: z.string().optional(),
  animated: z.boolean().optional().default(true),
  animationDuration: z.number().optional(),
}).passthrough().transform((data) => ({
  ...data,
  colour: data.colour || data.color,
}));

// ===========================================
// Text Activity Schema
// ===========================================

export const TextActivitySchema = z.object({
  type: z.literal('text'),
  action: z.string().transform((val) => {
    const normalized = val.toLowerCase();
    if (['show', 'appear', 'display'].includes(normalized)) return normalized;
    return 'show';
  }),
  text: z.string(),
  content: z.string().optional(), // Alternative field name
  location: z.string().optional(),
  style: z.object({
    colour: z.string().optional(),
    color: z.string().optional(),
    backgroundColour: z.string().optional(),
    backgroundColor: z.string().optional(),
    fontSize: z.string().optional(),
    position: z.string().optional(),
  }).optional(),
}).passthrough().transform((data) => ({
  ...data,
  text: data.text || data.content || '',
}));

// ===========================================
// Marker Activity Schema
// ===========================================

export const MarkerActivitySchema = z.object({
  type: z.literal('marker'),
  action: z.string().transform((val) => {
    const normalized = val.toLowerCase();
    if (['show', 'place', 'add'].includes(normalized)) return normalized;
    return 'show';
  }),
  location: z.string(),
  label: z.string().optional(),
  icon: z.string().optional(),
  colour: z.string().optional(),
  color: z.string().optional(),
}).passthrough().transform((data) => ({
  ...data,
  colour: data.colour || data.color,
}));

// ===========================================
// Combined Activity Schema (Lenient)
// ===========================================

// Use a union with type checking instead of discriminatedUnion for flexibility
export const ActivitySchema = z.union([
  CameraActivitySchema,
  ZoneActivitySchema,
  RouteActivitySchema,
  TextActivitySchema,
  MarkerActivitySchema,
]).or(
  // Fallback: accept any object with a type field
  z.object({
    type: z.string(),
  }).passthrough()
);

export type Activity = z.infer<typeof ActivitySchema>;

// ===========================================
// Timeline Item (Activity with timing)
// ===========================================

export const TimelineItemSchema = z.object({
  id: z.string().optional(),
  startTime: z.number().default(0),
  start_time: z.number().optional(), // snake_case alternative
  duration: z.number().optional(),
  endTime: z.number().optional(),
  end_time: z.number().optional(), // snake_case alternative
  activity: ActivitySchema,
  description: z.string().optional(),
}).passthrough().transform((data) => ({
  ...data,
  startTime: data.startTime ?? data.start_time ?? 0,
  endTime: data.endTime ?? data.end_time,
}));

export type TimelineItem = z.infer<typeof TimelineItemSchema>;

// ===========================================
// Settings Schema
// ===========================================

export const SettingsSchema = z.object({
  totalDuration: z.number().optional(),
  total_duration: z.number().optional(), // snake_case
  duration: z.number().optional(), // alternative
  aspectRatio: z.string().optional().default('16:9'),
  aspect_ratio: z.string().optional(),
  mapStyle: z.string().optional().default('satellite'),
  map_style: z.string().optional(),
  primaryLocation: z.string().optional(),
  primary_location: z.string().optional(),
}).passthrough().transform((data) => ({
  totalDuration: data.totalDuration ?? data.total_duration ?? data.duration ?? 30,
  aspectRatio: data.aspectRatio ?? data.aspect_ratio ?? '16:9',
  mapStyle: data.mapStyle ?? data.map_style ?? 'satellite',
  primaryLocation: data.primaryLocation ?? data.primary_location,
}));

// ===========================================
// Parsed Script (Complete AI Response)
// ===========================================

export const ParsedScriptSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  settings: SettingsSchema,
  timeline: z.array(TimelineItemSchema),
  locations: z.array(z.object({
    name: z.string(),
    context: z.string().optional(),
  })).optional(),
}).passthrough();

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
