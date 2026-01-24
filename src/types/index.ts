// ===========================================
// PropertyClips Type Definitions
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
}

export interface MapSettings {
  style: MapStyle;
  accessToken?: string;
}

export type MapStyle = 'satellite' | 'satellite-streets' | 'streets' | 'light' | 'dark';

export type ResolutionPreset = '720p' | '1080p' | '4k';

export interface ResolutionConfig {
  width: number;
  height: number;
  bitrate: string;
  label: string;
}

export const RESOLUTION_PRESETS: Record<ResolutionPreset, ResolutionConfig> = {
  '720p': { width: 1280, height: 720, bitrate: '5M', label: 'HD 720p' },
  '1080p': { width: 1920, height: 1080, bitrate: '10M', label: 'Full HD 1080p' },
  '4k': { width: 3840, height: 2160, bitrate: '35M', label: '4K UHD' },
};

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
}

export interface CameraState {
  centre: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
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

// ===========================================
// Zone Types
// ===========================================

export interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: ZoneStyle;
  label: ZoneLabel;
  timing: ElementTiming;
}

export interface ZoneStyle {
  fillColour: string;
  fillOpacity: number;
  strokeColour: string;
  strokeWidth: number;
  strokeOpacity: number;
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
  timing: ElementTiming;
}

export interface RouteStyle {
  colour: string;
  width: number;
  opacity: number;
  dashPattern: 'solid' | 'dashed' | 'dotted';
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
// Text Marker Types
// ===========================================

export interface TextMarker {
  id: string;
  position: [number, number];
  text: string;
  style: TextMarkerStyle;
  icon?: MarkerIcon;
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
  | 'keyframe'
  | 'polygon'
  | 'route'
  | 'text'
  | 'measure';

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
};

export const DEFAULT_ROUTE_STYLE: RouteStyle = {
  colour: '#EF4444',
  width: 4,
  opacity: 1,
  dashPattern: 'solid',
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
