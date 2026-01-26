#!/usr/bin/env npx ts-node
/**
 * Propnica - Property Showcase Video Generator
 *
 * This script demonstrates how to generate a property showcase video similar to
 * the Dubai Creek Harbour sample video, featuring:
 * - Satellite map flyover with smooth camera animations
 * - Animated polygon boundaries highlighting the property area
 * - Text labels for nearby landmarks (airports, districts, roads)
 * - Dashed route lines showing travel times to key destinations
 * - Professional branding overlays
 *
 * Usage:
 *   npx ts-node scripts/generate-property-video.ts
 *
 * Or with custom output:
 *   npx ts-node scripts/generate-property-video.ts --output my-property.mp4
 *
 * Requirements:
 *   - Node.js 18+
 *   - Mapbox Access Token (set NEXT_PUBLIC_MAPBOX_TOKEN environment variable)
 *   - FFmpeg installed on your system
 *
 * @author Propnica
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Type Definitions (matching Propnica types)
// =============================================================================

interface ProjectConfig {
  version: string;
  settings: ProjectSettings;
  mapSettings: MapSettings;
  keyframes: Keyframe[];
  zones: Zone[];
  routes: Route[];
  textMarkers: TextMarker[];
  branding: BrandingConfig;
}

interface ProjectSettings {
  duration: number;
  fps: number;
  resolution: ResolutionPreset;
}

interface MapSettings {
  style: MapStyle;
  accessToken?: string;
}

type MapStyle = 'satellite' | 'satellite-streets' | 'streets' | 'light' | 'dark';
type ResolutionPreset = '720p' | '1080p' | '4k';

interface Keyframe {
  id: string;
  name: string;
  time: number;
  duration: number;
  camera: CameraState;
  easing: EasingType;
}

interface CameraState {
  centre: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

type EasingType =
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

interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: ZoneStyle;
  label: ZoneLabel;
  timing: ElementTiming;
}

interface ZoneStyle {
  fillColour: string;
  fillOpacity: number;
  strokeColour: string;
  strokeWidth: number;
  strokeOpacity: number;
}

interface ZoneLabel {
  text: string;
  fontSize: number;
  fontColour: string;
  visible: boolean;
}

interface Route {
  id: string;
  name: string;
  coordinates: [number, number][];
  style: RouteStyle;
  label: RouteLabel;
  animation: RouteAnimation;
  timing: ElementTiming;
}

interface RouteStyle {
  colour: string;
  width: number;
  opacity: number;
  dashPattern: 'solid' | 'dashed' | 'dotted';
}

interface RouteLabel {
  text: string;
  travelTime?: string;
  distance?: string;
  visible: boolean;
}

interface RouteAnimation {
  type: 'none' | 'draw' | 'pulse';
  duration: number;
}

interface TextMarker {
  id: string;
  position: [number, number];
  text: string;
  style: TextMarkerStyle;
  icon?: MarkerIcon;
  timing: ElementTiming;
}

interface TextMarkerStyle {
  fontFamily: string;
  fontSize: number;
  fontColour: string;
  fontWeight: 'normal' | 'bold';
  backgroundColour?: string;
  backgroundOpacity: number;
  padding: number;
  borderRadius: number;
}

interface MarkerIcon {
  type: string;
  colour: string;
  size: number;
}

interface ElementTiming {
  startTime: number;
  endTime: number;
  fadeInDuration: number;
  fadeOutDuration: number;
}

interface BrandingConfig {
  logo?: LogoConfig;
  watermark?: WatermarkConfig;
  colours: BrandColours;
}

interface LogoConfig {
  url: string;
  position: OverlayPosition;
  width: number;
  opacity: number;
}

interface WatermarkConfig {
  text: string;
  position: OverlayPosition;
  fontSize: number;
  colour: string;
  opacity: number;
}

type OverlayPosition =
  | 'top-left'
  | 'top-centre'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-centre'
  | 'bottom-right';

interface BrandColours {
  primary: string;
  secondary: string;
  accent: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique ID for elements
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a keyframe with sensible defaults
 */
function createKeyframe(
  name: string,
  time: number,
  centre: [number, number],
  zoom: number,
  options: Partial<{ bearing: number; pitch: number; duration: number; easing: EasingType }> = {}
): Keyframe {
  return {
    id: generateId(),
    name,
    time,
    duration: options.duration ?? 3,
    camera: {
      centre,
      zoom,
      bearing: options.bearing ?? 0,
      pitch: options.pitch ?? 45,
    },
    easing: options.easing ?? 'easeInOutCubic',
  };
}

