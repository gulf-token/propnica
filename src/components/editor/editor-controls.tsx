'use client';

import * as React from 'react';
import {
  Monitor,
  Smartphone,
  Square,
  Film,
  MapPin,
  ChevronDown,
  Layers,
  Navigation,
  Search,
} from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  ScrollArea,
  Input,
} from '@/components/ui';
import { useProjectStore } from '@/stores';
import {
  AspectRatioPreset,
  ASPECT_RATIO_PRESETS,
  MapStyle,
  MAP_STYLE_LABELS,
  MajorCity,
  getCitiesByDistance,
  calculateResolution,
} from '@/types';
import { cn } from '@/lib/utils';

// ===========================================
// Aspect Ratio Selector
// ===========================================

interface AspectRatioSelectorProps {
  value: AspectRatioPreset;
  onChange: (value: AspectRatioPreset) => void;
  resolution?: string;
}

export function AspectRatioSelector({
  value,
  onChange,
  resolution = '1080p',
}: AspectRatioSelectorProps) {
  const getIcon = (ratio: AspectRatioPreset) => {
    if (ratio === 'custom' || !ratio) return <Monitor className="h-3 w-3" />;
    const config = ASPECT_RATIO_PRESETS[ratio as Exclude<AspectRatioPreset, 'custom'>];
    if (!config) return <Monitor className="h-3 w-3" />;
    if (config.category === 'portrait') return <Smartphone className="h-3 w-3" />;
    if (config.category === 'square') return <Square className="h-3 w-3" />;
    if (config.category === 'cinematic') return <Film className="h-3 w-3" />;
    return <Monitor className="h-3 w-3" />;
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] h-8">
        <div className="flex items-center gap-2">
          {getIcon(value)}
          <SelectValue placeholder="Aspect Ratio" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="16:9">
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            <span>Landscape (16:9)</span>
          </div>
        </SelectItem>
        <SelectItem value="9:16">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            <span>Portrait (9:16)</span>
          </div>
        </SelectItem>
        <SelectItem value="1:1">
          <div className="flex items-center gap-2">
            <Square className="h-3 w-3" />
            <span>Square (1:1)</span>
          </div>
        </SelectItem>
        <Separator className="my-1" />
        <SelectItem value="4:3">
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            <span>Classic (4:3)</span>
          </div>
        </SelectItem>
        <SelectItem value="3:4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            <span>Portrait Classic (3:4)</span>
          </div>
        </SelectItem>
        <SelectItem value="4:5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            <span>Instagram (4:5)</span>
          </div>
        </SelectItem>
        <SelectItem value="2:3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            <span>Photo Portrait (2:3)</span>
          </div>
        </SelectItem>
        <Separator className="my-1" />
        <SelectItem value="21:9">
          <div className="flex items-center gap-2">
            <Film className="h-3 w-3" />
            <span>Cinematic (21:9)</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ===========================================
// Map Style Selector
// ===========================================

interface MapStyleSelectorProps {
  value: MapStyle;
  onChange: (value: MapStyle) => void;
}

export function MapStyleSelector({ value, onChange }: MapStyleSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] h-8">
        <div className="flex items-center gap-2">
          <Layers className="h-3 w-3" />
          <SelectValue placeholder="Map Style" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MAP_STYLE_LABELS) as MapStyle[]).map((style) => (
          <SelectItem key={style} value={style}>
            {MAP_STYLE_LABELS[style]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ===========================================
// City Selector
// ===========================================

interface CitySelectorProps {
  mapCenter: [number, number];
  onSelectCity: (coordinates: [number, number], cityName: string) => void;
}

export function CitySelector({ mapCenter, onSelectCity }: CitySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Get cities sorted by distance from map center
  const sortedCities = React.useMemo(() => {
    return getCitiesByDistance(mapCenter, 100);
  }, [mapCenter[0], mapCenter[1]]);

  // Filter cities by search query
  const filteredCities = React.useMemo(() => {
    if (!searchQuery) return sortedCities.slice(0, 30);
    const query = searchQuery.toLowerCase();
    return sortedCities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query)
    );
  }, [sortedCities, searchQuery]);

  // Group cities by region
  const groupedCities = React.useMemo(() => {
    const groups: Record<string, Array<MajorCity & { distance: number }>> = {};
    filteredCities.forEach((city) => {
      const region = city.region || 'Other';
      if (!groups[region]) groups[region] = [];
      groups[region].push(city);
    });
    return groups;
  }, [filteredCities]);

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${Math.round(km)} km`;
    return `${Math.round(km / 10) * 10} km`;
  };

  const handleSelect = (city: MajorCity & { distance: number }) => {
    onSelectCity(city.coordinates, city.name);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Navigation className="h-3 w-3" />
          <span className="hidden sm:inline">Jump to City</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px]" align="end">
        {/* Search Input */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <DropdownMenuSeparator />

        {/* Cities List */}
        <ScrollArea className="h-[300px]">
          {filteredCities.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No cities found
            </div>
          ) : (
            Object.entries(groupedCities).map(([region, cities]) => (
              <DropdownMenuGroup key={region}>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {region}
                </DropdownMenuLabel>
                {cities.slice(0, 10).map((city) => (
                  <DropdownMenuItem
                    key={city.name + city.country}
                    onClick={() => handleSelect(city)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{city.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {city.country}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      {formatDistance(city.distance)}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </DropdownMenuGroup>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ===========================================
// Resolution Display
// ===========================================

interface ResolutionDisplayProps {
  aspectRatio: AspectRatioPreset;
  quality: string;
}

export function ResolutionDisplay({ aspectRatio, quality }: ResolutionDisplayProps) {
  const dims = calculateResolution(aspectRatio, quality as any);

  return (
    <span className="text-xs text-muted-foreground">
      {dims.width} x {dims.height}
    </span>
  );
}

// ===========================================
// Combined Editor Header Controls
// ===========================================

interface EditorHeaderControlsProps {
  mapCenter: [number, number];
  onFlyToLocation: (coordinates: [number, number]) => void;
}

export function EditorHeaderControls({
  mapCenter,
  onFlyToLocation,
}: EditorHeaderControlsProps) {
  const config = useProjectStore((state) => state.config);
  const updateSettings = useProjectStore((state) => state.updateSettings);
  const updateMapSettings = useProjectStore((state) => state.updateMapSettings);

  const handleAspectRatioChange = (value: AspectRatioPreset) => {
    updateSettings({ aspectRatio: value });
  };

  const handleMapStyleChange = (value: MapStyle) => {
    updateMapSettings({ style: value });
  };

  const handleCitySelect = (coordinates: [number, number], cityName: string) => {
    onFlyToLocation(coordinates);
  };

  return (
    <div className="flex items-center gap-2">
      <AspectRatioSelector
        value={config.settings.aspectRatio}
        onChange={handleAspectRatioChange}
        resolution={config.settings.resolution}
      />
      <ResolutionDisplay
        aspectRatio={config.settings.aspectRatio}
        quality={config.settings.resolution}
      />
      <Separator orientation="vertical" className="h-6" />
      <MapStyleSelector
        value={config.mapSettings.style}
        onChange={handleMapStyleChange}
      />
      <CitySelector mapCenter={mapCenter} onSelectCity={handleCitySelect} />
    </div>
  );
}
