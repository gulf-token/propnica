// ===========================================
// propNICA Type Definitions
// ===========================================

import { LngLatLike } from 'mapbox-gl';

// ===========================================
// Project Configuration Types
// ===========================================

export interface ProjectConfig {
  version: string;
  settings: ProjectSettings;
  mapSettings: MapSettings;
  keyframes: Keyframe[];
  zones: Zone[];
  routes: Route[];
  textMarkers: TextMarker[];
  branding: BrandingConfig;
}

export interface ProjectSettings {
  duration: number;
  fps: number;
  resolution: ResolutionPreset;
  aspectRatio: AspectRatioPreset;
}

export interface MapSettings {
  style: MapStyle;
  accessToken?: string;
  customLayers?: CustomMapLayer[];
}

// Map Styles - Built-in Mapbox styles
export type MapStyle =
  | 'satellite'
  | 'satellite-streets'
  | 'streets'
  | 'light'
  | 'dark'
  | 'outdoors'
  | 'terrain';

export const MAP_STYLE_URLS: Record<MapStyle, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  terrain: 'mapbox://styles/mapbox/satellite-streets-v12', // Terrain uses satellite with terrain layer
};

export const MAP_STYLE_LABELS: Record<MapStyle, string> = {
  satellite: 'Satellite',
  'satellite-streets': 'Satellite + Streets',
  streets: 'Streets',
  light: 'Light',
  dark: 'Dark',
  outdoors: 'Outdoors',
  terrain: 'Terrain 3D',
};

// Custom Map Layers (for external data sources)
export interface CustomMapLayer {
  id: string;
  name: string;
  type: 'geojson' | 'vector' | 'raster' | 'wms';
  url: string;
  visible: boolean;
  opacity: number;
  sourceLayer?: string; // For vector tiles
  minZoom?: number;
  maxZoom?: number;
}

// Aspect Ratio Presets
export type AspectRatioPreset =
  | '16:9'    // Landscape HD/YouTube
  | '9:16'    // Portrait/TikTok/Reels
  | '4:3'     // Classic
  | '3:4'     // Portrait Classic
  | '1:1'     // Square/Instagram
  | '21:9'    // Ultrawide/Cinematic
  | '4:5'     // Instagram Portrait
  | '2:3'     // Portrait Photo
  | 'custom';

export interface AspectRatioConfig {
  width: number;
  height: number;
  label: string;
  category: 'landscape' | 'portrait' | 'square' | 'cinematic';
}

export const ASPECT_RATIO_PRESETS: Record<Exclude<AspectRatioPreset, 'custom'>, AspectRatioConfig> = {
  '16:9': { width: 16, height: 9, label: 'Landscape (16:9)', category: 'landscape' },
  '9:16': { width: 9, height: 16, label: 'Portrait (9:16)', category: 'portrait' },
  '4:3': { width: 4, height: 3, label: 'Classic (4:3)', category: 'landscape' },
  '3:4': { width: 3, height: 4, label: 'Portrait Classic (3:4)', category: 'portrait' },
  '1:1': { width: 1, height: 1, label: 'Square (1:1)', category: 'square' },
  '21:9': { width: 21, height: 9, label: 'Cinematic (21:9)', category: 'cinematic' },
  '4:5': { width: 4, height: 5, label: 'Instagram Portrait (4:5)', category: 'portrait' },
  '2:3': { width: 2, height: 3, label: 'Photo Portrait (2:3)', category: 'portrait' },
};

// Resolution Quality (combined with aspect ratio for final dimensions)
export type ResolutionPreset = '720p' | '1080p' | '4k';

export interface ResolutionConfig {
  width: number;
  height: number;
  bitrate: string;
  label: string;
}

// Base resolutions for 16:9 - actual dimensions calculated based on aspect ratio
export const RESOLUTION_PRESETS: Record<ResolutionPreset, ResolutionConfig> = {
  '720p': { width: 1280, height: 720, bitrate: '5M', label: 'HD 720p' },
  '1080p': { width: 1920, height: 1080, bitrate: '10M', label: 'Full HD 1080p' },
  '4k': { width: 3840, height: 2160, bitrate: '35M', label: '4K UHD' },
};

