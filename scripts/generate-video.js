#!/usr/bin/env node
/**
 * Propnica - Property Showcase Video Generator
 *
 * Generate professional property showcase videos similar to the Dubai Creek Harbour
 * sample, featuring satellite map flyovers, animated polygon boundaries, text labels,
 * and travel route annotations.
 *
 * Usage:
 *   node scripts/generate-video.js                              # Use default config
 *   node scripts/generate-video.js --config my-property.json    # Custom config
 *   node scripts/generate-video.js --output my-video.mp4        # Custom output
 *   node scripts/generate-video.js --help                       # Show help
 *
 * Requirements:
 *   - Node.js 18+
 *   - Mapbox Access Token (NEXT_PUBLIC_MAPBOX_TOKEN environment variable)
 *   - FFmpeg installed on your system
 *
 * @version 1.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CONFIG = path.join(PROJECT_ROOT, 'examples', 'dubai-creek-harbour.json');
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, 'output', 'property-showcase.mp4');

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Print coloured output
 */
function log(message, colour = 'reset') {
  const colours = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
  };
  console.log(`${colours[colour] || colours.reset}${message}${colours.reset}`);
}

/**
 * Print a divider line
 */
function divider() {
  console.log('========================================');
}

// =============================================================================
// Configuration Builders
// =============================================================================

/**
 * Create a keyframe configuration
 *
 * @param {string} name - Keyframe name
 * @param {number} time - Start time in seconds
 * @param {[number, number]} centre - Map centre [longitude, latitude]
 * @param {number} zoom - Zoom level (1-20)
 * @param {Object} options - Additional options
 * @returns {Object} Keyframe configuration
 */
function createKeyframe(name, time, centre, zoom, options = {}) {
  return {
    id: generateId(),
    name,
    time,
    duration: options.duration || 3,
    camera: {
      centre,
      zoom,
      bearing: options.bearing || 0,
      pitch: options.pitch || 45,
    },
    easing: options.easing || 'easeInOutCubic',
  };
}

/**
 * Create a zone (polygon) configuration
 *
 * @param {string} name - Zone name
 * @param {Array<[number, number]>} coordinates - Polygon coordinates
 * @param {Object} options - Style and timing options
 * @returns {Object} Zone configuration
 */
function createZone(name, coordinates, options = {}) {
  return {
    id: generateId(),
    name,
    coordinates,
    style: {
      fillColour: options.fillColour || 'rgba(220, 38, 38, 0.15)',
      fillOpacity: options.fillOpacity || 0.15,
      strokeColour: options.strokeColour || '#DC2626',
      strokeWidth: options.strokeWidth || 3,
      strokeOpacity: options.strokeOpacity || 1,
    },
    label: {
      text: options.labelText || name,
      fontSize: options.labelFontSize || 16,
      fontColour: options.labelFontColour || '#FFFFFF',
      visible: options.labelVisible !== false,
    },
    timing: {
      startTime: options.startTime || 0,
      endTime: options.endTime || 90,
      fadeInDuration: options.fadeInDuration || 0.5,
      fadeOutDuration: options.fadeOutDuration || 0.5,
    },
  };
}

/**
 * Create a route configuration
 *
 * @param {string} name - Route name
 * @param {Array<[number, number]>} coordinates - Route waypoints
 * @param {Object} options - Style and animation options
 * @returns {Object} Route configuration
 */
function createRoute(name, coordinates, options = {}) {
  return {
    id: generateId(),
    name,
    coordinates,
    style: {
      colour: options.colour || '#FFFFFF',
      width: options.width || 4,
      opacity: options.opacity || 1,
      dashPattern: options.dashPattern || 'dashed',
    },
    label: {
      text: name,
      travelTime: options.travelTime,
      distance: options.distance,
      visible: options.labelVisible !== false,
    },
    animation: {
      type: options.animationType || 'draw',
      duration: options.animationDuration || 2,
    },
    timing: {
      startTime: options.startTime || 0,
      endTime: options.endTime || 90,
      fadeInDuration: options.fadeInDuration || 0.5,
      fadeOutDuration: options.fadeOutDuration || 0.5,
    },
  };
}

/**
 * Create a text marker configuration
 *
 * @param {string} text - Marker text
 * @param {[number, number]} position - Position [longitude, latitude]
 * @param {Object} options - Style options
 * @returns {Object} Text marker configuration
 */
