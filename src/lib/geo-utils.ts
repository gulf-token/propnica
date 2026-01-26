// ===========================================
// Geographic Utility Functions
// ===========================================

import * as turf from '@turf/turf';

/**
 * Rotate polygon coordinates around a centroid
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @param rotationDegrees Rotation angle in degrees (0-360)
 * @param centroid Optional custom pivot point, defaults to polygon centroid
 * @returns Rotated coordinates
 */
export function rotatePolygonCoordinates(
  coordinates: [number, number][],
  rotationDegrees: number,
  centroid?: [number, number]
): [number, number][] {
  if (!rotationDegrees || rotationDegrees === 0) {
    return coordinates;
  }

  try {
    // Close the polygon if not already closed
    const closedCoords = [...coordinates];
    if (
      closedCoords.length > 0 &&
      (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
        closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1])
    ) {
      closedCoords.push(closedCoords[0]);
    }

    // Create polygon
    const polygon = turf.polygon([closedCoords]);

    // Calculate centroid if not provided
    const pivot = centroid || (turf.centroid(polygon).geometry.coordinates as [number, number]);

    // Rotate the polygon
    const rotated = turf.transformRotate(polygon, rotationDegrees, { pivot });

    // Return coordinates without the closing point
    const result = rotated.geometry.coordinates[0] as [number, number][];
    return result.slice(0, -1);
  } catch (error) {
    console.warn('Error rotating polygon:', error);
    return coordinates;
  }
}

/**
 * Rotate line coordinates around a centroid
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @param rotationDegrees Rotation angle in degrees (0-360)
 * @returns Rotated coordinates
 */
export function rotateLineCoordinates(
  coordinates: [number, number][],
  rotationDegrees: number
): [number, number][] {
  if (!rotationDegrees || rotationDegrees === 0 || coordinates.length < 2) {
    return coordinates;
  }

  try {
    // Create line string
    const line = turf.lineString(coordinates);

    // Calculate centroid
    const center = turf.centroid(line).geometry.coordinates as [number, number];

    // Rotate the line
    const rotated = turf.transformRotate(line, rotationDegrees, { pivot: center });

    return rotated.geometry.coordinates as [number, number][];
  } catch (error) {
    console.warn('Error rotating line:', error);
    return coordinates;
  }
}

/**
 * Calculate the centroid of a polygon
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @returns Centroid as [lng, lat]
 */
export function getPolygonCentroid(coordinates: [number, number][]): [number, number] {
  try {
    // Close the polygon if not already closed
    const closedCoords = [...coordinates];
    if (
      closedCoords.length > 0 &&
      (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
        closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1])
    ) {
      closedCoords.push(closedCoords[0]);
    }

    const polygon = turf.polygon([closedCoords]);
    return turf.centroid(polygon).geometry.coordinates as [number, number];
  } catch (error) {
    // Fallback: calculate simple average
    const sumLng = coordinates.reduce((acc, coord) => acc + coord[0], 0);
    const sumLat = coordinates.reduce((acc, coord) => acc + coord[1], 0);
    return [sumLng / coordinates.length, sumLat / coordinates.length];
  }
}

/**
 * Calculate the centroid of a line
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @returns Centroid as [lng, lat]
 */
export function getLineCentroid(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) {
    return [0, 0];
  }
  if (coordinates.length === 1) {
    return coordinates[0];
  }

  try {
    const line = turf.lineString(coordinates);
    return turf.centroid(line).geometry.coordinates as [number, number];
  } catch (error) {
    // Fallback: calculate simple average
    const sumLng = coordinates.reduce((acc, coord) => acc + coord[0], 0);
    const sumLat = coordinates.reduce((acc, coord) => acc + coord[1], 0);
    return [sumLng / coordinates.length, sumLat / coordinates.length];
  }
}

/**
 * Shift coordinates to center them on a new point
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @param newCenter New center point [lng, lat]
 * @returns Shifted coordinates
 */
export function shiftCoordinatesToCenter(
  coordinates: [number, number][],
  newCenter: [number, number]
): [number, number][] {
  if (coordinates.length === 0) {
    return coordinates;
  }

  // Get current centroid
  const currentCenter = getPolygonCentroid(coordinates);

  // Calculate offset
  const offsetLng = newCenter[0] - currentCenter[0];
  const offsetLat = newCenter[1] - currentCenter[1];

  // Apply offset to all coordinates
  return coordinates.map((coord) => [
    coord[0] + offsetLng,
    coord[1] + offsetLat,
  ]);
}

/**
 * Shift line coordinates to center them on a new point
 * @param coordinates Array of [lng, lat] coordinate pairs
 * @param newCenter New center point [lng, lat]
 * @returns Shifted coordinates
 */
export function shiftLineToCenter(
  coordinates: [number, number][],
  newCenter: [number, number]
): [number, number][] {
  if (coordinates.length === 0) {
    return coordinates;
  }

  // Get current centroid
  const currentCenter = getLineCentroid(coordinates);

  // Calculate offset
  const offsetLng = newCenter[0] - currentCenter[0];
  const offsetLat = newCenter[1] - currentCenter[1];

  // Apply offset to all coordinates
  return coordinates.map((coord) => [
    coord[0] + offsetLng,
    coord[1] + offsetLat,
  ]);
}