// Calculate actual resolution based on aspect ratio and quality
export function calculateResolution(
  aspectRatio: AspectRatioPreset,
  quality: ResolutionPreset
): { width: number; height: number } {
  const baseRes = RESOLUTION_PRESETS[quality] ?? RESOLUTION_PRESETS['1080p'];

  if (aspectRatio === 'custom' || !aspectRatio) {
    return { width: baseRes.width, height: baseRes.height };
  }

  const ratio = ASPECT_RATIO_PRESETS[aspectRatio as Exclude<AspectRatioPreset, 'custom'>];

  // Fallback to 16:9 if aspect ratio not found
  if (!ratio) {
    return { width: baseRes.width, height: baseRes.height };
  }

  const isLandscape = ratio.width >= ratio.height;

  // Calculate dimensions maintaining the target quality
  if (isLandscape) {
    // For landscape, height is the limiting factor
    const height = baseRes.height;
    const width = Math.round((height * ratio.width) / ratio.height);
    return { width, height };
  } else {
    // For portrait, width is the limiting factor
    const width = baseRes.height; // Use height as width for portrait
    const height = Math.round((width * ratio.height) / ratio.width);
    return { width, height };
  }
}

// ===========================================
// Keyframe Types
// ===========================================

export interface Keyframe {
  id: string;
  name: string;
  time: number;
  duration: number;
  camera: CameraState;
  easing: EasingType;
  mapStyle?: MapStyle; // Optional style change at this keyframe
}

export interface CameraState {
  centre: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

// Calculate total duration from keyframes
// Duration = max(keyframe.time + keyframe.duration) for all keyframes
export function calculateDurationFromKeyframes(keyframes: Keyframe[]): number {
  if (!keyframes || keyframes.length === 0) {
    return 10; // Minimum default duration
  }

  const maxEndTime = keyframes.reduce((max, kf) => {
    const endTime = kf.time + kf.duration;
    return endTime > max ? endTime : max;
  }, 0);

  // Ensure minimum of 5 seconds, round up to nearest second
  return Math.max(5, Math.ceil(maxEndTime));
}

export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo';

export const EASING_TYPES: EasingType[] = [
  'linear',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeInQuart',
  'easeOutQuart',
  'easeInOutQuart',
  'easeInExpo',
  'easeOutExpo',
  'easeInOutExpo',
];

// ===========================================
// Zone Types
// ===========================================

export interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: ZoneStyle;
  label: ZoneLabel;
  animationConfig?: ZoneAnimationConfig; // Advanced animation settings
  timing: ElementTiming;
}

export interface ZoneStyle {
  fillColour: string;
  fillOpacity: number;
  strokeColour: string;
  strokeWidth: number;
  strokeOpacity: number;
  rotation?: number; // degrees, 0-360
}

export interface ZoneLabel {
  text: string;
  fontSize: number;
  fontColour: string;
  visible: boolean;
}

// ===========================================
// Route Types
// ===========================================

export interface Route {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: RouteStyle;
  label: RouteLabel;
  animation: RouteAnimation;
  animationConfig?: RouteAnimationConfig; // Advanced animation settings
  timing: ElementTiming;
}

export interface RouteStyle {
  colour: string;
  width: number;
  opacity: number;
  dashPattern: 'solid' | 'dashed' | 'dotted';
  // Outline/casing for better visibility on satellite maps
  outlineColour?: string;
  outlineWidth?: number;
  outlineOpacity?: number;
  rotation?: number; // degrees, 0-360
}

export interface RouteLabel {
  text: string;
  travelTime?: string;
  distance?: string;
  visible: boolean;
}

export interface RouteAnimation {
  type: 'none' | 'draw' | 'pulse';
  duration: number;
}

// ===========================================
// Animation Types (for professional renders)
// ===========================================