function createTextMarker(text, position, options = {}) {
  const marker = {
    id: generateId(),
    position,
    text,
    style: {
      fontFamily: options.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: options.fontSize || 14,
      fontColour: options.fontColour || '#FFFFFF',
      fontWeight: options.fontWeight || 'bold',
      backgroundColour: options.backgroundColour || 'rgba(0, 0, 0, 0.7)',
      backgroundOpacity: options.backgroundOpacity || 0.8,
      padding: options.padding || 8,
      borderRadius: options.borderRadius || 4,
    },
    timing: {
      startTime: options.startTime || 0,
      endTime: options.endTime || 90,
      fadeInDuration: options.fadeInDuration || 0.5,
      fadeOutDuration: options.fadeOutDuration || 0.5,
    },
  };

  if (options.iconType) {
    marker.icon = {
      type: options.iconType,
      colour: options.iconColour || '#FFFFFF',
      size: options.iconSize || 24,
    };
  }

  return marker;
}

// =============================================================================
// Dubai Creek Harbour Sample Configuration
// =============================================================================

/**
 * Create the Dubai Creek Harbour sample configuration
 * This replicates the original sample video with all features
 *
 * @returns {Object} Complete project configuration
 */
function createDubaiCreekHarbourConfig() {
  // Property centre coordinates
  const propertyCenter = [55.3477, 25.2069];

  // Key locations
  const locations = {
    dubaiInternationalAirport: [55.3644, 25.2532],
    downtownDubai: [55.2744, 25.1972],
    businessBay: [55.2653, 25.1857],
    dubaiCreek: [55.3197, 25.2622],
    festivalCity: [55.3533, 25.2244],
    rasAlKhorRoad: [55.3747, 25.1897],
  };

  // Property boundary polygon
  const propertyBoundary = [
    [55.3397, 25.2119],
    [55.3557, 25.2119],
    [55.3577, 25.2039],
    [55.3537, 25.1999],
    [55.3417, 25.1999],
    [55.3377, 25.2039],
    [55.3397, 25.2119],
  ];

  // Creek Tower highlight area
  const creekTowerArea = [
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
      // Opening wide view of Dubai
      createKeyframe('Wide Dubai View', 0, [55.15, 25.12], 10.5, {
        bearing: 0,
        pitch: 0,
        duration: 5,
        easing: 'easeOutCubic',
      }),
      // Zoom towards Dubai Creek
      createKeyframe('Approach Dubai Creek', 8, [55.30, 25.20], 12, {
        bearing: 30,
        pitch: 45,
        duration: 6,
      }),
      // Focus on property
      createKeyframe('Dubai Creek Harbour Overview', 18, propertyCenter, 14, {
        bearing: 45,
        pitch: 50,
        duration: 8,
      }),
      // Show property boundary
      createKeyframe('Property Boundary View', 28, propertyCenter, 15, {
        bearing: 60,
        pitch: 55,
        duration: 10,
      }),
      // Pan to show airport
      createKeyframe('Airport Connection', 42, [55.36, 25.23], 13, {
        bearing: 15,
        pitch: 45,
        duration: 8,
      }),
      // Pan to show Downtown
      createKeyframe('Downtown Connection', 54, [55.31, 25.20], 13, {
        bearing: -30,
        pitch: 45,
        duration: 8,
      }),
      // Return to property
      createKeyframe('Return to Property', 66, propertyCenter, 14.5, {
        bearing: 90,
        pitch: 50,
        duration: 10,
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
      // Main property boundary (red)
      createZone('Dubai Creek Harbour', propertyBoundary, {
        fillColour: 'rgba(220, 38, 38, 0.15)',
        strokeColour: '#DC2626',
        strokeWidth: 4,
        labelText: 'DUBAI CREEK HARBOUR',
        startTime: 15,
        endTime: 90,
      }),
      // Creek Tower area (blue)
      createZone('Dubai Creek Tower', creekTowerArea, {
        fillColour: 'rgba(59, 130, 246, 0.25)',
        strokeColour: '#3B82F6',
        strokeWidth: 3,
        labelText: 'DUBAI CREEK TOWER',
        startTime: 25,
        endTime: 90,
      }),
    ],
    routes: [
      // Route to Airport
      createRoute('To Airport', [
        propertyCenter,
        [55.3550, 25.2200],
        [55.3600, 25.2400],
        locations.dubaiInternationalAirport,
      ], {
        colour: '#FFFFFF',
        travelTime: '15 minutes',
        distance: '8 km',
        startTime: 38,
        endTime: 55,
      }),
      // Route to Downtown
      createRoute('To Downtown', [
        propertyCenter,
        [55.3200, 25.2050],
        [55.2900, 25.2000],
        locations.downtownDubai,
      ], {
        colour: '#F59E0B',
        travelTime: '10 minutes',
        distance: '6 km',
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
        travelTime: '12 minutes',
        distance: '7 km',
        startTime: 60,
        endTime: 78,
      }),
    ],
    textMarkers: [
      // Property name
      createTextMarker('Dubai Creek Harbour', [55.3477, 25.2100], {
        fontSize: 18,
        backgroundColour: 'rgba(220, 38, 38, 0.9)',
        iconType: 'building',
        startTime: 18,
        endTime: 90,
      }),
      // Airport
      createTextMarker('Dubai International Airport', locations.dubaiInternationalAirport, {
        backgroundColour: 'rgba(0, 0, 0, 0.8)',
        iconType: 'plane',
        iconColour: '#60A5FA',
        startTime: 38,
        endTime: 55,
      }),
      // Downtown
      createTextMarker('Downtown Dubai', locations.downtownDubai, {
        backgroundColour: 'rgba(0, 0, 0, 0.8)',
        iconType: 'building',
        iconColour: '#F59E0B',
        startTime: 50,
        endTime: 68,
      }),
      // Burj Khalifa
      createTextMarker('Burj Khalifa', [55.2744, 25.1975], {
        fontSize: 12,
        backgroundColour: 'rgba(245, 158, 11, 0.9)',
        iconType: 'landmark',
        startTime: 52,
        endTime: 68,
      }),
      // Business Bay
      createTextMarker('Business Bay', locations.businessBay, {
        backgroundColour: 'rgba(0, 0, 0, 0.8)',
        iconType: 'briefcase',
        iconColour: '#10B981',
        startTime: 60,
        endTime: 78,
      }),
      // Dubai Creek
      createTextMarker('Dubai Creek', locations.dubaiCreek, {
        fontSize: 12,
        backgroundColour: 'rgba(59, 130, 246, 0.8)',
        iconType: 'water',
        startTime: 8,
        endTime: 40,
      }),
      // Travel time labels
      createTextMarker('15 min', [55.3580, 25.2350], {
        backgroundColour: 'rgba(99, 102, 241, 0.9)',
        startTime: 42,
        endTime: 55,
      }),
      createTextMarker('10 min', [55.3050, 25.2020], {
        fontColour: '#1F2937',
        backgroundColour: 'rgba(245, 158, 11, 0.9)',
        startTime: 54,
        endTime: 68,
      }),
      createTextMarker('12 min', [55.2880, 25.1900], {
        backgroundColour: 'rgba(16, 185, 129, 0.9)',
        startTime: 62,
        endTime: 78,
      }),
    ],
    branding: {
      logo: {
        url: '/logo.png',
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
// Custom Property Configuration Builder
// =============================================================================

/**
 * Create a custom property video configuration
 *
 * @param {Object} params - Property parameters
 * @param {string} params.name - Property name
 * @param {[number, number]} params.centre - Property centre coordinates
 * @param {Array<[number, number]>} params.boundary - Property boundary polygon
 * @param {number} [params.duration=60] - Video duration in seconds
 * @param {Array} [params.nearbyLocations] - Nearby points of interest
 * @param {string} [params.brandColour] - Primary brand colour
 * @param {string} [params.logoUrl] - Logo URL
 * @returns {Object} Complete project configuration
 */
function createCustomPropertyConfig(params) {
  const {
    name,
    centre,
    boundary,
    duration = 60,
    nearbyLocations = [],
    brandColour = '#DC2626',
    logoUrl,
  } = params;

  // Auto-generate keyframes
  const keyframes = [
    createKeyframe('Opening', 0, [centre[0], centre[1] - 0.05], 11, {
      bearing: 0,
      pitch: 30,
      duration: 4,
    }),
    createKeyframe('Approach', duration * 0.12, centre, 13, {
      bearing: 30,
      pitch: 45,
      duration: 5,
    }),
    createKeyframe('Overview', duration * 0.25, centre, 15, {
      bearing: 60,
      pitch: 55,
      duration: 8,
    }),
    createKeyframe('Detail', duration * 0.45, centre, 16, {
      bearing: 90,
      pitch: 60,
      duration: 10,
    }),
    createKeyframe('Surroundings', duration * 0.65, centre, 14, {
      bearing: 120,
      pitch: 50,
      duration: 8,
    }),
    createKeyframe('Final', duration * 0.85, centre, 15, {
      bearing: 150,
      pitch: 55,
      duration: 8,
      easing: 'easeOutCubic',
    }),
  ];

  // Create property zone
  const zones = [
    createZone(name, boundary, {
      fillColour: brandColour.replace(')', ', 0.15)').replace('rgb', 'rgba'),
      strokeColour: brandColour,
      startTime: duration * 0.2,
      endTime: duration,
    }),
  ];

  // Create markers and routes for nearby locations
  const routes = [];
  const textMarkers = [
    createTextMarker(name, [centre[0], centre[1] + 0.003], {
      fontSize: 18,
      backgroundColour: brandColour,
      iconType: 'building',
      startTime: duration * 0.2,
      endTime: duration,
    }),
  ];

  nearbyLocations.forEach((loc, index) => {
    const startTime = duration * (0.3 + index * 0.12);
    const endTime = Math.min(startTime + duration * 0.18, duration);

    routes.push(
      createRoute(`To ${loc.name}`, [centre, loc.position], {
        colour: index % 2 === 0 ? '#FFFFFF' : '#F59E0B',
        travelTime: loc.travelTime,
        distance: loc.distance,
        startTime,
        endTime,
      })
    );

    textMarkers.push(
      createTextMarker(loc.name, loc.position, {
        iconType: loc.icon || 'marker',
        startTime,
        endTime,
      })
    );

    if (loc.travelTime) {
      const midpoint = [
        (centre[0] + loc.position[0]) / 2,
        (centre[1] + loc.position[1]) / 2,
      ];
      textMarkers.push(
        createTextMarker(loc.travelTime, midpoint, {
          fontSize: 12,
          backgroundColour: 'rgba(99, 102, 241, 0.9)',
          startTime: startTime + 1,
          endTime,
        })
      );
    }
  });

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
      logo: logoUrl ? {
        url: logoUrl,
        position: 'top-left',
        width: 120,
        opacity: 0.9,
      } : undefined,
      watermark: {
        text: 'Propnica',
        position: 'bottom-right',
        fontSize: 12,
        colour: '#FFFFFF',
        opacity: 0.6,
      },
      colours: {
        primary: brandColour,
        secondary: '#3B82F6',
        accent: '#F59E0B',
      },
    },
  };
}

// =============================================================================
// CLI Interface
// =============================================================================

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    config: DEFAULT_CONFIG,
    output: DEFAULT_OUTPUT,
    generateSample: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '-c':
      case '--config':
        options.config = next || options.config;
        i++;
        break;
      case '-o':
      case '--output':
        options.output = next || options.output;
        i++;
        break;
      case '-g':
      case '--generate-sample':
        options.generateSample = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Propnica - Property Showcase Video Generator

Generate professional property showcase videos with satellite map flyovers,
animated boundaries, landmark labels, and travel route annotations.

USAGE:
  node scripts/generate-video.js [options]

OPTIONS:
  -c, --config <file>      Configuration JSON file (default: examples/dubai-creek-harbour.json)
  -o, --output <file>      Output video file (default: output/property-showcase.mp4)
  -g, --generate-sample    Generate sample config file and exit
  -h, --help               Show this help message

EXAMPLES:
  # Render the Dubai Creek Harbour sample video
  node scripts/generate-video.js

  # Use a custom configuration
  node scripts/generate-video.js --config my-property.json --output my-video.mp4

  # Generate a sample configuration file to customise
  node scripts/generate-video.js --generate-sample

ENVIRONMENT VARIABLES:
  NEXT_PUBLIC_MAPBOX_TOKEN    Your Mapbox access token (required)
                              Get one free at: https://account.mapbox.com/

CONFIGURATION FILE FORMAT:
  See examples/dubai-creek-harbour.json for a complete example.

  Key sections:
  - settings: duration, fps, resolution
  - keyframes: camera positions and timing
  - zones: polygon boundaries
  - routes: travel paths with timing
  - textMarkers: labels and annotations
  - branding: logo and watermark

For more information: https://github.com/your-org/propnica
`);
}

/**
 * Check prerequisites
 */
function checkPrerequisites() {
  // Check Node version
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
  if (nodeVersion < 18) {
    log(`Error: Node.js 18+ required (found ${process.version})`, 'red');
    process.exit(1);
  }
  log(`[OK] Node.js ${process.version}`, 'green');

  // Check Mapbox token
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    // Try loading from .env files
    const envFiles = ['.env', '.env.local'];
    for (const envFile of envFiles) {
      const envPath = path.join(PROJECT_ROOT, envFile);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/NEXT_PUBLIC_MAPBOX_TOKEN=(.+)/);
        if (match) {
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN = match[1].trim();
          break;
        }
      }
    }
  }

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    log('Error: Mapbox token not found', 'red');
    console.log('\nSet your token with:');
    console.log('  export NEXT_PUBLIC_MAPBOX_TOKEN="your-token-here"\n');
    console.log('Or create a .env.local file with:');
    console.log('  NEXT_PUBLIC_MAPBOX_TOKEN=your-token-here\n');
    console.log('Get your free token at: https://account.mapbox.com/\n');
    process.exit(1);
  }
  log('[OK] Mapbox token configured', 'green');

  // Check for node_modules
  if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules'))) {
    log('Installing dependencies...', 'yellow');
    execSync('npm install', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  }
  log('[OK] Dependencies installed', 'green');
}

/**
 * Render the video
 */
async function renderVideo(configPath, outputPath) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load and validate config
  if (!fs.existsSync(configPath)) {
    log(`Error: Configuration file not found: ${configPath}`, 'red');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log('\nConfiguration:');
  console.log(`  Duration: ${config.settings?.duration || 30}s`);
  console.log(`  Resolution: ${config.settings?.resolution || '1080p'}`);
  console.log(`  Keyframes: ${config.keyframes?.length || 0}`);
  console.log(`  Zones: ${config.zones?.length || 0}`);
  console.log(`  Routes: ${config.routes?.length || 0}`);
  console.log(`  Markers: ${config.textMarkers?.length || 0}`);
  console.log('');

  log('Starting render...', 'yellow');
  console.log('');

  try {
    // Build Remotion command
    const args = [
      'remotion',
      'render',
      'src/remotion/index.ts',
      'PropertyClipComposition',
      outputPath,
      `--props=${configPath}`,
      '--codec=h264',
      '--crf=18',
      '--log=verbose',
    ];

    // Run render
    execSync(`npx ${args.join(' ')}`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: process.env,
    });

    console.log('');
    divider();
    log('  Render Complete!', 'green');
    divider();
    console.log('');
    log(`Output: ${outputPath}`, 'blue');

    // Show file info
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`Size: ${sizeMB} MB`);
    }
    console.log('');

  } catch (error) {
    log('Render failed!', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    return;
  }

  console.log('');
  divider();
  log('  Propnica Video Generator', 'blue');
  divider();
  console.log('');

  // Generate sample config if requested
  if (options.generateSample) {
    const sampleConfig = createDubaiCreekHarbourConfig();
    const outputPath = path.join(PROJECT_ROOT, 'my-property-config.json');
    fs.writeFileSync(outputPath, JSON.stringify(sampleConfig, null, 2));
    log(`Sample configuration saved to: ${outputPath}`, 'green');
    console.log('\nEdit this file to customise your property video, then run:');
    console.log(`  node scripts/generate-video.js --config ${outputPath}\n`);
    return;
  }

  // Check prerequisites
  checkPrerequisites();

  // Resolve paths
  const configPath = path.isAbsolute(options.config)
    ? options.config
    : path.resolve(process.cwd(), options.config);

  const outputPath = path.isAbsolute(options.output)
    ? options.output
    : path.resolve(process.cwd(), options.output);

  log(`[OK] Config: ${configPath}`, 'green');
  log(`[OK] Output: ${outputPath}`, 'green');

  // Render
  await renderVideo(configPath, outputPath);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// =============================================================================
// Exports for Programmatic Use
// =============================================================================

module.exports = {
  createKeyframe,
  createZone,
  createRoute,
  createTextMarker,
  createDubaiCreekHarbourConfig,
  createCustomPropertyConfig,
};
