import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  ProjectConfig,
  Keyframe,
  Zone,
  Route,
  TextMarker,
  CameraState,
  EasingType,
  DEFAULT_PROJECT_CONFIG,
  DEFAULT_ZONE_STYLE,
  DEFAULT_ROUTE_STYLE,
  DEFAULT_TEXT_MARKER_STYLE,
  DEFAULT_ELEMENT_TIMING,
  DEFAULT_CAMERA_STATE,
  calculateDurationFromKeyframes,
} from '@/types';
import { generateId } from '@/lib/utils';
import {
  shiftCoordinatesToCenter,
  shiftLineToCenter,
  getPolygonCentroid,
  getLineCentroid,
} from '@/lib/geo-utils';
import { getColorPreferences } from '@/lib/color-preferences';

// ===========================================
// Project Store State Interface
// ===========================================

interface ProjectState {
  // Project metadata
  projectId: string | null;
  projectName: string;
  projectDescription: string | null;
  
  // Project configuration
  config: ProjectConfig;
  
  // Dirty state tracking
  isDirty: boolean;
  lastSavedAt: Date | null;
  
  // History for undo/redo
  past: ProjectConfig[];
  future: ProjectConfig[];
  
  // Actions - Project
  loadProject: (
    id: string,
    name: string,
    description: string | null,
    config: ProjectConfig
  ) => void;
  resetProject: () => void;
  updateProjectMeta: (name: string, description: string | null) => void;
  setConfig: (config: ProjectConfig) => void;
  markClean: () => void;
  markDirty: () => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<ProjectConfig['settings']>) => void;
  updateMapSettings: (settings: Partial<ProjectConfig['mapSettings']>) => void;
  updateBranding: (branding: Partial<ProjectConfig['branding']>) => void;
  
  // Actions - Keyframes
  addKeyframe: (camera: CameraState, name?: string) => string;
  updateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  deleteKeyframe: (id: string) => void;
  reorderKeyframes: (startIndex: number, endIndex: number) => void;
  duplicateKeyframe: (id: string) => string;
  
  // Actions - Zones
  addZone: (coordinates: [number, number][], name?: string) => string;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;
  
  // Actions - Routes
  addRoute: (coordinates: [number, number][], name?: string) => string;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  
  // Actions - Text Markers
  addTextMarker: (position: [number, number], text: string) => string;
  updateTextMarker: (id: string, updates: Partial<TextMarker>) => void;
  deleteTextMarker: (id: string) => void;

  // Actions - Library Import
  importLibraryZone: (zone: Zone, mapCenter: [number, number]) => string;
  importLibraryRoute: (route: Route, mapCenter: [number, number]) => string;
  importLibraryTextMarker: (marker: TextMarker, mapCenter: [number, number]) => string;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Computed
  canUndo: () => boolean;
  canRedo: () => boolean;
  getKeyframeById: (id: string) => Keyframe | undefined;
  getZoneById: (id: string) => Zone | undefined;
  getRouteById: (id: string) => Route | undefined;
  getTextMarkerById: (id: string) => TextMarker | undefined;
}

// ===========================================
// Helper Functions
// ===========================================

const pushHistory = (state: ProjectState): void => {
  state.past.push(JSON.parse(JSON.stringify(state.config)));
  state.future = [];
  // Limit history size
  if (state.past.length > 50) {
    state.past.shift();
  }
};

// ===========================================
// Project Store
// ===========================================