// Entry animation types
export type EntryAnimationType =
  | 'instant'      // Appears immediately
  | 'fadeIn'       // Simple fade in
  | 'scaleUp'      // Scale from 0 to 100%
  | 'scaleDown'    // Scale from large to normal
  | 'slideUp'      // Slide from below
  | 'slideDown'    // Slide from above
  | 'slideLeft'    // Slide from right
  | 'slideRight'   // Slide from left
  | 'wipeLeft'     // Wipe reveal from left
  | 'wipeRight'    // Wipe reveal from right
  | 'wipeUp'       // Wipe reveal from bottom
  | 'wipeDown'     // Wipe reveal from top
  | 'zoomIn'       // Zoom from far to normal
  | 'bounce'       // Bouncy scale effect
  | 'elastic';     // Elastic/spring effect

// Exit animation types
export type ExitAnimationType =
  | 'instant'      // Disappears immediately
  | 'fadeOut'      // Simple fade out
  | 'scaleUp'      // Scale from normal to large (zoom out)
  | 'scaleDown'    // Scale from normal to 0
  | 'slideUp'      // Slide up and out
  | 'slideDown'    // Slide down and out
  | 'slideLeft'    // Slide left and out
  | 'slideRight'   // Slide right and out
  | 'wipeLeft'     // Wipe hide to left
  | 'wipeRight'    // Wipe hide to right
  | 'wipeUp'       // Wipe hide to top
  | 'wipeDown'     // Wipe hide to bottom
  | 'zoomOut';     // Zoom away from normal

// Animation easing types
export type AnimationEasing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce';

// Route-specific animation types
export type RouteDrawStyle =
  | 'solid'        // Draws as a solid line
  | 'dashed'       // Draws with animated dashes
  | 'dotted'       // Draws with animated dots
  | 'gradient';    // Draws with color gradient trail

export type RouteDrawDirection =
  | 'startToEnd'   // Normal direction
  | 'endToStart'   // Reverse direction
  | 'middle'       // Draw from middle outward
  | 'both';        // Draw from both ends to middle

// Zone-specific animation types
export type ZoneFillAnimation =
  | 'instant'      // Fill appears instantly
  | 'fadeIn'       // Fill fades in
  | 'expandCenter' // Fill expands from center
  | 'expandEdge'   // Fill expands from edge
  | 'wipeLeft'     // Fill wipes from left
  | 'wipeRight'    // Fill wipes from right
  | 'wipeUp'       // Fill wipes from bottom
  | 'wipeDown'     // Fill wipes from top
  | 'reveal';      // Progressive reveal

export type ZoneStrokeAnimation =
  | 'instant'      // Stroke appears instantly
  | 'draw'         // Stroke draws around perimeter
  | 'dashMove';    // Animated moving dashes

// Text-specific animation types
export type TextEntryAnimation =
  | 'instant'      // Appears instantly
  | 'fadeIn'       // Simple fade
  | 'typewriter'   // Character by character
  | 'wordByWord'   // Word by word reveal
  | 'scaleUp'      // Scale from small
  | 'slideUp'      // Slide from below
  | 'bounce'       // Bouncy entrance
  | 'blur';        // Blur to clear

// Animation configuration for elements
export interface ElementAnimation {
  entryType: EntryAnimationType;
  entryDuration: number;        // seconds
  entryEasing: AnimationEasing;
  entryDelay: number;           // seconds delay after startTime
  exitType: ExitAnimationType;
  exitDuration: number;         // seconds
  exitEasing: AnimationEasing;
}

// Extended route animation config
export interface RouteAnimationConfig {
  drawEnabled: boolean;
  drawDuration: number;         // seconds
  drawStyle: RouteDrawStyle;
  drawDirection: RouteDrawDirection;
  drawEasing: AnimationEasing;
  trailEnabled: boolean;
  trailColour: string;
  trailLength: number;          // 0-1, portion of route as trail
  glowEnabled: boolean;
  glowColour: string;
  glowIntensity: number;        // 0-1
  pulseEnabled: boolean;
  pulseDuration: number;        // seconds per pulse cycle
}

// Zone animation config
export interface ZoneAnimationConfig {
  fillAnimation: ZoneFillAnimation;
  fillDuration: number;
  fillEasing: AnimationEasing;
  strokeAnimation: ZoneStrokeAnimation;
  strokeDuration: number;
  strokeEasing: AnimationEasing;
  pulseEnabled: boolean;
  pulseDuration: number;
}

