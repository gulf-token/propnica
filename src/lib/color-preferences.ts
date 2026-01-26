// ===========================================
// Color Preferences - Remember Last Used Colors
// ===========================================

const STORAGE_KEY = 'propnica-color-preferences';

export interface ColorPreferences {
  zone: {
    fillColour: string;
    fillOpacity: number;
    strokeColour: string;
    strokeWidth: number;
  };
  route: {
    colour: string;
    width: number;
    opacity: number;
  };
  textMarker: {
    backgroundColour: string;
    fontColour: string;
  };
}

const DEFAULT_PREFERENCES: ColorPreferences = {
  zone: {
    fillColour: '#3B82F6',
    fillOpacity: 0.3,
    strokeColour: '#3B82F6',
    strokeWidth: 2,
  },
  route: {
    colour: '#EF4444',
    width: 4,
    opacity: 1,
  },
  textMarker: {
    backgroundColour: '#1F2937',
    fontColour: '#FFFFFF',
  },
};

/**
 * Get saved color preferences from localStorage
 */
export function getColorPreferences(): ColorPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(stored);
    return {
      zone: { ...DEFAULT_PREFERENCES.zone, ...parsed.zone },
      route: { ...DEFAULT_PREFERENCES.route, ...parsed.route },
      textMarker: { ...DEFAULT_PREFERENCES.textMarker, ...parsed.textMarker },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save zone color preferences
 */
export function saveZoneColors(colors: Partial<ColorPreferences['zone']>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getColorPreferences();
    const updated: ColorPreferences = {
      ...current,
      zone: { ...current.zone, ...colors },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save route color preferences
 */
export function saveRouteColors(colors: Partial<ColorPreferences['route']>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getColorPreferences();
    const updated: ColorPreferences = {
      ...current,
      route: { ...current.route, ...colors },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save text marker color preferences
 */
export function saveTextMarkerColors(colors: Partial<ColorPreferences['textMarker']>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getColorPreferences();
    const updated: ColorPreferences = {
      ...current,
      textMarker: { ...current.textMarker, ...colors },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
