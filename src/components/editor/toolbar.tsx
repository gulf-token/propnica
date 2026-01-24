'use client';

import * as React from 'react';
import {
  MousePointer2,
  Hand,
  PenTool,
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
} from 'lucide-react';
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

const drawingTools: ToolDefinition[] = [
  { id: 'drawZone', icon: PenTool, label: 'Draw Zone', shortcut: 'Z' },
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
// Toolbar Component
// ===========================================

export function Toolbar() {
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const setTool = useEditorStore((state) => state.setTool);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const toggleSnapToGrid = useEditorStore((state) => state.toggleSnapToGrid);
  const openPreviewModal = useEditorStore((state) => state.openPreviewModal);
  const openRenderModal = useEditorStore((state) => state.openRenderModal);
  const openSettingsModal = useEditorStore((state) => state.openSettingsModal);
  const openKeyboardShortcutsModal = useEditorStore(
    (state) => state.openKeyboardShortcutsModal
  );

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
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Actions */}
        <div className="flex flex-col gap-1">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={openPreviewModal}
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
                onClick={openRenderModal}
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
                onClick={openKeyboardShortcutsModal}
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
                onClick={openSettingsModal}
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