/**
 * Create a zone (polygon) with sensible defaults
 */
function createZone(
  name: string,
  coordinates: [number, number][],
  options: Partial<{
    fillColour: string;
    fillOpacity: number;
    strokeColour: string;
    strokeWidth: number;
    strokeOpacity: number;
    labelText: string;
    labelVisible: boolean;
    startTime: number;
    endTime: number;
  }> = {}
): Zone {
  return {
    id: generateId(),
    name,
    coordinates,
    style: {
      fillColour: options.fillColour ?? 'rgba(220, 38, 38, 0.2)',
      fillOpacity: options.fillOpacity ?? 0.2,
      strokeColour: options.strokeColour ?? '#DC2626',
      strokeWidth: options.strokeWidth ?? 3,
      strokeOpacity: options.strokeOpacity ?? 1,
    },
    label: {
      text: options.labelText ?? name,
      fontSize: 16,
      fontColour: '#FFFFFF',
      visible: options.labelVisible ?? true,
    },
    timing: {
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 90,
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5,
    },
  };
}

/**
 * Create a route with sensible defaults
 */
function createRoute(
  name: string,
  coordinates: [number, number][],
  options: Partial<{
    colour: string;
    width: number;
    dashPattern: 'solid' | 'dashed' | 'dotted';
    travelTime: string;
    distance: string;
    animationType: 'none' | 'draw' | 'pulse';
    animationDuration: number;
    startTime: number;
    endTime: number;
  }> = {}
): Route {
  return {
    id: generateId(),
    name,
    coordinates,
    style: {
      colour: options.colour ?? '#FFFFFF',
      width: options.width ?? 4,
      opacity: 1,
      dashPattern: options.dashPattern ?? 'dashed',
    },
    label: {
      text: name,
      travelTime: options.travelTime,
      distance: options.distance,
      visible: true,
    },
    animation: {
      type: options.animationType ?? 'draw',
      duration: options.animationDuration ?? 2,
    },
    timing: {
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 90,
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5,
    },
  };
}

/**
 * Create a text marker with sensible defaults
 */
function createTextMarker(
  text: string,
  position: [number, number],
  options: Partial<{
    fontSize: number;
    fontColour: string;
    backgroundColour: string;
    iconType: string;
    iconColour: string;
    startTime: number;
    endTime: number;
  }> = {}
): TextMarker {
  const marker: TextMarker = {
    id: generateId(),
    position,
    text,
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: options.fontSize ?? 14,
      fontColour: options.fontColour ?? '#FFFFFF',
      fontWeight: 'bold',
      backgroundColour: options.backgroundColour ?? 'rgba(0, 0, 0, 0.7)',
      backgroundOpacity: 0.8,
      padding: 8,
      borderRadius: 4,
    },
    timing: {
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 90,
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5,
    },
  };

  if (options.iconType) {
    marker.icon = {
      type: options.iconType,
      colour: options.iconColour ?? '#FFFFFF',
      size: 24,
    };
  }

  return marker;
}

// =============================================================================
// Dubai Creek Harbour Sample Configuration
// =============================================================================

/**
 * Creates a complete project configuration for Dubai Creek Harbour
 * This replicates the sample video with:
 * - 90-second duration
 * - Satellite imagery
 * - Camera flyover from wide view to property focus
 * - Property boundary polygon
 * - Nearby landmarks with labels
 * - Travel routes to key destinations
 */
