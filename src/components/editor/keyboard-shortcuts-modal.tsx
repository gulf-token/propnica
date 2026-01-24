'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

// ===========================================
// Keyboard Shortcuts Modal
// ===========================================
// Displays all available keyboard shortcuts

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Save project' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo (alternative)' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Cancel current operation' },
    ],
  },
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['V'], description: 'Select tool' },
      { keys: ['H'], description: 'Pan tool (hand)' },
      { keys: ['Z'], description: 'Draw zone tool' },
      { keys: ['R'], description: 'Draw route tool' },
      { keys: ['M'], description: 'Add marker tool' },
      { keys: ['T'], description: 'Add text tool' },
      { keys: ['U'], description: 'Rectangle tool' },
      { keys: ['O'], description: 'Circle tool' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: ['Space'], description: 'Hold to pan' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['+'], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['0'], description: 'Reset zoom to 100%' },
      { keys: ['1'], description: 'Fit canvas to view' },
      { keys: ['G'], description: 'Toggle snap to grid' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected element' },
      { keys: ['Backspace'], description: 'Delete selected element' },
      { keys: ['Ctrl', 'A'], description: 'Select all elements' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selection' },
      { keys: ['Ctrl', 'C'], description: 'Copy selection' },
      { keys: ['Ctrl', 'V'], description: 'Paste' },
      { keys: ['Arrow keys'], description: 'Move selection' },
      { keys: ['Shift', 'Arrow'], description: 'Move selection (10px)' },
    ],
  },
  {
    title: 'Timeline',
    shortcuts: [
      { keys: ['Space'], description: 'Play/Pause' },
      { keys: ['Home'], description: 'Go to start' },
      { keys: ['End'], description: 'Go to end' },
      { keys: ['Left'], description: 'Previous frame' },
      { keys: ['Right'], description: 'Next frame' },
      { keys: ['Shift', 'Left'], description: 'Previous keyframe' },
      { keys: ['Shift', 'Right'], description: 'Next keyframe' },
      { keys: ['K'], description: 'Add keyframe at playhead' },
      { keys: ['L'], description: 'Toggle loop playback' },
    ],
  },
  {
    title: 'Preview & Export',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Preview animation' },
      { keys: ['Ctrl', 'E'], description: 'Export video' },
      { keys: ['Ctrl', 'P'], description: 'Project settings' },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  // Add keyboard listener for ? key to toggle modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p>
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">?</kbd>{' '}
            at any time to toggle this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