// Text marker animation config
export interface TextMarkerAnimationConfig {
  entryAnimation: TextEntryAnimation;
  entryDuration: number;
  entryEasing: AnimationEasing;
  exitType: ExitAnimationType;
  exitDuration: number;
  exitEasing: AnimationEasing;
}

// Default animation configs
export const DEFAULT_ELEMENT_ANIMATION: ElementAnimation = {
  entryType: 'fadeIn',
  entryDuration: 0.5,
  entryEasing: 'easeOutCubic',
  entryDelay: 0,
  exitType: 'fadeOut',
  exitDuration: 0.5,
  exitEasing: 'easeInCubic',
};

export const DEFAULT_ROUTE_ANIMATION_CONFIG: RouteAnimationConfig = {
  drawEnabled: true,
  drawDuration: 2,
  drawStyle: 'solid',
  drawDirection: 'startToEnd',
  drawEasing: 'easeInOutCubic',
  trailEnabled: false,
  trailColour: '#FFFFFF',
  trailLength: 0.2,
  glowEnabled: false,
  glowColour: '#FFFFFF',
  glowIntensity: 0.5,
  pulseEnabled: false,
  pulseDuration: 1.5,
};

export const DEFAULT_ZONE_ANIMATION_CONFIG: ZoneAnimationConfig = {
  fillAnimation: 'fadeIn',
  fillDuration: 0.5,
  fillEasing: 'easeOutCubic',
  strokeAnimation: 'instant',
  strokeDuration: 0.5,
  strokeEasing: 'easeOutCubic',
  pulseEnabled: false,
  pulseDuration: 2,
};

export const DEFAULT_TEXT_MARKER_ANIMATION_CONFIG: TextMarkerAnimationConfig = {
  entryAnimation: 'fadeIn',
  entryDuration: 0.3,
  entryEasing: 'easeOutCubic',
  exitType: 'fadeOut',
  exitDuration: 0.3,
  exitEasing: 'easeInCubic',
};

// Animation presets for quick selection
export const ANIMATION_PRESETS = {
  subtle: {
    entry: { type: 'fadeIn' as EntryAnimationType, duration: 0.3, easing: 'easeOut' as AnimationEasing },
    exit: { type: 'fadeOut' as ExitAnimationType, duration: 0.3, easing: 'easeIn' as AnimationEasing },
  },
  smooth: {
    entry: { type: 'fadeIn' as EntryAnimationType, duration: 0.6, easing: 'easeInOutCubic' as AnimationEasing },
    exit: { type: 'fadeOut' as ExitAnimationType, duration: 0.6, easing: 'easeInOutCubic' as AnimationEasing },
  },
  dynamic: {
    entry: { type: 'scaleUp' as EntryAnimationType, duration: 0.4, easing: 'easeOutBack' as AnimationEasing },
    exit: { type: 'scaleDown' as ExitAnimationType, duration: 0.3, easing: 'easeInCubic' as AnimationEasing },
  },
  slide: {
    entry: { type: 'slideUp' as EntryAnimationType, duration: 0.5, easing: 'easeOutCubic' as AnimationEasing },
    exit: { type: 'slideDown' as ExitAnimationType, duration: 0.4, easing: 'easeInCubic' as AnimationEasing },
  },
  bounce: {
    entry: { type: 'bounce' as EntryAnimationType, duration: 0.6, easing: 'easeOutBounce' as AnimationEasing },
    exit: { type: 'fadeOut' as ExitAnimationType, duration: 0.3, easing: 'easeIn' as AnimationEasing },
  },
  professional: {
    entry: { type: 'fadeIn' as EntryAnimationType, duration: 0.8, easing: 'easeInOutCubic' as AnimationEasing },
    exit: { type: 'fadeOut' as ExitAnimationType, duration: 0.8, easing: 'easeInOutCubic' as AnimationEasing },
  },
} as const;

export type AnimationPresetName = keyof typeof ANIMATION_PRESETS;

// ===========================================
// Text Marker Types
// ===========================================

export interface TextMarker {
  id: string;
  position: [number, number];
  text: string;
  style: TextMarkerStyle;
  icon?: MarkerIcon;
  animationConfig?: TextMarkerAnimationConfig; // Advanced animation settings
  timing: ElementTiming;
}