function createDubaiCreekHarbourConfig(): ProjectConfig {
  // Dubai Creek Harbour coordinates (approximate centre)
  const propertyCenter: [number, number] = [55.3477, 25.2069];

  // Key locations around Dubai Creek Harbour
  const locations = {
    dubaiCreekHarbour: propertyCenter,
    dubaiInternationalAirport: [55.3644, 25.2532] as [number, number],
    downtownDubai: [55.2744, 25.1972] as [number, number],
    burjKhalifa: [55.2744, 25.1972] as [number, number],
    dubaiMall: [55.2796, 25.1979] as [number, number],
    businessBay: [55.2653, 25.1857] as [number, number],
    rasAlKhorRoad: [55.3747, 25.1897] as [number, number],
    dubaiCreek: [55.3197, 25.2622] as [number, number],
    festivalCity: [55.3533, 25.2244] as [number, number],
  };

  // Dubai Creek Harbour boundary polygon (approximate)
  const propertyBoundary: [number, number][] = [
    [55.3397, 25.2119],
    [55.3557, 25.2119],
    [55.3577, 25.2039],
    [55.3537, 25.1999],
    [55.3417, 25.1999],
    [55.3377, 25.2039],
    [55.3397, 25.2119],
  ];

  // Dubai Creek Tower area (highlight within the development)
  const creekTowerArea: [number, number][] = [
    [55.3457, 25.2089],
    [55.3517, 25.2089],
    [55.3517, 25.2049],
    [55.3457, 25.2049],
    [55.3457, 25.2089],
  ];

  return {
    version: '1.0.0',
    settings: {
      duration: 90,
      fps: 30,
      resolution: '1080p',
    },
    mapSettings: {
      style: 'satellite',
    },
    keyframes: [
      // Opening: Wide view of Dubai showing The Palm
      createKeyframe('Wide Dubai View', 0, [55.15, 25.12], 10.5, {
        bearing: 0,
        pitch: 0,
        duration: 5,
        easing: 'easeOutCubic',
      }),

      // Zoom towards Dubai Creek area
      createKeyframe('Approach Dubai Creek', 8, [55.30, 25.20], 12, {
        bearing: 30,
        pitch: 45,
        duration: 6,
        easing: 'easeInOutCubic',
      }),

      // Focus on Dubai Creek Harbour
      createKeyframe('Dubai Creek Harbour Overview', 18, propertyCenter, 14, {
        bearing: 45,
        pitch: 50,
        duration: 8,
        easing: 'easeInOutCubic',
      }),

      // Show property boundary
      createKeyframe('Property Boundary View', 28, propertyCenter, 15, {
        bearing: 60,
        pitch: 55,
        duration: 10,
        easing: 'easeInOutCubic',
      }),

      // Pan to show airport connection
      createKeyframe('Airport Connection', 42, [55.36, 25.23], 13, {
        bearing: 15,
        pitch: 45,
        duration: 8,
        easing: 'easeInOutCubic',
      }),

      // Pan to show Downtown connection
      createKeyframe('Downtown Connection', 54, [55.31, 25.20], 13, {
        bearing: -30,
        pitch: 45,
        duration: 8,
        easing: 'easeInOutCubic',
      }),

      // Return to property overview
      createKeyframe('Return to Property', 66, propertyCenter, 14.5, {
        bearing: 90,
        pitch: 50,
        duration: 10,
        easing: 'easeInOutCubic',
      }),

      // Final dramatic view
      createKeyframe('Final View', 80, propertyCenter, 15.5, {
        bearing: 120,
        pitch: 60,
        duration: 10,
        easing: 'easeOutCubic',
      }),
    ],

    zones: [
      // Main property boundary
      createZone('Dubai Creek Harbour', propertyBoundary, {
        fillColour: 'rgba(220, 38, 38, 0.15)',
        fillOpacity: 0.15,
        strokeColour: '#DC2626',
        strokeWidth: 4,
        strokeOpacity: 1,
        labelText: 'DUBAI CREEK HARBOUR',
        labelVisible: true,
        startTime: 15,
        endTime: 90,
      }),

      // Creek Tower highlight area
      createZone('Dubai Creek Tower', creekTowerArea, {
        fillColour: 'rgba(59, 130, 246, 0.25)',
        fillOpacity: 0.25,
        strokeColour: '#3B82F6',
        strokeWidth: 3,
        strokeOpacity: 1,
        labelText: 'DUBAI CREEK TOWER',
        labelVisible: true,
        startTime: 25,
        endTime: 90,
      }),
    ],

    routes: [
      // Route to Dubai International Airport
      createRoute('To Airport', [
        propertyCenter,
        [55.3550, 25.2200],
        [55.3600, 25.2400],
        locations.dubaiInternationalAirport,
      ], {
        colour: '#FFFFFF',
        width: 4,
        dashPattern: 'dashed',
        travelTime: '15 minutes',
        distance: '8 km',
        animationType: 'draw',
        animationDuration: 2,
        startTime: 38,
        endTime: 55,
      }),

      // Route to Downtown Dubai
      createRoute('To Downtown', [
        propertyCenter,
        [55.3200, 25.2050],
        [55.2900, 25.2000],
        locations.downtownDubai,
      ], {
        colour: '#F59E0B',
        width: 4,
        dashPattern: 'dashed',
        travelTime: '10 minutes',
        distance: '6 km',
        animationType: 'draw',
        animationDuration: 2,
        startTime: 50,
        endTime: 68,
      }),

      // Route to Business Bay
      createRoute('To Business Bay', [
        propertyCenter,
        [55.3100, 25.1950],
        locations.businessBay,
      ], {
        colour: '#10B981',
        width: 3,
        dashPattern: 'dashed',
        travelTime: '12 minutes',
        distance: '7 km',
        animationType: 'draw',
        animationDuration: 1.5,
        startTime: 60,
        endTime: 78,
      }),
    ],

    textMarkers: [
      // Property name label
      createTextMarker('Dubai Creek Harbour', [55.3477, 25.2100], {
        fontSize: 18,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(220, 38, 38, 0.9)',
        iconType: 'building',
        iconColour: '#FFFFFF',
        startTime: 18,
        endTime: 90,
      }),

      // Airport label
      createTextMarker('Dubai International Airport', locations.dubaiInternationalAirport, {
        fontSize: 14,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(0, 0, 0, 0.8)',
        iconType: 'plane',
        iconColour: '#60A5FA',
        startTime: 38,
        endTime: 55,
      }),

      // Downtown label
      createTextMarker('Downtown Dubai', locations.downtownDubai, {
        fontSize: 14,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(0, 0, 0, 0.8)',
        iconType: 'building',
        iconColour: '#F59E0B',
        startTime: 50,
        endTime: 68,
      }),

      // Burj Khalifa label
      createTextMarker('Burj Khalifa', [55.2744, 25.1975], {
        fontSize: 12,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(245, 158, 11, 0.9)',
        iconType: 'landmark',
        iconColour: '#FFFFFF',
        startTime: 52,
        endTime: 68,
      }),

      // Business Bay label
      createTextMarker('Business Bay', locations.businessBay, {
        fontSize: 14,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(0, 0, 0, 0.8)',
        iconType: 'briefcase',
        iconColour: '#10B981',
        startTime: 60,
        endTime: 78,
      }),

      // Dubai Creek label
      createTextMarker('Dubai Creek', locations.dubaiCreek, {
        fontSize: 12,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(59, 130, 246, 0.8)',
        iconType: 'water',
        iconColour: '#FFFFFF',
        startTime: 8,
        endTime: 40,
      }),

      // Festival City label
      createTextMarker('Festival City', locations.festivalCity, {
        fontSize: 12,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(0, 0, 0, 0.7)',
        iconType: 'shopping',
        iconColour: '#EC4899',
        startTime: 20,
        endTime: 45,
      }),

      // Ras Al Khor Road label
      createTextMarker('Ras Al Khor Road', locations.rasAlKhorRoad, {
        fontSize: 12,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(0, 0, 0, 0.7)',
        iconType: 'road',
        iconColour: '#9CA3AF',
        startTime: 25,
        endTime: 55,
      }),

      // Travel time annotations
      createTextMarker('15 min', [55.3580, 25.2350], {
        fontSize: 14,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(99, 102, 241, 0.9)',
        startTime: 42,
        endTime: 55,
      }),

      createTextMarker('10 min', [55.3050, 25.2020], {
        fontSize: 14,
        fontColour: '#1F2937',
        backgroundColour: 'rgba(245, 158, 11, 0.9)',
        startTime: 54,
        endTime: 68,
      }),

      createTextMarker('12 min', [55.2880, 25.1900], {
        fontSize: 14,
        fontColour: '#FFFFFF',
        backgroundColour: 'rgba(16, 185, 129, 0.9)',
        startTime: 62,
        endTime: 78,
      }),
    ],

    branding: {
      logo: {
        url: '/logo.png', // Replace with your logo URL
        position: 'top-left',
        width: 120,
        opacity: 0.9,
      },
      watermark: {
        text: 'Propnica',
        position: 'bottom-right',
        fontSize: 12,
        colour: '#FFFFFF',
        opacity: 0.6,
      },
      colours: {
        primary: '#DC2626',
        secondary: '#3B82F6',
        accent: '#F59E0B',
      },
    },
  };
}

