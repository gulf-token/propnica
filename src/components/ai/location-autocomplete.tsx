'use client';

/**
 * Location Autocomplete Component
 *
 * Provides location search with Mapbox geocoding suggestions.
 */

import * as React from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

export interface LocationResult {
  id: string;
  name: string;
  placeName: string;
  coordinates: [number, number];
  context?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: LocationResult) => void;
  placeholder?: string;
  proximity?: [number, number];
  country?: string;
  className?: string;
  disabled?: boolean;
}

// ===========================================
// Hook for Mapbox Geocoding
// ===========================================

function useMapboxGeocode(
  query: string,
  options: { proximity?: [number, number]; country?: string }
) {
  const [results, setResults] = React.useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const abortController = new AbortController();

    async function fetchResults() {
      setIsLoading(true);
      setError(null);

      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
          setError('Mapbox token not configured');
          return;
        }

        const params = new URLSearchParams({
          access_token: token,
          limit: '5',
          types: 'place,locality,neighborhood,address,poi',
        });

        if (options.proximity) {
          params.set('proximity', options.proximity.join(','));
        }

        if (options.country) {
          params.set('country', options.country);
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          debouncedQuery
        )}.json?${params}`;

        const response = await fetch(url, { signal: abortController.signal });

        if (!response.ok) {
          throw new Error('Geocoding request failed');
        }

        const data = await response.json();

        const locations: LocationResult[] = data.features.map(
          (feature: {
            id: string;
            text: string;
            place_name: string;
            center: [number, number];
            context?: Array<{ text: string }>;
          }) => ({
            id: feature.id,
            name: feature.text,
            placeName: feature.place_name,
            coordinates: feature.center,
            context: feature.context?.map((c) => c.text).join(', '),
          })
        );

        setResults(locations);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError('Failed to fetch locations');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, options.proximity, options.country]);

  return { results, isLoading, error };
}

// ===========================================
// useDebounce Hook (if not already exists)
// ===========================================

// This might already exist in hooks, if not we define it inline
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ===========================================
// Component
// ===========================================

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a location...',
  proximity,
  country,
  className,
  disabled = false,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const { results, isLoading, error } = useMapboxGeocode(value, {
    proximity,
    country,
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (location: LocationResult) => {
    onChange(location.placeName);
    onSelect(location);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Show dropdown when typing
  React.useEffect(() => {
    if (value.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  }, [value, results.length]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // Delay to allow click on results
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-8"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (results.length > 0 || error) && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {error ? (
            <li className="px-3 py-2 text-sm text-destructive">{error}</li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.id}
                onClick={() => handleSelect(result)}
                className={cn(
                  'px-3 py-2 cursor-pointer hover:bg-muted transition-colors',
                  index === selectedIndex && 'bg-muted'
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{result.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.placeName}
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default LocationAutocomplete;
