'use client';

import * as React from 'react';
import {
  Archive,
  Search,
  X,
  Map,
  Route as RouteIcon,
  Type,
  MoreVertical,
  Trash2,
  Edit2,
  Download,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useEditorStore, useProjectStore } from '@/stores';
import { cn } from '@/lib/utils';
import {
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  ScrollArea,
} from '@/components/ui';
import type { Zone, Route, TextMarker } from '@/types';

// ===========================================
// Types
// ===========================================

type LibraryItemTypeFilter = 'all' | 'ZONE' | 'ROUTE' | 'TEXT_MARKER';

interface LibraryItemData {
  id: string;
  name: string;
  description: string | null;
  type: 'ZONE' | 'ROUTE' | 'TEXT_MARKER';
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Library Item Card
// ===========================================

interface LibraryItemCardProps {
  item: LibraryItemData;
  onImport: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function LibraryItemCard({ item, onImport, onRename, onDelete }: LibraryItemCardProps) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newName, setNewName] = React.useState(item.name);

  const handleRename = () => {
    if (newName.trim() && newName !== item.name) {
      onRename(item.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'ZONE':
        return <Map className="h-4 w-4" />;
      case 'ROUTE':
        return <RouteIcon className="h-4 w-4" />;
      case 'TEXT_MARKER':
        return <Type className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case 'ZONE':
        return 'Zone';
      case 'ROUTE':
        return 'Route';
      case 'TEXT_MARKER':
        return 'Text';
    }
  };

  return (
    <div className="group relative bg-card border rounded-lg p-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0 h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
            {getTypeIcon()}
          </div>
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setNewName(item.name);
                    setIsRenaming(false);
                  }
                }}
                className="h-6 text-sm"
                autoFocus
              />
            ) : (
              <p className="text-sm font-medium truncate">{item.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {getTypeLabel()} &middot; Used {item.usageCount} times
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onImport(item.id)}>
              <Download className="h-4 w-4 mr-2" />
              Import to project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Click to import overlay */}
      <button
        onClick={() => onImport(item.id)}
        className="absolute inset-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label={`Import ${item.name}`}
      />
    </div>
  );
}

// ===========================================
// Library Panel
// ===========================================

interface LibraryPanelProps {
  mapCenter: [number, number];
}

export function LibraryPanel({ mapCenter }: LibraryPanelProps) {
  const libraryPanelOpen = useEditorStore((state) => state.libraryPanelOpen);
  const closeLibraryPanel = useEditorStore((state) => state.closeLibraryPanel);

  const importLibraryZone = useProjectStore((state) => state.importLibraryZone);
  const importLibraryRoute = useProjectStore((state) => state.importLibraryRoute);
  const importLibraryTextMarker = useProjectStore((state) => state.importLibraryTextMarker);

  const [typeFilter, setTypeFilter] = React.useState<LibraryItemTypeFilter>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const utils = trpc.useUtils();

  // Fetch library items
  const { data, isLoading, refetch } = trpc.library.list.useQuery(
    {
      type: typeFilter === 'all' ? undefined : typeFilter,
      search: searchQuery || undefined,
      limit: 50,
    },
    { enabled: libraryPanelOpen }
  );

  // Mutations
  const importMutation = trpc.library.import.useMutation({
    onSuccess: (result) => {
      // Import into project
      if (result.type === 'ZONE') {
        importLibraryZone(result.config as Zone, mapCenter);
      } else if (result.type === 'ROUTE') {
        importLibraryRoute(result.config as Route, mapCenter);
      } else if (result.type === 'TEXT_MARKER') {
        importLibraryTextMarker(result.config as TextMarker, mapCenter);
      }
      utils.library.list.invalidate();
    },
  });

  const updateMutation = trpc.library.update.useMutation({
    onSuccess: () => {
      utils.library.list.invalidate();
    },
  });

  const deleteMutation = trpc.library.delete.useMutation({
    onSuccess: () => {
      utils.library.list.invalidate();
    },
  });

  const handleImport = (id: string) => {
    importMutation.mutate({ id });
  };

  const handleRename = (id: string, name: string) => {
    updateMutation.mutate({ id, name });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item from your library?')) {
      deleteMutation.mutate({ id });
    }
  };

  if (!libraryPanelOpen) {
    return null;
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          <h2 className="font-semibold">Library</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={closeLibraryPanel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={typeFilter}
        onValueChange={(v) => setTypeFilter(v as LibraryItemTypeFilter)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-4 mt-2 grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ZONE">Zones</TabsTrigger>
          <TabsTrigger value="ROUTE">Routes</TabsTrigger>
          <TabsTrigger value="TEXT_MARKER">Text</TabsTrigger>
        </TabsList>

        <TabsContent value={typeFilter} className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : data?.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No items in your library</p>
                  <p className="text-xs mt-1">
                    Archive zones, routes, or text markers to reuse them
                  </p>
                </div>
              ) : (
                data?.items.map((item) => (
                  <LibraryItemCard
                    key={item.id}
                    item={item as LibraryItemData}
                    onImport={handleImport}
                    onRename={handleRename}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
