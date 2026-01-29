'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useProjectStore, useEditorStore } from '@/stores';
import { Toolbar } from '@/components/editor/toolbar';
import { PropertyPanel } from '@/components/editor/property-panel';
import { MapCanvas, MapCanvasRef } from '@/components/editor/map-canvas';
import { Timeline } from '@/components/timeline';
import { PreviewModal } from '@/components/preview/preview-modal';
import { RenderModal } from '@/components/preview/render-modal';
import { KeyboardShortcutsModal } from '@/components/editor/keyboard-shortcuts-modal';
import { SettingsModal } from '@/components/editor/settings-modal';
import { LibraryPanel } from '@/components/editor/library-panel';
import { EditorHeaderControls } from '@/components/editor/editor-controls';
import { AIProjectGenerator } from '@/components/ai/ai-project-generator';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Separator,
} from '@/components/ui';
import type { ProjectConfig } from '@/types';
import { ASPECT_RATIO_PRESETS, AspectRatioPreset } from '@/types';

// ===========================================
// Icons
// ===========================================

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function CloudIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ===========================================
// Editor Header Component
// ===========================================

interface EditorHeaderProps {
  projectId: string | null;
  projectName: string;
  isSaving: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  onBack: () => void;
  mapCenter: [number, number];
  onFlyToLocation: (coordinates: [number, number]) => void;
}