export const useProjectStore = create<ProjectState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        projectId: null,
        projectName: 'Untitled Project',
        projectDescription: null,
        config: DEFAULT_PROJECT_CONFIG,
        isDirty: false,
        lastSavedAt: null,
        past: [],
        future: [],

        // Project Actions
        loadProject: (id, name, description, config) => {
          set((state) => {
            state.projectId = id;
            state.projectName = name;
            state.projectDescription = description;
            state.config = config;
            state.isDirty = false;
            state.lastSavedAt = new Date();
            state.past = [];
            state.future = [];
          });
        },

        resetProject: () => {
          set((state) => {
            state.projectId = null;
            state.projectName = 'Untitled Project';
            state.projectDescription = null;
            state.config = DEFAULT_PROJECT_CONFIG;
            state.isDirty = false;
            state.lastSavedAt = null;
            state.past = [];
            state.future = [];
          });
        },

        updateProjectMeta: (name, description) => {
          set((state) => {
            state.projectName = name;
            state.projectDescription = description;
            state.isDirty = true;
          });
        },

        setConfig: (config) => {
          set((state) => {
            pushHistory(state);
            state.config = config;
            state.isDirty = true;
          });
        },

        markClean: () => {
          set((state) => {
            state.isDirty = false;
            state.lastSavedAt = new Date();
          });
        },

        markDirty: () => {
          set((state) => {
            state.isDirty = true;
          });
        },

        // Settings Actions
        updateSettings: (settings) => {
          set((state) => {
            pushHistory(state);
            state.config.settings = { ...state.config.settings, ...settings };
            state.isDirty = true;
          });
        },

        updateMapSettings: (settings) => {
          set((state) => {
            pushHistory(state);
            state.config.mapSettings = { ...state.config.mapSettings, ...settings };
            state.isDirty = true;
          });
        },

        updateBranding: (branding) => {
          set((state) => {
            pushHistory(state);
            state.config.branding = { ...state.config.branding, ...branding };
            state.isDirty = true;
          });
        },

        // Keyframe Actions
        addKeyframe: (camera, name) => {
          const id = generateId();
          const keyframeCount = get().config.keyframes.length;
          const lastKeyframe = get().config.keyframes[keyframeCount - 1];
          const time = lastKeyframe
            ? lastKeyframe.time + lastKeyframe.duration
            : 0;

          set((state) => {
            pushHistory(state);
            state.config.keyframes.push({
              id,
              name: name || `Keyframe ${keyframeCount + 1}`,
              time,
              duration: 5,
              camera,
              easing: 'easeInOutCubic' as EasingType,
            });
            // Auto-sync duration from keyframes
            state.config.settings.duration = calculateDurationFromKeyframes(state.config.keyframes);
            state.isDirty = true;
          });
          return id;
        },

        updateKeyframe: (id, updates) => {
          set((state) => {
            pushHistory(state);
            const index = state.config.keyframes.findIndex((k) => k.id === id);
            if (index !== -1) {
              state.config.keyframes[index] = {
                ...state.config.keyframes[index],
                ...updates,
              };
            }
            // Auto-sync duration from keyframes
            state.config.settings.duration = calculateDurationFromKeyframes(state.config.keyframes);
            state.isDirty = true;
          });
        },

        deleteKeyframe: (id) => {
          set((state) => {
            pushHistory(state);
            state.config.keyframes = state.config.keyframes.filter(
              (k) => k.id !== id
            );
            // Auto-sync duration from keyframes
            state.config.settings.duration = calculateDurationFromKeyframes(state.config.keyframes);
            state.isDirty = true;
          });
        },

        reorderKeyframes: (startIndex, endIndex) => {
          set((state) => {
            pushHistory(state);
            const [removed] = state.config.keyframes.splice(startIndex, 1);
            state.config.keyframes.splice(endIndex, 0, removed);
            // Recalculate times
            let currentTime = 0;
            state.config.keyframes.forEach((keyframe) => {
              keyframe.time = currentTime;
              currentTime += keyframe.duration;
            });
            // Auto-sync duration from keyframes
            state.config.settings.duration = calculateDurationFromKeyframes(state.config.keyframes);
            state.isDirty = true;
          });
        },

        duplicateKeyframe: (id) => {
          const newId = generateId();
          set((state) => {
            pushHistory(state);
            const index = state.config.keyframes.findIndex((k) => k.id === id);
            if (index !== -1) {
              const original = state.config.keyframes[index];
              const duplicate: Keyframe = {
                ...JSON.parse(JSON.stringify(original)),
                id: newId,
                name: `${original.name} (copy)`,
              };
              state.config.keyframes.splice(index + 1, 0, duplicate);
              // Recalculate times
              let currentTime = 0;
              state.config.keyframes.forEach((keyframe) => {
                keyframe.time = currentTime;
                currentTime += keyframe.duration;
              });
              // Auto-sync duration from keyframes
              state.config.settings.duration = calculateDurationFromKeyframes(state.config.keyframes);
            }
            state.isDirty = true;
          });
          return newId;
        },

        // Zone Actions
        addZone: (coordinates, name) => {
          const id = generateId();
          const zoneCount = get().config.zones.length;
          const duration = get().config.settings.duration;
          const colorPrefs = getColorPreferences();

          set((state) => {
            pushHistory(state);
            state.config.zones.push({
              id,
              name: name || `Zone ${zoneCount + 1}`,
              coordinates,
              style: {
                ...DEFAULT_ZONE_STYLE,
                fillColour: colorPrefs.zone.fillColour,
                fillOpacity: colorPrefs.zone.fillOpacity,
                strokeColour: colorPrefs.zone.strokeColour,
                strokeWidth: colorPrefs.zone.strokeWidth,
              },
              label: {
                text: name || `Zone ${zoneCount + 1}`,
                fontSize: 14,
                fontColour: '#FFFFFF',
                visible: true,
              },
              timing: {
                ...DEFAULT_ELEMENT_TIMING,
                endTime: duration,
              },
            });
            state.isDirty = true;
          });
          return id;
        },

        updateZone: (id, updates) => {
          set((state) => {
            pushHistory(state);
            const index = state.config.zones.findIndex((z) => z.id === id);
            if (index !== -1) {
              state.config.zones[index] = {
                ...state.config.zones[index],
                ...updates,
              };
            }
            state.isDirty = true;
          });
        },

        deleteZone: (id) => {
          set((state) => {
            pushHistory(state);
            state.config.zones = state.config.zones.filter((z) => z.id !== id);
            state.isDirty = true;
          });
        },

        // Route Actions
        addRoute: (coordinates, name) => {
          const id = generateId();
          const routeCount = get().config.routes.length;
          const duration = get().config.settings.duration;
          const colorPrefs = getColorPreferences();

          set((state) => {
            pushHistory(state);
            state.config.routes.push({
              id,
              name: name || `Route ${routeCount + 1}`,
              coordinates,
              style: {
                ...DEFAULT_ROUTE_STYLE,
                colour: colorPrefs.route.colour,
                width: colorPrefs.route.width,
                opacity: colorPrefs.route.opacity,
              },
              label: {
                text: name || `Route ${routeCount + 1}`,
                visible: true,
              },
              animation: {
                type: 'draw',
                duration: 2,
              },
              timing: {
                ...DEFAULT_ELEMENT_TIMING,
                endTime: duration,
              },
            });
            state.isDirty = true;
          });
          return id;
        },

        updateRoute: (id, updates) => {
          set((state) => {
            pushHistory(state);
            const index = state.config.routes.findIndex((r) => r.id === id);
            if (index !== -1) {
              state.config.routes[index] = {
                ...state.config.routes[index],
                ...updates,
              };
            }
            state.isDirty = true;
          });
        },

        deleteRoute: (id) => {
          set((state) => {
            pushHistory(state);
            state.config.routes = state.config.routes.filter((r) => r.id !== id);
            state.isDirty = true;
          });
        },

        // Text Marker Actions
        addTextMarker: (position, text) => {
          const id = generateId();
          const duration = get().config.settings.duration;
          const colorPrefs = getColorPreferences();

          set((state) => {
            pushHistory(state);
            state.config.textMarkers.push({
              id,
              position,
              text,
              style: {
                ...DEFAULT_TEXT_MARKER_STYLE,
                backgroundColour: colorPrefs.textMarker.backgroundColour,
                fontColour: colorPrefs.textMarker.fontColour,
              },
              timing: {
                ...DEFAULT_ELEMENT_TIMING,
                endTime: duration,
              },
            });
            state.isDirty = true;
          });
          return id;
        },

        updateTextMarker: (id, updates) => {
          set((state) => {
            pushHistory(state);
            const index = state.config.textMarkers.findIndex((t) => t.id === id);
            if (index !== -1) {
              state.config.textMarkers[index] = {
                ...state.config.textMarkers[index],
                ...updates,
              };
            }
            state.isDirty = true;
          });
        },

        deleteTextMarker: (id) => {
          set((state) => {
            pushHistory(state);
            state.config.textMarkers = state.config.textMarkers.filter(
              (t) => t.id !== id
            );
            state.isDirty = true;
          });
        },

        // Library Import Actions
        importLibraryZone: (zone, mapCenter) => {
          const id = generateId();
          const duration = get().config.settings.duration;
          const zoneCount = get().config.zones.length;

          // Shift coordinates to center on map
          const shiftedCoordinates = shiftCoordinatesToCenter(
            zone.coordinates,
            mapCenter
          );

          set((state) => {
            pushHistory(state);
            state.config.zones.push({
              ...zone,
              id,
              name: `${zone.name} (imported)`,
              coordinates: shiftedCoordinates,
              timing: {
                ...DEFAULT_ELEMENT_TIMING,
                endTime: duration,
              },
            });
            state.isDirty = true;
          });
          return id;
        },

        importLibraryRoute: (route, mapCenter) => {
          const id = generateId();
          const duration = get().config.settings.duration;

          // Shift coordinates to center on map
          const shiftedCoordinates = shiftLineToCenter(
            route.coordinates,
            mapCenter
          );

          set((state) => {
            pushHistory(state);
            state.config.routes.push({
              ...route,
              id,
              name: `${route.name} (imported)`,
              coordinates: shiftedCoordinates,
              timing: {
                ...DEFAULT_ELEMENT_TIMING,
                endTime: duration,
              },
            });
            state.isDirty = true;
          });
          return id;
        },

        importLibraryTextMarker: (marker, mapCenter) => {
          const id = generateId();
          const duration = get().config.settings.duration;

          set((state) => {
            pushHistory(state);
            state.config.textMarkers.push({
              ...marker,
              id,
              position: mapCenter, // Place at map center
              timing: {
                ...DEFAULT_ELEMENT_TIMING,
                endTime: duration,
              },
            });
            state.isDirty = true;
          });
          return id;
        },

        // History Actions
        undo: () => {
          set((state) => {
            if (state.past.length > 0) {
              const previous = state.past.pop()!;
              state.future.unshift(JSON.parse(JSON.stringify(state.config)));
              state.config = previous;
              state.isDirty = true;
            }
          });
        },

        redo: () => {
          set((state) => {
            if (state.future.length > 0) {
              const next = state.future.shift()!;
              state.past.push(JSON.parse(JSON.stringify(state.config)));
              state.config = next;
              state.isDirty = true;
            }
          });
        },

        clearHistory: () => {
          set((state) => {
            state.past = [];
            state.future = [];
          });
        },

        // Computed Getters
        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,
        
        getKeyframeById: (id) => 
          get().config.keyframes.find((k) => k.id === id),
        
        getZoneById: (id) => 
          get().config.zones.find((z) => z.id === id),
        
        getRouteById: (id) => 
          get().config.routes.find((r) => r.id === id),
        
        getTextMarkerById: (id) => 
          get().config.textMarkers.find((t) => t.id === id),
      }))
    ),
    { name: 'project-store' }
  )
);

// ===========================================
// Selectors
// ===========================================

export const selectProjectConfig = (state: ProjectState) => state.config;
export const selectKeyframes = (state: ProjectState) => state.config.keyframes;
export const selectZones = (state: ProjectState) => state.config.zones;
export const selectRoutes = (state: ProjectState) => state.config.routes;
export const selectTextMarkers = (state: ProjectState) => state.config.textMarkers;
export const selectSettings = (state: ProjectState) => state.config.settings;
export const selectMapSettings = (state: ProjectState) => state.config.mapSettings;
export const selectBranding = (state: ProjectState) => state.config.branding;
export const selectIsDirty = (state: ProjectState) => state.isDirty;