export interface TextMarkerStyle {
  fontFamily: string;
  fontSize: number;
  fontColour: string;
  fontWeight: 'normal' | 'bold';
  backgroundColour?: string;
  backgroundOpacity: number;
  padding: number;
  borderRadius: number;
  // Border styling
  borderColour?: string;
  borderWidth?: number;
  rotation?: number; // degrees, 0-360
}

export interface MarkerIcon {
  type: string;
  colour: string;
  size: number;
}

// ===========================================
// Timing Types
// ===========================================

export interface ElementTiming {
  startTime: number;
  endTime: number;
  fadeInDuration: number;
  fadeOutDuration: number;
}

// ===========================================
// Branding Types
// ===========================================

export interface BrandingConfig {
  logo?: LogoConfig;
  title?: TitleConfig;
  watermark?: WatermarkConfig;
  colours: BrandColours;
}

export interface LogoConfig {
  url: string;
  position: OverlayPosition;
  width: number;
  opacity: number;
}

export interface WatermarkConfig {
  text: string;
  position: OverlayPosition;
  fontSize: number;
  colour: string;
  opacity: number;
}

export interface TitleConfig {
  text: string;
  subtitle?: string;
  position: OverlayPosition;
  style: TitleStyle;
  timing: ElementTiming;
}

export interface TitleStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | number;
  colour: string;
  backgroundColour?: string;
  backgroundOpacity?: number;
  borderRadius?: number;
  letterSpacing?: number;
  textShadow?: string;
  subtitleFontSize?: number;
  subtitleColour?: string;
}

export type OverlayPosition =
  | 'top-left'
  | 'top-centre'
  | 'top-right'
  | 'middle-left'
  | 'middle-centre'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-centre'
  | 'bottom-right';

export interface BrandColours {
  primary: string;
  secondary: string;
  accent: string;
}

// ===========================================
// Editor State Types
// ===========================================

export type EditorTool =
  | 'select'
  | 'pan'
  | 'rotate'
  | 'tilt'
  | 'orbit'
  | 'flyTo'
  | 'keyframe'
  | 'polygon'
  | 'route'
  | 'text'
  | 'measure'
  | 'drawZone'
  | 'drawRoute'
  | 'addMarker'
  | 'addText'
  | 'drawRectangle'
  | 'drawCircle'
  | 'editVertices';

export type ElementType = 'keyframe' | 'zone' | 'route' | 'textMarker';

export interface SelectedElement {
  id: string;
  type: ElementType;
}

// ===========================================
// Project Types (Database)
// ===========================================

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  config: ProjectConfig;
  thumbnailUrl: string | null;
  duration: number;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number;
  updatedAt: Date;
}

// ===========================================
// Render Types
// ===========================================

export type RenderStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface Render {
  id: string;
  projectId: string;
  userId: string;
  status: RenderStatus;
  resolution: ResolutionPreset;
  progress: number;
  outputUrl: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  renderId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Template Types
// ===========================================

export interface Template {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  config: ProjectConfig;
  thumbnailUrl: string | null;
  category: string | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'residential', name: 'Residential', description: 'Houses and apartments', icon: 'home' },
  { id: 'commercial', name: 'Commercial', description: 'Office and retail spaces', icon: 'building' },
  { id: 'luxury', name: 'Luxury', description: 'High-end properties', icon: 'crown' },
  { id: 'development', name: 'Development', description: 'New developments and off-plan', icon: 'construction' },
  { id: 'land', name: 'Land', description: 'Plots and land parcels', icon: 'map' },
];

// ===========================================
// User Types
// ===========================================

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  company: string | null;
  avatarUrl: string | null;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  defaultResolution: ResolutionPreset;
  defaultDuration: number;
  autoSave: boolean;
  showTutorials: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultResolution: '1080p',
  defaultDuration: 30,
  autoSave: true,
  showTutorials: true,
  theme: 'system',
};

// ===========================================
// Major Cities Data
// ===========================================

export interface MajorCity {
  name: string;
  country: string;
  coordinates: [number, number]; // [lng, lat]
  population?: number;
  region?: string;
}

