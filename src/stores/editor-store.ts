import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { EditorTool, ElementType, SelectedElement } from '@/types';

// ===========================================
// Editor Store State Interface
// ===========================================

interface EditorState {
  // Tool State
  selectedTool: EditorTool;
  previousTool: EditorTool;
  
  // Selection State
  selectedElement: SelectedElement | null;
  hoveredElementId: string | null;
  
  // Timeline State
  currentTime: number;
  isPlaying: boolean;
  timelineZoom: number;
  snapToGrid: boolean;
  gridSize: number;
  
  // UI State
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  timelineHeight: number;
  timelineExpanded: boolean;
  
  // Modal State
  previewModalOpen: boolean;
  renderModalOpen: boolean;
  settingsModalOpen: boolean;
  exportModalOpen: boolean;
  templateModalOpen: boolean;
  keyboardShortcutsModalOpen: boolean;
  
  // Map State
  mapLoaded: boolean;
  mapInteractive: boolean;
  showCoordinates: boolean;
  showScale: boolean;
  measureMode: boolean;
  measurePoints: [number, number][];
  
  // Drawing State
  isDrawing: boolean;
  drawingCoordinates: [number, number][];
  
  // Actions - Tool
  setTool: (tool: EditorTool) => void;
  toggleTool: (tool: EditorTool) => void;
  restorePreviousTool: () => void;
  
  // Actions - Selection
  selectElement: (element: SelectedElement | null) => void;
  clearSelection: () => void;
  setHoveredElement: (id: string | null) => void;
  
