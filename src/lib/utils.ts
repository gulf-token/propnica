import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import { CameraState, EasingType } from '@/types';

// ===========================================
// Class Name Utilities
// ===========================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===========================================
// ID Generation
// ===========================================

export function generateId(): string {
  return uuidv4();
}

export function generateShortId(): string {
  return uuidv4().split('-')[0];
}

// ===========================================
// Easing Functions
// ===========================================

export const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - --t * t * t * t,
  easeInOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
};

// ===========================================
// Number Interpolation
// ===========================================

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// ===========================================
// Bearing Interpolation (handles wraparound)
// ===========================================

export function interpolateBearing(start: number, end: number, t: number): number {
  // Normalise to 0-360
  start = ((start % 360) + 360) % 360;
  end = ((end % 360) + 360) % 360;

  // Find shortest path
  let diff = end - start;
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  const result = start + diff * t;
  return ((result % 360) + 360) % 360;
}

// ===========================================
// Camera State Interpolation
// ===========================================

export function interpolateCameraState(
  from: CameraState,
  to: CameraState,
  t: number,
  easing: EasingType = 'linear'
): CameraState {
  const easedT = easingFunctions[easing](t);

  return {
    centre: [
      lerp(from.centre[0], to.centre[0], easedT),
      lerp(from.centre[1], to.centre[1], easedT),
    ],
    zoom: lerp(from.zoom, to.zoom, easedT),
    bearing: interpolateBearing(from.bearing, to.bearing, easedT),
    pitch: lerp(from.pitch, to.pitch, easedT),
  };
}

// ===========================================
// Time Formatting
// ===========================================

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function parseTime(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const [mins, secsPart] = parts;
    const [secs, ms] = secsPart.split('.');
    return (
      parseInt(mins) * 60 +
      parseInt(secs) +
      (ms ? parseInt(ms) / 100 : 0)
    );
  }
  return parseFloat(timeString);
}

// ===========================================
// File Size Formatting
// ===========================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===========================================
// Date Formatting
// ===========================================

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return formatDate(d);
}

// ===========================================
// Coordinate Utilities
// ===========================================

export function formatCoordinate(value: number, type: 'lat' | 'lng'): string {
  const direction = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const absValue = Math.abs(value);
  const degrees = Math.floor(absValue);
  const minutes = Math.floor((absValue - degrees) * 60);
  const seconds = ((absValue - degrees - minutes / 60) * 3600).toFixed(2);
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export function formatCoordinateDecimal(value: number): string {
  return value.toFixed(6);
}

export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  // Haversine formula
  const R = 6371e3; // Earth radius in metres
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1000).toFixed(2)} km`;
}

export function calculateTravelTime(metres: number, speedKmh: number = 50): string {
  const hours = metres / 1000 / speedKmh;
  const minutes = Math.round(hours * 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ===========================================
// Polygon Utilities
// ===========================================

export function calculatePolygonCentroid(
  coordinates: [number, number][]
): [number, number] {
  if (coordinates.length === 0) return [0, 0];

  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of coordinates) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / coordinates.length, sumLat / coordinates.length];
}

export function calculatePolygonArea(coordinates: [number, number][]): number {
  // Shoelace formula (approximate, works for small areas)
  if (coordinates.length < 3) return 0;

  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }

  // Convert to square metres (very rough approximation)
  return Math.abs(area / 2) * 111319.9 * 111319.9;
}

// ===========================================
// Colour Utilities
// ===========================================

export function hexToRgba(hex: string, opacity: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${opacity})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
}

export function rgbaToHex(rgba: string): string {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function lightenColour(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export function darkenColour(hex: string, percent: number): string {
  return lightenColour(hex, -percent);
}

// ===========================================
// Debounce and Throttle
// ===========================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ===========================================
// Validation Utilities
// ===========================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidHexColour(colour: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colour);
}

// ===========================================
// Array Utilities
// ===========================================

export function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export function moveItem<T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const newArray = [...array];
  const item = newArray.splice(fromIndex, 1)[0];
  newArray.splice(toIndex, 0, item);
  return newArray;
}

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<K, T[]>
  );
}

// ===========================================
// Storage Utilities
// ===========================================

export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    console.error('Failed to remove from localStorage');
  }
}