// =============================================================================
// Template: Create Your Own Property Video
// =============================================================================

/**
 * Template function for creating your own property video configuration
 *
 * INSTRUCTIONS:
 * 1. Copy this function and rename it (e.g., createMyPropertyConfig)
 * 2. Replace the property coordinates with your property's location
 * 3. Update the boundary polygon to match your property shape
 * 4. Add/remove keyframes to control the camera journey
 * 5. Add nearby landmarks and routes
 * 6. Customise branding with your logo and colours
 */
function createCustomPropertyTemplate(
  propertyName: string,
  propertyCenter: [number, number],
  propertyBoundary: [number, number][],
  options: {
    duration?: number;
    nearbyLocations?: Array<{
      name: string;
      position: [number, number];
      travelTime?: string;
      distance?: string;
    }>;
    brandColour?: string;
    logoUrl?: string;
  } = {}
): ProjectConfig {
  const duration = options.duration ?? 60;

  // Create default keyframes based on property center
  const keyframes: Keyframe[] = [
    createKeyframe('Opening Wide View', 0, [propertyCenter[0], propertyCenter[1] - 0.05], 11, {
      bearing: 0,
      pitch: 30,
    }),
    createKeyframe('Approach Property', duration * 0.15, propertyCenter, 13, {
      bearing: 30,
      pitch: 45,
    }),
    createKeyframe('Property Overview', duration * 0.3, propertyCenter, 15, {
      bearing: 60,
      pitch: 55,
    }),
    createKeyframe('Property Detail', duration * 0.5, propertyCenter, 16, {
      bearing: 90,
      pitch: 60,
    }),
    createKeyframe('Surroundings View', duration * 0.7, propertyCenter, 14, {
      bearing: 120,
      pitch: 50,
    }),
    createKeyframe('Final View', duration * 0.9, propertyCenter, 15, {
      bearing: 150,
      pitch: 55,
    }),
  ];

  // Create zones
  const zones: Zone[] = [
    createZone(propertyName, propertyBoundary, {
      fillColour: options.brandColour ?? 'rgba(220, 38, 38, 0.15)',
      strokeColour: options.brandColour ?? '#DC2626',
      startTime: duration * 0.2,
      endTime: duration,
    }),
  ];

  // Create routes and markers for nearby locations
  const routes: Route[] = [];
  const textMarkers: TextMarker[] = [
    createTextMarker(propertyName, [propertyCenter[0], propertyCenter[1] + 0.003], {
      fontSize: 18,
      backgroundColour: options.brandColour ?? 'rgba(220, 38, 38, 0.9)',
      iconType: 'building',
      startTime: duration * 0.25,
      endTime: duration,
    }),
  ];

  if (options.nearbyLocations) {
    options.nearbyLocations.forEach((location, index) => {
      const startTime = duration * (0.3 + index * 0.15);
      const endTime = startTime + duration * 0.2;

      // Add route
      routes.push(
        createRoute(`To ${location.name}`, [propertyCenter, location.position], {
          colour: index % 2 === 0 ? '#FFFFFF' : '#F59E0B',
          travelTime: location.travelTime,
          distance: location.distance,
          startTime,
          endTime,
        })
      );

      // Add marker
      textMarkers.push(
        createTextMarker(location.name, location.position, {
          fontSize: 14,
          iconType: 'marker',
          startTime,
          endTime,
        })
      );

      // Add travel time annotation
      if (location.travelTime) {
        const midpoint: [number, number] = [
          (propertyCenter[0] + location.position[0]) / 2,
          (propertyCenter[1] + location.position[1]) / 2,
        ];
        textMarkers.push(
          createTextMarker(location.travelTime, midpoint, {
            fontSize: 12,
            backgroundColour: 'rgba(99, 102, 241, 0.9)',
            startTime: startTime + 1,
            endTime,
          })
        );
      }
    });
  }

  return {
    version: '1.0.0',
    settings: {
      duration,
      fps: 30,
      resolution: '1080p',
    },
    mapSettings: {
      style: 'satellite',
    },
    keyframes,
    zones,
    routes,
    textMarkers,
    branding: {
      logo: options.logoUrl
        ? {
            url: options.logoUrl,
            position: 'top-left',
            width: 120,
            opacity: 0.9,
          }
        : undefined,
      watermark: {
        text: 'Propnica',
        position: 'bottom-right',
        fontSize: 12,
        colour: '#FFFFFF',
        opacity: 0.6,
      },
      colours: {
        primary: options.brandColour ?? '#DC2626',
        secondary: '#3B82F6',
        accent: '#F59E0B',
      },
    },
  };
}

