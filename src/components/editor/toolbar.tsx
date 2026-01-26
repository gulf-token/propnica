'use client';

import * as React from 'react';
import {
  MousePointer2,
  Hand,
  Route,
  Type,
  MapPin,
  Square,
  Circle,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Save,
  Download,
  Play,
  Eye,
  Settings,
  Keyboard,
  RotateCw,
  Axis3d,
  Orbit,
  Navigation,
  Archive,
  Sparkles,
} from 'lucide-react';

// Custom Zone Icon - polygon with corner points
function ZoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Polygon shape */}
      <path d="M4 6 L12 3 L20 6 L18 18 L6 18 Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M4 6 L12 3 L20 6 L18 18 L6 18 Z" />
      {/* Corner points */}
      <circle cx="4" cy="6" r="2" fill="currentColor" />
      <circle cx="12" cy="3" r="2" fill="currentColor" />
      <circle cx="20" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
      <circle cx="6" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}
import { useEditorStore, useProjectStore } from '@/stores';
import { EditorTool } from '@/types';
import { cn } from '@/lib/utils';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Separator,
} from '@/components/ui';

// ===========================================
// Tool Definitions
// ===========================================

interface ToolDefinition {
  id: EditorTool;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}

const primaryTools: ToolDefinition[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
];

const cameraTools: ToolDefinition[] = [
  { id: 'rotate', icon: RotateCw, label: 'Rotate', shortcut: 'B' },
  { id: 'tilt', icon: Axis3d, label: 'Tilt/Pitch', shortcut: 'P' },
  { id: 'orbit', icon: Orbit, label: 'Orbit', shortcut: 'O' },
  { id: 'flyTo', icon: Navigation, label: 'Fly To', shortcut: 'F' },
];

const drawingTools: ToolDefinition[] = [
  { id: 'drawZone', icon: ZoneIcon, label: 'Draw Zone', shortcut: 'Z' },
  { id: 'drawRoute', icon: Route, label: 'Draw Route', shortcut: 'R' },
  { id: 'addMarker', icon: MapPin, label: 'Add Marker', shortcut: 'M' },
  { id: 'addText', icon: Type, label: 'Add Text', shortcut: 'T' },
];

const shapeTools: ToolDefinition[] = [
  { id: 'drawRectangle', icon: Square, label: 'Rectangle' },
  { id: 'drawCircle', icon: Circle, label: 'Circle' },
];

// ===========================================
// Tool Button Component
// ===========================================

interface ToolButtonProps {
  tool: ToolDefinition;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ tool, isActive, onClick }: ToolButtonProps) {
  const Icon = tool.icon;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'tool-button',
            isActive && 'active'
          )}
          aria-label={tool.label}
          aria-pressed={isActive}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <div className="flex items-center gap-2">
          <span>{tool.label}</span>
          {tool.shortcut && (
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
              {tool.shortcut}
            </kbd>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ===========================================
// Toolbar Props
// ===========================================

interface ToolbarProps {
  onPreview: () => void;
  onExport: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onOpenAI: () => void;
}

// ===========================================
// Toolbar Component
// ===========================================

export function Toolbar({
  onPreview,
  onExport,
  onOpenShortcuts,
  onOpenSettings,
  onOpenAI,
}: ToolbarProps) {
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const setTool = useEditorStore((state) => state.setTool);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const toggleSnapToGrid = useEditorStore((state) => state.toggleSnapToGrid);

  const libraryPanelOpen = useEditorStore((state) => state.libraryPanelOpen);
  const toggleLibraryPanel = useEditorStore((state) => state.toggleLibraryPanel);

  const canUndo = useProjectStore((state) => state.canUndo());
  const canRedo = useProjectStore((state) => state.canRedo());
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const isDirty = useProjectStore((state) => state.isDirty);

  return (
    <TooltipProvider>
      <div className="flex flex-col w-12 bg-background border-r p-2 gap-1">
        {/* Primary Tools */}
        <div className="flex flex-col gap-1">
          {primaryTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={selectedTool === tool.id}
              onClick={() => setTool(tool.id)}
            />
          ))}
        </div>

        <Separator className="my-2" />

        {/* Camera Tools */}
        <div className="flex flex-col gap-1">
          {cameraTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={selectedTool === tool.id}
              onClick={() => setTool(tool.id)}
            />
          ))}
        </div>

        <Separator className="my-2" />

        {/* Drawing Tools */}
        <div className="flex flex-col gap-1">
          {drawingTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={selectedTool === tool.id}
              onClick={() => setTool(tool.id)}
            />
          ))}
        </div>

        <Separator className="my-2" />

        {/* Shape Tools */}
        <div className="flex flex-col gap-1">
          {shapeTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={selectedTool === tool.id}
              onClick={() => setTool(tool.id)}
            />
          ))}
        </div>

        <Separator className="my-2" />

        {/* History Controls */}
        <div className="flex flex-col gap-1">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={undo}
                disabled={!canUndo}
                className={cn(
                  'tool-button',
                  !canUndo && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Undo"
              >
                <Undo2 className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>Undo</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
                  Ctrl+Z
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={cn(
                  'tool-button',
                  !canRedo && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Redo"
              >
                <Redo2 className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>Redo</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
                  Ctrl+Y
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator className="my-2" />

        {/* View Controls */}
        <div className="flex flex-col gap-1">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSnapToGrid}
                className={cn('tool-button', snapToGrid && 'active')}
                aria-label="Snap to Grid"
                aria-pressed={snapToGrid}
              >
                <Grid className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Snap to Grid
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleLibraryPanel}
                className={cn('tool-button', libraryPanelOpen && 'active')}
                aria-label="Library"
                aria-pressed={libraryPanelOpen}
              >
                <Archive className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>Library</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">L</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenAI}
                className="tool-button text-violet-500 hover:text-violet-600"
                aria-label="AI Assistant"
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>AI Assistant</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">A</kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Actions */}
        <div className="flex flex-col gap-1">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={onPreview}
                className="tool-button"
                aria-label="Preview"
              >
                <Eye className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>Preview</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">P</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={onExport}
                className="tool-button"
                aria-label="Export Video"
              >
                <Download className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>Export Video</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">E</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Separator className="my-2" />

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenShortcuts}
                className="tool-button"
                aria-label="Keyboard Shortcuts"
              >
                <Keyboard className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="flex items-center gap-2">
                <span>Keyboard Shortcuts</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">?</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenSettings}
                className="tool-button"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