  // Actions - Timeline
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seekTo: (time: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  setTimelineZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  
  // Actions - UI
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;
  toggleTimelineExpanded: () => void;
  
  // Actions - Modal
  openPreviewModal: () => void;
  closePreviewModal: () => void;
  openRenderModal: () => void;
  closeRenderModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openTemplateModal: () => void;
  closeTemplateModal: () => void;
  openKeyboardShortcutsModal: () => void;
  closeKeyboardShortcutsModal: () => void;
  closeAllModals: () => void;
  
  // Actions - Map
  setMapLoaded: (loaded: boolean) => void;
  setMapInteractive: (interactive: boolean) => void;
  toggleCoordinates: () => void;
  toggleScale: () => void;
  toggleMeasureMode: () => void;
  addMeasurePoint: (point: [number, number]) => void;
  clearMeasurePoints: () => void;
  
  // Actions - Drawing
  startDrawing: () => void;
  addDrawingPoint: (point: [number, number]) => void;
  removeLastDrawingPoint: () => void;
  finishDrawing: () => [number, number][];
  cancelDrawing: () => void;
  
  // Aliases for backwards compatibility
  drawingPoints: [number, number][];
  setSelectedTool: (tool: EditorTool) => void;
}

// ===========================================
// Editor Store
// ===========================================

export const useEditorStore = create<EditorState>()(
  devtools(
    immer((set, get) => ({
      // Initial State
      selectedTool: 'select',
      previousTool: 'select',
      selectedElement: null,
      hoveredElementId: null,
      currentTime: 0,
      isPlaying: false,
      timelineZoom: 1,
      snapToGrid: true,
      gridSize: 0.5,
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      leftSidebarWidth: 280,
      rightSidebarWidth: 320,
      timelineHeight: 200,
      timelineExpanded: true,
      previewModalOpen: false,
      renderModalOpen: false,
      settingsModalOpen: false,
      exportModalOpen: false,
      templateModalOpen: false,
      keyboardShortcutsModalOpen: false,
      mapLoaded: false,
      mapInteractive: true,
      showCoordinates: true,
      showScale: true,
      measureMode: false,
      measurePoints: [],
      isDrawing: false,
      drawingCoordinates: [],

      // Tool Actions
      setTool: (tool) => {
        set((state) => {
          state.previousTool = state.selectedTool;
          state.selectedTool = tool;
          // Cancel any active drawing when switching tools
          if (state.isDrawing) {
            state.isDrawing = false;
            state.drawingCoordinates = [];
          }
        });
      },

      toggleTool: (tool) => {
        set((state) => {
          if (state.selectedTool === tool) {
            state.selectedTool = state.previousTool;
          } else {
            state.previousTool = state.selectedTool;
            state.selectedTool = tool;
          }
        });
      },

      restorePreviousTool: () => {
        set((state) => {
          const current = state.selectedTool;
          state.selectedTool = state.previousTool;
          state.previousTool = current;
        });
      },

      // Selection Actions
      selectElement: (element) => {
        set((state) => {
          state.selectedElement = element;
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedElement = null;
        });
      },

      setHoveredElement: (id) => {
        set((state) => {
          state.hoveredElementId = id;
        });
      },

      // Timeline Actions
      setCurrentTime: (time) => {
        set((state) => {
          state.currentTime = Math.max(0, time);
        });
      },

      play: () => {
        set((state) => {
          state.isPlaying = true;
        });
      },

      pause: () => {
        set((state) => {
          state.isPlaying = false;
        });
      },

      togglePlayback: () => {
        set((state) => {
          state.isPlaying = !state.isPlaying;
        });
      },

      seekTo: (time) => {
        set((state) => {
          state.currentTime = Math.max(0, time);
          state.isPlaying = false;
        });
      },

      seekForward: (seconds = 1) => {
        set((state) => {
          state.currentTime = state.currentTime + seconds;
        });
      },

      seekBackward: (seconds = 1) => {
        set((state) => {
          state.currentTime = Math.max(0, state.currentTime - seconds);
        });
      },

      setTimelineZoom: (zoom) => {
        set((state) => {
          state.timelineZoom = Math.max(0.25, Math.min(4, zoom));
        });
      },

      zoomIn: () => {
        set((state) => {
          state.timelineZoom = Math.min(4, state.timelineZoom * 1.25);
        });
      },

      zoomOut: () => {
        set((state) => {
          state.timelineZoom = Math.max(0.25, state.timelineZoom / 1.25);
        });
      },

      toggleSnapToGrid: () => {
        set((state) => {
          state.snapToGrid = !state.snapToGrid;
        });
      },

      setGridSize: (size) => {
        set((state) => {
          state.gridSize = size;
        });
      },

      // UI Actions
      toggleLeftSidebar: () => {
        set((state) => {
          state.leftSidebarOpen = !state.leftSidebarOpen;
        });
      },

      toggleRightSidebar: () => {
        set((state) => {
          state.rightSidebarOpen = !state.rightSidebarOpen;
        });
      },

      setLeftSidebarWidth: (width) => {
        set((state) => {
          state.leftSidebarWidth = Math.max(200, Math.min(400, width));
        });
      },

      setRightSidebarWidth: (width) => {
        set((state) => {
          state.rightSidebarWidth = Math.max(250, Math.min(450, width));
        });
      },

      setTimelineHeight: (height) => {
        set((state) => {
          state.timelineHeight = Math.max(100, Math.min(400, height));
        });
      },

      toggleTimelineExpanded: () => {
        set((state) => {
          state.timelineExpanded = !state.timelineExpanded;
        });
      },

      // Modal Actions
      openPreviewModal: () => {
        set((state) => {
          state.previewModalOpen = true;
          state.isPlaying = false;
        });
      },

      closePreviewModal: () => {
        set((state) => {
          state.previewModalOpen = false;
        });
      },

      openRenderModal: () => {
        set((state) => {
          state.renderModalOpen = true;
          state.isPlaying = false;
        });
      },

      closeRenderModal: () => {
        set((state) => {
          state.renderModalOpen = false;
        });
      },

      openSettingsModal: () => {
        set((state) => {
          state.settingsModalOpen = true;
        });
      },

      closeSettingsModal: () => {
        set((state) => {
          state.settingsModalOpen = false;
        });
      },

      openExportModal: () => {
        set((state) => {
          state.exportModalOpen = true;
        });
      },

      closeExportModal: () => {
        set((state) => {
          state.exportModalOpen = false;
        });
      },

      openTemplateModal: () => {
        set((state) => {
          state.templateModalOpen = true;
        });
      },

      closeTemplateModal: () => {
        set((state) => {
          state.templateModalOpen = false;
        });
      },

      openKeyboardShortcutsModal: () => {
        set((state) => {
          state.keyboardShortcutsModalOpen = true;
        });
      },

      closeKeyboardShortcutsModal: () => {
        set((state) => {
          state.keyboardShortcutsModalOpen = false;
        });
      },

      closeAllModals: () => {
        set((state) => {
          state.previewModalOpen = false;
          state.renderModalOpen = false;
          state.settingsModalOpen = false;
          state.exportModalOpen = false;
          state.templateModalOpen = false;
          state.keyboardShortcutsModalOpen = false;
        });
      },

      // Map Actions
      setMapLoaded: (loaded) => {
        set((state) => {
          state.mapLoaded = loaded;
        });
      },

      setMapInteractive: (interactive) => {
        set((state) => {
          state.mapInteractive = interactive;
        });
      },

      toggleCoordinates: () => {
        set((state) => {
          state.showCoordinates = !state.showCoordinates;
        });
      },

      toggleScale: () => {
        set((state) => {
          state.showScale = !state.showScale;
        });
      },

      toggleMeasureMode: () => {
        set((state) => {
          state.measureMode = !state.measureMode;
          if (!state.measureMode) {
            state.measurePoints = [];
          }
        });
      },

      addMeasurePoint: (point) => {
        set((state) => {
          state.measurePoints.push(point);
        });
      },

      clearMeasurePoints: () => {
        set((state) => {
          state.measurePoints = [];
        });
      },

      // Drawing Actions
      startDrawing: () => {
        set((state) => {
          state.isDrawing = true;
          state.drawingCoordinates = [];
        });
      },

      addDrawingPoint: (point) => {
        set((state) => {
          state.drawingCoordinates.push(point);
        });
      },

      finishDrawing: () => {
        const coordinates = get().drawingCoordinates;
        set((state) => {
          state.isDrawing = false;
          state.drawingCoordinates = [];
        });
        return coordinates;
      },

      cancelDrawing: () => {
        set((state) => {
          state.isDrawing = false;
          state.drawingCoordinates = [];
        });
      },

      removeLastDrawingPoint: () => {
        set((state) => {
          if (state.drawingCoordinates.length > 0) {
            state.drawingCoordinates.pop();
          }
          // If all points removed, stop drawing
          if (state.drawingCoordinates.length === 0) {
            state.isDrawing = false;
          }
        });
      },

      // Aliases for API consistency
      get drawingPoints() {
        return get().drawingCoordinates;
      },
      
      setSelectedTool: (tool) => {
        get().setTool(tool);
      },
    })),
    { name: 'editor-store' }
  )
);

// ===========================================
// Selectors
// ===========================================

export const selectSelectedTool = (state: EditorState) => state.selectedTool;
export const selectSelectedElement = (state: EditorState) => state.selectedElement;
export const selectCurrentTime = (state: EditorState) => state.currentTime;
export const selectIsPlaying = (state: EditorState) => state.isPlaying;
export const selectTimelineZoom = (state: EditorState) => state.timelineZoom;
export const selectLeftSidebarOpen = (state: EditorState) => state.leftSidebarOpen;
export const selectRightSidebarOpen = (state: EditorState) => state.rightSidebarOpen;
export const selectMapLoaded = (state: EditorState) => state.mapLoaded;
export const selectIsDrawing = (state: EditorState) => state.isDrawing;
export const selectDrawingCoordinates = (state: EditorState) => state.drawingCoordinates;
export const selectDrawingPoints = (state: EditorState) => state.drawingCoordinates;
