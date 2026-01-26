# Propnica Video Generator

Generate professional property showcase videos with satellite map flyovers, animated boundaries, landmark labels, and travel route annotations.

## Features

- **Satellite Map Flyovers**: Smooth camera animations over Mapbox satellite imagery
- **Property Boundaries**: Animated polygon overlays highlighting your property
- **Landmark Labels**: Text markers for nearby airports, districts, and roads
- **Travel Routes**: Dashed route lines with travel time annotations
- **Professional Branding**: Logo and watermark overlays
- **High Quality Output**: 1080p/4K video rendering

## Quick Start

### 1. Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **Mapbox Token**: Get your free token at [account.mapbox.com](https://account.mapbox.com/)
- **FFmpeg**: Install via your package manager

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg
```

### 2. Setup

```bash
# Clone or download the project
cd propnica

# Install dependencies
npm install

# Set your Mapbox token
export NEXT_PUBLIC_MAPBOX_TOKEN="your-token-here"

# Or create a .env.local file
echo "NEXT_PUBLIC_MAPBOX_TOKEN=your-token-here" > .env.local
```

### 3. Generate Your First Video

```bash
# Using the shell script (recommended)
./scripts/render-video.sh

# Or using Node.js directly
node scripts/generate-video.js
```

This will render the Dubai Creek Harbour sample video to `output/property-showcase.mp4`.

## Usage

### Basic Commands

```bash
# Render with default Dubai Creek Harbour config
node scripts/generate-video.js

# Use a custom configuration file
node scripts/generate-video.js --config my-property.json

# Specify output file
node scripts/generate-video.js --output videos/my-property.mp4

# Generate a sample config file to customise
node scripts/generate-video.js --generate-sample

# Show help
node scripts/generate-video.js --help
```

### Shell Script

```bash
# Default render
./scripts/render-video.sh

# Custom config and output
./scripts/render-video.sh my-property.json output/custom.mp4
```

## Creating Your Own Property Video

### Step 1: Generate a Sample Config

```bash
node scripts/generate-video.js --generate-sample
```

This creates `my-property-config.json` which you can edit.

### Step 2: Edit the Configuration

Open `my-property-config.json` and modify:

#### Property Location
```json
{
  "zones": [
    {
      "name": "Your Property Name",
      "coordinates": [
        [longitude1, latitude1],
        [longitude2, latitude2],
        [longitude3, latitude3],
        [longitude1, latitude1]
      ]
    }
  ]
}
```

**Tip**: Use [geojson.io](https://geojson.io/) to draw your property boundary and get the coordinates.

#### Camera Keyframes
```json
{
  "keyframes": [
    {
      "name": "Opening View",
      "time": 0,
      "camera": {
        "centre": [55.27, 25.20],
        "zoom": 12,
        "bearing": 0,
        "pitch": 45
      }
    }
  ]
}
```

#### Nearby Landmarks
```json
{
  "textMarkers": [
    {
      "text": "Metro Station",
      "position": [55.28, 25.21],
      "timing": {
        "startTime": 10,
        "endTime": 30
      }
    }
  ]
}
```

#### Travel Routes
```json
{
  "routes": [
    {
      "name": "To Airport",
      "coordinates": [
        [55.27, 25.20],
        [55.35, 25.25]
      ],
      "label": {
        "travelTime": "15 minutes"
      }
    }
  ]
}
```

### Step 3: Render Your Video

```bash
node scripts/generate-video.js --config my-property-config.json --output my-property.mp4
```

## Configuration Reference

### Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `duration` | number | 30 | Video duration in seconds |
| `fps` | number | 30 | Frames per second |
| `resolution` | string | "1080p" | "720p", "1080p", or "4k" |

### Keyframes

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Keyframe name (for reference) |
| `time` | number | Start time in seconds |
| `duration` | number | Time to hold this position |
| `camera.centre` | [lng, lat] | Map centre coordinates |
| `camera.zoom` | number | Zoom level (1-20) |
| `camera.bearing` | number | Rotation in degrees (0-360) |
| `camera.pitch` | number | Tilt angle (0-85) |
| `easing` | string | Animation easing function |

**Easing Options**: `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInQuart`, `easeOutQuart`, `easeInOutQuart`, `easeInExpo`, `easeOutExpo`, `easeInOutExpo`

### Zones (Polygons)

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Zone name |
| `coordinates` | [[lng, lat]] | Polygon vertices (close the ring) |
| `style.fillColour` | string | Fill colour (CSS format) |
| `style.strokeColour` | string | Border colour |
| `style.strokeWidth` | number | Border width in pixels |
| `timing.startTime` | number | When to show |
| `timing.endTime` | number | When to hide |

### Routes

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Route name |
| `coordinates` | [[lng, lat]] | Route waypoints |
| `style.colour` | string | Line colour |
| `style.width` | number | Line width |
| `style.dashPattern` | string | "solid", "dashed", or "dotted" |
| `label.travelTime` | string | Travel time text |
| `animation.type` | string | "none", "draw", or "pulse" |

### Text Markers

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Label text |
| `position` | [lng, lat] | Marker position |
| `style.fontSize` | number | Font size in pixels |
| `style.fontColour` | string | Text colour |
| `style.backgroundColour` | string | Background colour |
| `icon.type` | string | Icon name (building, plane, etc.) |

### Branding

| Property | Type | Description |
|----------|------|-------------|
| `logo.url` | string | Logo image URL |
| `logo.position` | string | Position (top-left, etc.) |
| `logo.width` | number | Logo width in pixels |
| `watermark.text` | string | Watermark text |
| `colours.primary` | string | Primary brand colour |

## Examples

### Dubai Creek Harbour (Default)

The included sample showcases:
- 90-second video duration
- 8 camera keyframes with smooth transitions
- Property boundary with red polygon
- Routes to Airport, Downtown, and Business Bay
- Travel time annotations
- Multiple landmark labels

### Custom Property Template

```javascript
// Using the JavaScript API
const { createCustomPropertyConfig } = require('./scripts/generate-video.js');

const config = createCustomPropertyConfig({
  name: 'Marina Heights',
  centre: [55.13, 25.08],
  boundary: [
    [55.125, 25.085],
    [55.135, 25.085],
    [55.135, 25.075],
    [55.125, 25.075],
    [55.125, 25.085],
  ],
  duration: 45,
  nearbyLocations: [
    {
      name: 'Dubai Marina Mall',
      position: [55.14, 25.08],
      travelTime: '5 min',
      icon: 'shopping',
    },
    {
      name: 'JBR Beach',
      position: [55.12, 25.08],
      travelTime: '3 min',
      icon: 'water',
    },
  ],
  brandColour: '#1E40AF',
});
```

## Troubleshooting

### "Mapbox token not found"

Set your token in the environment:
```bash
export NEXT_PUBLIC_MAPBOX_TOKEN="pk.your-token-here"
```

Or create `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-token-here
```

### "FFmpeg not found"

Install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

### Video is black or map doesn't load

1. Check your Mapbox token is valid
2. Ensure you have internet connectivity
3. Check the console for Mapbox errors

### Render is very slow

- Reduce duration for testing
- Use 720p resolution initially
- Increase CRF value (lower quality, faster render)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/propnica/issues)
- **Documentation**: [Full Docs](https://docs.propnica.io)
- **Contact**: support@propnica.io

## Licence

MIT Licence - see [LICENCE](../LICENCE) for details.