export const MAJOR_CITIES: MajorCity[] = [
  // Middle East
  { name: 'Dubai', country: 'UAE', coordinates: [55.2708, 25.2048], population: 3400000, region: 'Middle East' },
  { name: 'Abu Dhabi', country: 'UAE', coordinates: [54.3773, 24.4539], population: 1500000, region: 'Middle East' },
  { name: 'Riyadh', country: 'Saudi Arabia', coordinates: [46.7219, 24.6877], population: 7600000, region: 'Middle East' },
  { name: 'Doha', country: 'Qatar', coordinates: [51.5310, 25.2854], population: 2380000, region: 'Middle East' },
  { name: 'Kuwait City', country: 'Kuwait', coordinates: [47.9774, 29.3759], population: 3100000, region: 'Middle East' },
  { name: 'Manama', country: 'Bahrain', coordinates: [50.5860, 26.2285], population: 410000, region: 'Middle East' },
  { name: 'Muscat', country: 'Oman', coordinates: [58.4059, 23.5880], population: 1550000, region: 'Middle East' },
  { name: 'Jeddah', country: 'Saudi Arabia', coordinates: [39.1925, 21.4858], population: 4700000, region: 'Middle East' },
  { name: 'Tel Aviv', country: 'Israel', coordinates: [34.7818, 32.0853], population: 460000, region: 'Middle East' },
  { name: 'Amman', country: 'Jordan', coordinates: [35.9456, 31.9454], population: 4200000, region: 'Middle East' },
  { name: 'Beirut', country: 'Lebanon', coordinates: [35.5018, 33.8938], population: 2400000, region: 'Middle East' },

  // Europe
  { name: 'London', country: 'UK', coordinates: [-0.1276, 51.5074], population: 8800000, region: 'Europe' },
  { name: 'Paris', country: 'France', coordinates: [2.3522, 48.8566], population: 2100000, region: 'Europe' },
  { name: 'Berlin', country: 'Germany', coordinates: [13.4050, 52.5200], population: 3600000, region: 'Europe' },
  { name: 'Madrid', country: 'Spain', coordinates: [-3.7038, 40.4168], population: 3200000, region: 'Europe' },
  { name: 'Rome', country: 'Italy', coordinates: [12.4964, 41.9028], population: 2870000, region: 'Europe' },
  { name: 'Amsterdam', country: 'Netherlands', coordinates: [4.9041, 52.3676], population: 870000, region: 'Europe' },
  { name: 'Vienna', country: 'Austria', coordinates: [16.3738, 48.2082], population: 1900000, region: 'Europe' },
  { name: 'Barcelona', country: 'Spain', coordinates: [2.1734, 41.3851], population: 1600000, region: 'Europe' },
  { name: 'Munich', country: 'Germany', coordinates: [11.5820, 48.1351], population: 1470000, region: 'Europe' },
  { name: 'Milan', country: 'Italy', coordinates: [9.1900, 45.4642], population: 1400000, region: 'Europe' },
  { name: 'Zurich', country: 'Switzerland', coordinates: [8.5417, 47.3769], population: 435000, region: 'Europe' },
  { name: 'Stockholm', country: 'Sweden', coordinates: [18.0686, 59.3293], population: 980000, region: 'Europe' },
  { name: 'Dublin', country: 'Ireland', coordinates: [-6.2603, 53.3498], population: 554000, region: 'Europe' },
  { name: 'Prague', country: 'Czech Republic', coordinates: [14.4378, 50.0755], population: 1300000, region: 'Europe' },
  { name: 'Warsaw', country: 'Poland', coordinates: [21.0122, 52.2297], population: 1790000, region: 'Europe' },
  { name: 'Lisbon', country: 'Portugal', coordinates: [-9.1393, 38.7223], population: 505000, region: 'Europe' },
  { name: 'Athens', country: 'Greece', coordinates: [23.7275, 37.9838], population: 660000, region: 'Europe' },
  { name: 'Istanbul', country: 'Turkey', coordinates: [28.9784, 41.0082], population: 15500000, region: 'Europe' },
  { name: 'Moscow', country: 'Russia', coordinates: [37.6173, 55.7558], population: 12700000, region: 'Europe' },

  // Asia
  { name: 'Singapore', country: 'Singapore', coordinates: [103.8198, 1.3521], population: 5700000, region: 'Asia' },
  { name: 'Hong Kong', country: 'China', coordinates: [114.1694, 22.3193], population: 7400000, region: 'Asia' },
  { name: 'Tokyo', country: 'Japan', coordinates: [139.6917, 35.6895], population: 14000000, region: 'Asia' },
  { name: 'Seoul', country: 'South Korea', coordinates: [126.9780, 37.5665], population: 9700000, region: 'Asia' },
  { name: 'Shanghai', country: 'China', coordinates: [121.4737, 31.2304], population: 27000000, region: 'Asia' },
  { name: 'Beijing', country: 'China', coordinates: [116.4074, 39.9042], population: 21500000, region: 'Asia' },
  { name: 'Bangkok', country: 'Thailand', coordinates: [100.5018, 13.7563], population: 10700000, region: 'Asia' },
  { name: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760], population: 21000000, region: 'Asia' },
  { name: 'Delhi', country: 'India', coordinates: [77.1025, 28.7041], population: 32000000, region: 'Asia' },
  { name: 'Jakarta', country: 'Indonesia', coordinates: [106.8456, -6.2088], population: 10600000, region: 'Asia' },
  { name: 'Manila', country: 'Philippines', coordinates: [120.9842, 14.5995], population: 1800000, region: 'Asia' },
  { name: 'Kuala Lumpur', country: 'Malaysia', coordinates: [101.6869, 3.1390], population: 1800000, region: 'Asia' },
  { name: 'Taipei', country: 'Taiwan', coordinates: [121.5654, 25.0330], population: 2600000, region: 'Asia' },
  { name: 'Osaka', country: 'Japan', coordinates: [135.5023, 34.6937], population: 2700000, region: 'Asia' },

  // Americas
  { name: 'New York', country: 'USA', coordinates: [-74.0060, 40.7128], population: 8300000, region: 'Americas' },
  { name: 'Los Angeles', country: 'USA', coordinates: [-118.2437, 34.0522], population: 3900000, region: 'Americas' },
  { name: 'Chicago', country: 'USA', coordinates: [-87.6298, 41.8781], population: 2700000, region: 'Americas' },
  { name: 'Miami', country: 'USA', coordinates: [-80.1918, 25.7617], population: 440000, region: 'Americas' },
  { name: 'San Francisco', country: 'USA', coordinates: [-122.4194, 37.7749], population: 870000, region: 'Americas' },
  { name: 'Toronto', country: 'Canada', coordinates: [-79.3832, 43.6532], population: 2900000, region: 'Americas' },
  { name: 'Vancouver', country: 'Canada', coordinates: [-123.1207, 49.2827], population: 680000, region: 'Americas' },
  { name: 'Mexico City', country: 'Mexico', coordinates: [-99.1332, 19.4326], population: 21800000, region: 'Americas' },
  { name: 'São Paulo', country: 'Brazil', coordinates: [-46.6333, -23.5505], population: 12300000, region: 'Americas' },
  { name: 'Rio de Janeiro', country: 'Brazil', coordinates: [-43.1729, -22.9068], population: 6700000, region: 'Americas' },
  { name: 'Buenos Aires', country: 'Argentina', coordinates: [-58.3816, -34.6037], population: 2890000, region: 'Americas' },
  { name: 'Lima', country: 'Peru', coordinates: [-77.0428, -12.0464], population: 10000000, region: 'Americas' },
  { name: 'Bogota', country: 'Colombia', coordinates: [-74.0721, 4.7110], population: 7900000, region: 'Americas' },

  // Africa
  { name: 'Cairo', country: 'Egypt', coordinates: [31.2357, 30.0444], population: 21300000, region: 'Africa' },
  { name: 'Cape Town', country: 'South Africa', coordinates: [18.4241, -33.9249], population: 4800000, region: 'Africa' },
  { name: 'Johannesburg', country: 'South Africa', coordinates: [28.0473, -26.2041], population: 5800000, region: 'Africa' },
  { name: 'Lagos', country: 'Nigeria', coordinates: [3.3792, 6.5244], population: 15400000, region: 'Africa' },
  { name: 'Nairobi', country: 'Kenya', coordinates: [36.8219, -1.2921], population: 4400000, region: 'Africa' },
  { name: 'Casablanca', country: 'Morocco', coordinates: [-7.5898, 33.5731], population: 3700000, region: 'Africa' },
  { name: 'Marrakech', country: 'Morocco', coordinates: [-7.9811, 31.6295], population: 930000, region: 'Africa' },

  // Oceania
  { name: 'Sydney', country: 'Australia', coordinates: [151.2093, -33.8688], population: 5300000, region: 'Oceania' },
  { name: 'Melbourne', country: 'Australia', coordinates: [144.9631, -37.8136], population: 5000000, region: 'Oceania' },
  { name: 'Auckland', country: 'New Zealand', coordinates: [174.7633, -36.8485], population: 1700000, region: 'Oceania' },
  { name: 'Brisbane', country: 'Australia', coordinates: [153.0251, -27.4698], population: 2500000, region: 'Oceania' },
  { name: 'Perth', country: 'Australia', coordinates: [115.8605, -31.9505], population: 2100000, region: 'Oceania' },
];

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[1] * Math.PI) / 180) *
      Math.cos((coord2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get cities sorted by distance from a given coordinate
export function getCitiesByDistance(
  fromCoord: [number, number],
  limit?: number
): Array<MajorCity & { distance: number }> {
  const citiesWithDistance = MAJOR_CITIES.map((city) => ({
    ...city,
    distance: calculateDistance(fromCoord, city.coordinates),
  })).sort((a, b) => a.distance - b.distance);

  return limit ? citiesWithDistance.slice(0, limit) : citiesWithDistance;
}

// ===========================================
// API Response Types
// ===========================================

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ===========================================
// Default Values
// ===========================================

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  version: '1.0.0',
  settings: {
    duration: 30,
    fps: 30,
    resolution: '1080p',
    aspectRatio: '16:9',
  },
  mapSettings: {
    style: 'satellite',
  },
  keyframes: [],
  zones: [],
  routes: [],
  textMarkers: [],
  branding: {
    colours: {
      primary: '#1E3A8A',
      secondary: '#3B82F6',
      accent: '#F59E0B',
    },
  },
};

export const DEFAULT_ZONE_STYLE: ZoneStyle = {
  fillColour: '#3B82F6',
  fillOpacity: 0.3,
  strokeColour: '#1E3A8A',
  strokeWidth: 2,
  strokeOpacity: 1,
  rotation: 0,
};

export const DEFAULT_ROUTE_STYLE: RouteStyle = {
  colour: '#EF4444',
  width: 4,
  opacity: 1,
  dashPattern: 'solid',
  outlineColour: '#FFFFFF',
  outlineWidth: 0,
  outlineOpacity: 1,
  rotation: 0,
};

export const DEFAULT_TEXT_MARKER_STYLE: TextMarkerStyle = {
  fontFamily: 'Inter',
  fontSize: 14,
  fontColour: '#FFFFFF',
  fontWeight: 'bold',
  backgroundColour: '#1E3A8A',
  backgroundOpacity: 0.9,
  padding: 8,
  borderRadius: 4,
  borderColour: '#000000',
  borderWidth: 0,
  rotation: 0,
};

export const DEFAULT_ELEMENT_TIMING: ElementTiming = {
  startTime: 0,
  endTime: 30,
  fadeInDuration: 0.5,
  fadeOutDuration: 0.5,
};

export const DEFAULT_CAMERA_STATE: CameraState = {
  centre: [55.2708, 25.2048], // Dubai
  zoom: 14,
  bearing: 0,
  pitch: 45,
};

// ===========================================
// Library Item Types
// ===========================================

export type LibraryItemType = 'zone' | 'route' | 'textMarker';

export interface LibraryItem {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: LibraryItemType;
  config: Zone | Route | TextMarker;
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryItemListItem {
  id: string;
  name: string;
  description: string | null;
  type: LibraryItemType;
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
