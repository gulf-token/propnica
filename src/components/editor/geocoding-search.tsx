'use client';

import * as React from 'react';
import { Search, MapPin, Building2, Navigation, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, ScrollArea } from '@/components/ui';

// ===========================================
// Types
// ===========================================

export interface GeocodingResult {
  id: string;
  place_name: string;
  text: string;
  centre: [number, number];
  place_type: string[];
  context?: Array<{
    id: string;
    text: string;
  }>;
  properties?: {
    accuracy?: string;
    address?: string;
  };
}

export interface GeocodingSearchProps {
  onSelect: (result: GeocodingResult) => void;
  onFlyTo?: (centre: [number, number], zoom?: number) => void;
  placeholder?: string;
  className?: string;
}

// ===========================================
// Mapbox Geocoding API Service
// ===========================================

async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Mapbox access token not configured');
    return [];
  }

  try {
    // Bias towards UAE for property focus
    const proximity = '55.2708,25.2048'; // Dubai coordinates

    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    );
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('proximity', proximity);
    url.searchParams.set('limit', '8');
    // Note: Removed restrictive types filter for better POI/landmark results
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    return data.features.map((feature: any) => ({
      id: feature.id,
      place_name: feature.place_name,
      text: feature.text,
      centre: feature.center,
      place_type: feature.place_type,
      context: feature.context,
      properties: feature.properties,
    }));
  } catch (error) {
    console.error('Geocoding search error:', error);
    return [];
  }
}

// ===========================================
// Debounce Hook
// ===========================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ===========================================
// Get Icon for Place Type
// ===========================================

function getPlaceIcon(placeTypes: string[]) {
  if (placeTypes.includes('poi')) {
    return <Building2 className="w-4 h-4" />;
  }
  if (placeTypes.includes('address')) {
    return <MapPin className="w-4 h-4" />;
  }
  return <Navigation className="w-4 h-4" />;
}

// ===========================================
// Format Place Context
// ===========================================

function formatContext(result: GeocodingResult): string {
  if (!result.context || result.context.length === 0) {
    return '';
  }

  // Extract meaningful context parts
  const parts = result.context
    .filter((ctx) => {
      const type = ctx.id.split('.')[0];
      return ['locality', 'place', 'region', 'country'].includes(type);
    })
    .map((ctx) => ctx.text)
    .slice(0, 2);

  return parts.join(', ');
}

// ===========================================
// Geocoding Search Component
// ===========================================

export function GeocodingSearch({
  onSelect,
  onFlyTo,
  placeholder = 'Search for an address or place...',
  className,
}: GeocodingSearchProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const debouncedQuery = useDebounce(query, 300);

  // ===========================================
  // Search Effect
  // ===========================================

  React.useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const searchResults = await searchPlaces(debouncedQuery);
      setResults(searchResults);
      setIsLoading(false);
      setIsOpen(searchResults.length > 0);
      setSelectedIndex(-1);
    };

    performSearch();
  }, [debouncedQuery]);

  // ===========================================
  // Click Outside Handler
  // ===========================================

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===========================================
  // Keyboard Navigation
  // ===========================================

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // ===========================================
  // Selection Handler
  // ===========================================

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.text);
    setIsOpen(false);
    onSelect(result);

    if (onFlyTo) {
      // Determine zoom level based on place type
      const zoom = result.place_type.includes('address')
        ? 17
        : result.place_type.includes('poi')
          ? 16
          : result.place_type.includes('neighborhood')
            ? 15
            : result.place_type.includes('locality')
              ? 14
              : 12;

      onFlyTo(result.centre, zoom);
    }
  };

  // ===========================================
  // Clear Handler
  // ===========================================

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // ===========================================
  // Render
  // ===========================================

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {(query || isLoading) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[300px]">
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2 text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <span className="mt-0.5 text-muted-foreground shrink-0">
                    {getPlaceIcon(result.place_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.text}</div>
                    {formatContext(result) && (
                      <div className="text-sm text-muted-foreground truncate">
                        {formatContext(result)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* No Results Message */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}

// ===========================================
// Compact Search Bar (for toolbar integration)
// ===========================================

export interface CompactSearchProps {
  onSelect: (result: GeocodingResult) => void;
  onFlyTo?: (centre: [number, number], zoom?: number) => void;
}

export function CompactGeocodingSearch({ onSelect, onFlyTo }: CompactSearchProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Click outside to collapse
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (result: GeocodingResult) => {
    onSelect(result);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsExpanded(true)}
        title="Search for location (Ctrl+F)"
      >
        <Search className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="w-[300px]">
      <GeocodingSearch
        onSelect={handleSelect}
        onFlyTo={onFlyTo}
        placeholder="Search address..."
      />
    </div>
  );
}