// =============================================================================
// Render Function
// =============================================================================

/**
 * Render the video using Remotion
 */
async function renderVideo(
  config: ProjectConfig,
  outputPath: string,
  options: {
    quality?: 'draft' | 'standard' | 'high';
    format?: 'mp4' | 'webm' | 'gif';
  } = {}
): Promise<void> {
  const { quality = 'standard', format = 'mp4' } = options;

  // Write config to temporary file
  const configPath = path.join(process.cwd(), 'temp-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('\n========================================');
  console.log('Propnica Video Generator');
  console.log('========================================\n');
  console.log(`Property: ${config.zones[0]?.name ?? 'Custom Property'}`);
  console.log(`Duration: ${config.settings.duration} seconds`);
  console.log(`Resolution: ${config.settings.resolution}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Quality: ${quality}`);
  console.log('\n');

  // Determine CRF based on quality
  const crf = quality === 'draft' ? 28 : quality === 'standard' ? 20 : 15;

  // Build Remotion command
  const remotionCommand = [
    'npx remotion render',
    'PropertyClipComposition',
    outputPath,
    `--props="${configPath.replace(/"/g, '\\"')}"`,
    `--codec=${format === 'webm' ? 'vp8' : format === 'gif' ? 'gif' : 'h264'}`,
    `--crf=${crf}`,
    '--log=verbose',
  ].join(' ');

  console.log('Starting render...\n');

  try {
    execSync(remotionCommand, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        REMOTION_CONFIG_PATH: configPath,
      },
    });

    console.log('\n========================================');
    console.log('Render Complete!');
    console.log('========================================');
    console.log(`Output saved to: ${outputPath}`);
    console.log('\n');
  } catch (error) {
    console.error('\nRender failed:', error);
    throw error;
  } finally {
    // Cleanup temp config
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }
}

