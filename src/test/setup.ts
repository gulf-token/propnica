// ===========================================
// Test Setup for Vitest
// ===========================================

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
});

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      removeControl: vi.fn(),
      flyTo: vi.fn(),
      easeTo: vi.fn(),
      getCenter: vi.fn(() => ({ lng: 55.2708, lat: 25.2048 })),
      getZoom: vi.fn(() => 14),
      getBearing: vi.fn(() => 0),
      getPitch: vi.fn(() => 0),
      setBearing: vi.fn(),
      setPitch: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      resize: vi.fn(),
      getCanvas: vi.fn(() => document.createElement('canvas')),
      getContainer: vi.fn(() => document.createElement('div')),
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    GeolocateControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    Popup: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setHTML: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
  },
  Map: vi.fn(),
  NavigationControl: vi.fn(),
  ScaleControl: vi.fn(),
}));

// Console error suppression for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