function EditorHeader({
  projectId,
  projectName,
  isSaving,
  lastSaved,
  onSave,
  onBack,
  mapCenter,
  onFlyToLocation,
}: EditorHeaderProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(projectName);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const updateProjectMeta = useProjectStore((state) => state.updateProjectMeta);

  const updateProject = trpc.projects.update.useMutation();

  React.useEffect(() => {
    setName(projectName);
  }, [projectName]);

  const handleNameSubmit = () => {
    if (name.trim() && name !== projectName && projectId) {
      updateProjectMeta(name.trim(), null);
      updateProject.mutate({ id: projectId, name: name.trim() });
    }
    setIsEditing(false);
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 10) return 'Just saved';
    if (diff < 60) return `Saved ${diff}s ago`;
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to projects</TooltipContent>
        </Tooltip>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') {
                setName(projectName);
                setIsEditing(false);
              }
            }}
            className="text-lg font-semibold bg-transparent border-b-2 border-primary outline-none px-1"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => inputRef.current?.select(), 0);
            }}
            className="text-lg font-semibold hover:bg-muted px-2 py-1 rounded transition-colors"
          >
            {projectName || 'Untitled Project'}
          </button>
        )}
      </div>

      {/* Center: Editor Controls */}
      <div className="hidden md:flex items-center">
        <EditorHeaderControls
          mapCenter={mapCenter}
          onFlyToLocation={onFlyToLocation}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Save status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <CloudIcon className="h-4 w-4" />
              <span>{formatLastSaved(lastSaved)}</span>
            </>
          ) : null}
        </div>

        {/* Manual save button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="flex items-center gap-2">
              Save project
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+S</kbd>
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

// ===========================================
// Utility: Get CSS aspect ratio value
// ===========================================

function getAspectRatioValue(aspectRatio: AspectRatioPreset): number {
  if (aspectRatio === 'custom' || !aspectRatio) {
    return 16 / 9; // Default to 16:9
  }
  const config = ASPECT_RATIO_PRESETS[aspectRatio as Exclude<AspectRatioPreset, 'custom'>];
  if (!config) return 16 / 9;
  return config.width / config.height;
}

// ===========================================
// Aspect Ratio Container Component
// ===========================================

interface AspectRatioContainerProps {
  aspectRatio: AspectRatioPreset;
  children: React.ReactNode;
}

function AspectRatioContainer({ aspectRatio, children }: AspectRatioContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const ratio = getAspectRatioValue(aspectRatio);

  React.useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current?.parentElement) return;

      const parent = containerRef.current.parentElement;
      const parentWidth = parent.clientWidth - 16; // Account for padding
      const parentHeight = parent.clientHeight - 16;

      // Calculate the maximum size that fits within parent while maintaining aspect ratio
      let width = parentWidth;
      let height = width / ratio;

      if (height > parentHeight) {
        height = parentHeight;
        width = height * ratio;
      }

      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    };

    updateDimensions();

    // Observe parent container size changes
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, [ratio]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden shadow-xl"
      style={{
        width: dimensions.width || '100%',
        height: dimensions.height || '100%',
      }}
    >
      {children}
    </div>
  );
}

// ===========================================
// Main Editor Page
// ===========================================

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Store state
  const storeProjectId = useProjectStore((state) => state.projectId);
  const projectName = useProjectStore((state) => state.projectName);
  const config = useProjectStore((state) => state.config);
  const isDirty = useProjectStore((state) => state.isDirty);
  const loadProject = useProjectStore((state) => state.loadProject);
  const markClean = useProjectStore((state) => state.markClean);
  const setConfig = useProjectStore((state) => state.setConfig);

  // Local state
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [mapCenter, setMapCenter] = React.useState<[number, number]>([55.2708, 25.2048]); // Default: Dubai

  // Modal states
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [renderOpen, setRenderOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);

  // Map ref for programmatic control
  const mapRef = React.useRef<MapCanvasRef>(null);

  // tRPC queries and mutations
  const { data: projectData, isLoading: isLoadingProject } = trpc.projects.get.useQuery(
    { id: projectId }
  );

  const saveProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      markClean();
      setLastSaved(new Date());
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('Failed to save project:', error);
      setIsSaving(false);
    },
  });

  // Load project data into store
  React.useEffect(() => {
    if (projectData) {
      loadProject(
        projectData.id,
        projectData.name,
        projectData.description || null,
        projectData.config
      );
      setIsLoading(false);
      setLastSaved(new Date(projectData.updatedAt));
    }
  }, [projectData, loadProject]);

  // Handle loading state
  React.useEffect(() => {
    if (!isLoadingProject && !projectData) {
      setError('Project not found');
      setIsLoading(false);
    }
  }, [isLoadingProject, projectData]);

  // Auto-save when project changes
  React.useEffect(() => {
    if (!storeProjectId || !isDirty) return;

    const saveTimeout = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [config, isDirty, storeProjectId]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Preview: Space (when not typing)
      if (e.key === ' ' && !isInputFocused()) {
        e.preventDefault();
        setPreviewOpen(true);
      }

      // Keyboard shortcuts: ?
      if (e.key === '?' && !isInputFocused()) {
        e.preventDefault();
        setShortcutsOpen(true);
      }

      // AI Assistant: A
      if (e.key === 'a' && !isInputFocused()) {
        e.preventDefault();
        setAiOpen(true);
      }

      // Close modals: Escape
      if (e.key === 'Escape') {
        setPreviewOpen(false);
        setRenderOpen(false);
        setShortcutsOpen(false);
        setSettingsOpen(false);
        setAiOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isInputFocused = () => {
    const active = document.activeElement;
    return (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.getAttribute('contenteditable') === 'true'
    );
  };

  const handleSave = () => {
    if (!storeProjectId || isSaving) return;

    setIsSaving(true);
    saveProject.mutate({
      id: storeProjectId,
      name: projectName,
      config,
    });
  };

  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    router.push('/');
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  const handleExport = () => {
    setRenderOpen(true);
  };

  const handleOpenShortcuts = () => {
    setShortcutsOpen(true);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleOpenAI = () => {
    setAiOpen(true);
  };

  // Handle AI script update - applies new config from regenerated script
  const handleProjectUpdated = (newConfig: ProjectConfig) => {
    setConfig(newConfig);
    setAiOpen(false);
  };

  const handleFlyToLocation = (coordinates: [number, number]) => {
    mapRef.current?.flyTo(coordinates);
    setMapCenter(coordinates);
  };

  // Update mapCenter when map moves
  const handleMapMove = (center: [number, number]) => {
    setMapCenter(center);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold">Error loading project</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button onClick={() => router.push('/')}>Back to projects</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <EditorHeader
        projectId={storeProjectId}
        projectName={projectName}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onSave={handleSave}
        onBack={handleBack}
        mapCenter={mapCenter}
        onFlyToLocation={handleFlyToLocation}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <Toolbar
          onPreview={handlePreview}
          onExport={handleExport}
          onOpenShortcuts={handleOpenShortcuts}
          onOpenSettings={handleOpenSettings}
          onOpenAI={handleOpenAI}
          hasAIScript={!!config?.aiMetadata?.originalScript}
        />

        {/* Map Canvas with Aspect Ratio Container */}
        <div className="flex-1 relative min-h-0 min-w-0 overflow-hidden bg-neutral-900 flex items-center justify-center p-2">
          <AspectRatioContainer aspectRatio={config?.settings?.aspectRatio ?? '16:9'}>
            <MapCanvas
              ref={mapRef}
              className="absolute inset-0 w-full h-full"
              onMapMove={handleMapMove}
            />
          </AspectRatioContainer>
        </div>

        {/* Right Property Panel */}
        <PropertyPanel />

        {/* Library Panel */}
        <LibraryPanel
          mapCenter={
            config?.keyframes[0]?.camera.centre ?? [-73.935242, 40.73061]
          }
        />
      </div>

      {/* Bottom Timeline */}
      <Timeline />

      {/* Modals */}
      <PreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <RenderModal
        open={renderOpen}
        onOpenChange={setRenderOpen}
        projectId={projectId}
      />

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <AIProjectGenerator
        open={aiOpen}
        onOpenChange={setAiOpen}
        initialScript={config?.aiMetadata?.originalScript || ''}
        editMode={!!config?.aiMetadata?.originalScript}
        projectId={projectId}
        onProjectUpdated={handleProjectUpdated}
      />
    </div>
  );
}