// =============================================================================
// CLI Interface
// =============================================================================

function parseArgs(): { output: string; example: string; help: boolean } {
  const args = process.argv.slice(2);
  let output = 'output/property-showcase.mp4';
  let example = 'dubai-creek-harbour';
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      output = args[i + 1] || output;
      i++;
    } else if (args[i] === '--example' || args[i] === '-e') {
      example = args[i + 1] || example;
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      help = true;
    }
  }

  return { output, example, help };
}

function printHelp(): void {
  console.log(`
Propnica - Property Showcase Video Generator

Usage:
  npx ts-node scripts/generate-property-video.ts [options]

Options:
  -o, --output <path>    Output file path (default: output/property-showcase.mp4)
  -e, --example <name>   Example to generate (default: dubai-creek-harbour)
  -h, --help             Show this help message

Examples:
  # Generate Dubai Creek Harbour sample video
  npx ts-node scripts/generate-property-video.ts

  # Generate with custom output path
  npx ts-node scripts/generate-property-video.ts --output my-property.mp4

Environment Variables:
  NEXT_PUBLIC_MAPBOX_TOKEN    Your Mapbox access token (required)

For more information, visit: https://github.com/your-org/propnica
`);
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  const { output, example, help } = parseArgs();

  if (help) {
    printHelp();
    return;
  }

  // Check for Mapbox token
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    console.error('\nError: NEXT_PUBLIC_MAPBOX_TOKEN environment variable is required.');
    console.error('Get your free token at: https://account.mapbox.com/\n');
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.dirname(output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate configuration based on example
  let config: ProjectConfig;

  switch (example) {
    case 'dubai-creek-harbour':
      config = createDubaiCreekHarbourConfig();
      break;

    case 'custom':
      // Example of custom property
      config = createCustomPropertyTemplate(
        'My Property',
        [55.2708, 25.2048], // Dubai coordinates
        [
          [55.2688, 25.2068],
          [55.2728, 25.2068],
          [55.2728, 25.2028],
          [55.2688, 25.2028],
          [55.2688, 25.2068],
        ],
        {
          duration: 45,
          nearbyLocations: [
            { name: 'Metro Station', position: [55.2750, 25.2100], travelTime: '5 min' },
            { name: 'Shopping Mall', position: [55.2650, 25.2000], travelTime: '8 min' },
          ],
          brandColour: '#3B82F6',
        }
      );
      break;

    default:
      console.error(`Unknown example: ${example}`);
      console.error('Available examples: dubai-creek-harbour, custom');
      process.exit(1);
  }

  // Render the video
  await renderVideo(config, output);
}

// Run main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

// =============================================================================
// Export for programmatic use
// =============================================================================

export type {
  ProjectConfig,
  Keyframe,
  Zone,
  Route,
  TextMarker,
};

export {
  createKeyframe,
  createZone,
  createRoute,
  createTextMarker,
  createDubaiCreekHarbourConfig,
  createCustomPropertyTemplate,
  renderVideo,
};
