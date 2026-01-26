// ===========================================
// Unit Tests - Editor Store
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEditorStore } from '@/stores/editor-store';

// Helper to reset store to initial state
const resetStore = () => {
  useEditorStore.setState({
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
    libraryPanelOpen: false,
    mapLoaded: false,
    mapInteractive: true,
    showCoordinates: true,
    showScale: true,
    measureMode: false,
    measurePoints: [],
    isDrawing: false,
    drawingCoordinates: [],
  });
};

describe('Editor Store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Timeline Operations', () => {
    it('should set current time', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setCurrentTime(100);
      });

      expect(useEditorStore.getState().currentTime).toBe(100);
    });

    it('should not set negative time', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setCurrentTime(-50);
      });

      expect(useEditorStore.getState().currentTime).toBe(0);
    });

    it('should toggle playback', () => {
      const store = useEditorStore.getState();

      expect(store.isPlaying).toBe(false);

      act(() => {
        store.togglePlayback();
      });

      expect(useEditorStore.getState().isPlaying).toBe(true);

      act(() => {
        store.togglePlayback();
      });

      expect(useEditorStore.getState().isPlaying).toBe(false);
    });

    it('should play and pause', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.play();
      });

      expect(useEditorStore.getState().isPlaying).toBe(true);

      act(() => {
        store.pause();
      });

      expect(useEditorStore.getState().isPlaying).toBe(false);
    });

    it('should set timeline zoom level', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTimelineZoom(2);
      });

      expect(useEditorStore.getState().timelineZoom).toBe(2);
    });

    it('should clamp zoom level to valid range', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTimelineZoom(10); // Too high
      });

      expect(useEditorStore.getState().timelineZoom).toBe(4); // Clamped to max

      act(() => {
        store.setTimelineZoom(0.1); // Too low
      });

      expect(useEditorStore.getState().timelineZoom).toBe(0.25); // Clamped to min
    });

    it('should zoom in and out', () => {
      const store = useEditorStore.getState();
      const initialZoom = store.timelineZoom;

      act(() => {
        store.zoomIn();
      });

      expect(useEditorStore.getState().timelineZoom).toBeGreaterThan(initialZoom);

      act(() => {
        store.zoomOut();
        store.zoomOut();
      });

      expect(useEditorStore.getState().timelineZoom).toBeLessThan(initialZoom);
    });

    it('should seek forward and backward', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setCurrentTime(10);
        store.seekForward(5);
      });

      expect(useEditorStore.getState().currentTime).toBe(15);

      act(() => {
        store.seekBackward(3);
      });

      expect(useEditorStore.getState().currentTime).toBe(12);
    });

    it('should not seek below zero', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setCurrentTime(5);
        store.seekBackward(10);
      });

      expect(useEditorStore.getState().currentTime).toBe(0);
    });
  });

  describe('Selection Operations', () => {
    it('should select element', () => {
      const store = useEditorStore.getState();
      const element = { id: 'element-123', type: 'marker' as const };

      act(() => {
        store.selectElement(element);
      });

      expect(useEditorStore.getState().selectedElement).toEqual(element);
    });

    it('should clear selection', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.selectElement({ id: 'element-123', type: 'marker' as const });
        store.clearSelection();
      });

      expect(useEditorStore.getState().selectedElement).toBeNull();
    });

    it('should set hovered element', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setHoveredElement('hover-123');
      });

      expect(useEditorStore.getState().hoveredElementId).toBe('hover-123');
    });
  });

  describe('Tool Operations', () => {
    it('should set tool', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTool('pan');
      });

      expect(useEditorStore.getState().selectedTool).toBe('pan');
    });

    it('should track previous tool', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTool('pan');
        store.setTool('drawRoute');
      });

      expect(useEditorStore.getState().selectedTool).toBe('drawRoute');
      expect(useEditorStore.getState().previousTool).toBe('pan');
    });

    it('should restore previous tool', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTool('pan');
        store.setTool('drawRoute');
        store.restorePreviousTool();
      });

      expect(useEditorStore.getState().selectedTool).toBe('pan');
    });

    it('should toggle tool', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTool('select');
        store.toggleTool('pan');
      });

      expect(useEditorStore.getState().selectedTool).toBe('pan');

      act(() => {
        store.toggleTool('pan');
      });

      expect(useEditorStore.getState().selectedTool).toBe('select');
    });

    it('should cancel drawing when changing tools', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.startDrawing();
        store.addDrawingPoint([0, 0]);
      });

      expect(useEditorStore.getState().isDrawing).toBe(true);

      act(() => {
        store.setTool('select');
      });

      expect(useEditorStore.getState().isDrawing).toBe(false);
      expect(useEditorStore.getState().drawingCoordinates).toEqual([]);
    });
  });

  describe('UI Panel Operations', () => {
    it('should toggle left sidebar', () => {
      const store = useEditorStore.getState();
      const initialState = store.leftSidebarOpen;

      act(() => {
        store.toggleLeftSidebar();
      });

      expect(useEditorStore.getState().leftSidebarOpen).toBe(!initialState);
    });

    it('should toggle right sidebar', () => {
      const store = useEditorStore.getState();
      const initialState = store.rightSidebarOpen;

      act(() => {
        store.toggleRightSidebar();
      });

      expect(useEditorStore.getState().rightSidebarOpen).toBe(!initialState);
    });

    it('should set sidebar widths within bounds', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setLeftSidebarWidth(300);
      });

      expect(useEditorStore.getState().leftSidebarWidth).toBe(300);

      act(() => {
        store.setLeftSidebarWidth(100); // Too small
      });

      expect(useEditorStore.getState().leftSidebarWidth).toBe(200); // Clamped to min

      act(() => {
        store.setLeftSidebarWidth(500); // Too large
      });

      expect(useEditorStore.getState().leftSidebarWidth).toBe(400); // Clamped to max
    });

    it('should set timeline height within bounds', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.setTimelineHeight(250);
      });

      expect(useEditorStore.getState().timelineHeight).toBe(250);

      act(() => {
        store.setTimelineHeight(50); // Too small
      });

      expect(useEditorStore.getState().timelineHeight).toBe(100); // Clamped to min
    });

    it('should toggle timeline expanded', () => {
      const store = useEditorStore.getState();
      const initialState = store.timelineExpanded;

      act(() => {
        store.toggleTimelineExpanded();
      });

      expect(useEditorStore.getState().timelineExpanded).toBe(!initialState);
    });

    it('should toggle snap to grid', () => {
      const store = useEditorStore.getState();
      const initialState = store.snapToGrid;

      act(() => {
        store.toggleSnapToGrid();
      });

      expect(useEditorStore.getState().snapToGrid).toBe(!initialState);
    });
  });

  describe('Modal Operations', () => {
    it('should open and close preview modal', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.openPreviewModal();
      });

      expect(useEditorStore.getState().previewModalOpen).toBe(true);
      expect(useEditorStore.getState().isPlaying).toBe(false); // Should pause

      act(() => {
        store.closePreviewModal();
      });

      expect(useEditorStore.getState().previewModalOpen).toBe(false);
    });

    it('should close all modals', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.openPreviewModal();
        store.openSettingsModal();
        store.openRenderModal();
      });

      act(() => {
        store.closeAllModals();
      });

      const state = useEditorStore.getState();
      expect(state.previewModalOpen).toBe(false);
      expect(state.settingsModalOpen).toBe(false);
      expect(state.renderModalOpen).toBe(false);
      expect(state.exportModalOpen).toBe(false);
      expect(state.templateModalOpen).toBe(false);
      expect(state.keyboardShortcutsModalOpen).toBe(false);
    });
  });

  describe('Library Panel Operations', () => {
    it('should toggle library panel', () => {
      const store = useEditorStore.getState();

      expect(store.libraryPanelOpen).toBe(false);

      act(() => {
        store.toggleLibraryPanel();
      });

      expect(useEditorStore.getState().libraryPanelOpen).toBe(true);

      act(() => {
        store.toggleLibraryPanel();
      });

      expect(useEditorStore.getState().libraryPanelOpen).toBe(false);
    });

    it('should open and close library panel', () => {
      const store = useEditorStore.getState();

      act(() => {
        store.openLibraryPanel();
      });

      expect(useEditorStore.getState().libraryPanelOpen).toBe(true);

      act(() => {
        store.closeLibraryPanel();
      });

      expect(useEditorStore.getState().libraryPanelOpen).toBe(false);
    });
  });
});

describe('Editor Store - Drawing Operations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should start drawing', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
    });

    expect(useEditorStore.getState().isDrawing).toBe(true);
    expect(useEditorStore.getState().drawingCoordinates).toEqual([]);
  });

  it('should add drawing points', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
      store.addDrawingPoint([10, 20]);
      store.addDrawingPoint([30, 40]);
    });

    expect(useEditorStore.getState().drawingCoordinates).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it('should remove last drawing point', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
      store.addDrawingPoint([10, 20]);
      store.addDrawingPoint([30, 40]);
      store.removeLastDrawingPoint();
    });

    expect(useEditorStore.getState().drawingCoordinates).toEqual([[10, 20]]);
  });

  it('should stop drawing when all points removed', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
      store.addDrawingPoint([10, 20]);
      store.removeLastDrawingPoint();
    });

    expect(useEditorStore.getState().isDrawing).toBe(false);
  });

  it('should finish drawing and return coordinates', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
      store.addDrawingPoint([10, 20]);
      store.addDrawingPoint([30, 40]);
    });

    let coordinates: [number, number][] = [];
    act(() => {
      coordinates = store.finishDrawing();
    });

    expect(coordinates).toEqual([
      [10, 20],
      [30, 40],
    ]);
    expect(useEditorStore.getState().isDrawing).toBe(false);
    expect(useEditorStore.getState().drawingCoordinates).toEqual([]);
  });

  it('should cancel drawing', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
      store.addDrawingPoint([10, 20]);
      store.cancelDrawing();
    });

    expect(useEditorStore.getState().isDrawing).toBe(false);
    expect(useEditorStore.getState().drawingCoordinates).toEqual([]);
  });
});

describe('Editor Store - Map Operations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set map loaded state', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.setMapLoaded(true);
    });

    expect(useEditorStore.getState().mapLoaded).toBe(true);
  });

  it('should set map interactive state', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.setMapInteractive(false);
    });

    expect(useEditorStore.getState().mapInteractive).toBe(false);
  });

  it('should toggle coordinates display', () => {
    const store = useEditorStore.getState();
    const initialState = store.showCoordinates;

    act(() => {
      store.toggleCoordinates();
    });

    expect(useEditorStore.getState().showCoordinates).toBe(!initialState);
  });

  it('should toggle scale display', () => {
    const store = useEditorStore.getState();
    const initialState = store.showScale;

    act(() => {
      store.toggleScale();
    });

    expect(useEditorStore.getState().showScale).toBe(!initialState);
  });

  it('should toggle measure mode and clear points when disabled', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.toggleMeasureMode();
      store.addMeasurePoint([10, 20]);
      store.addMeasurePoint([30, 40]);
    });

    expect(useEditorStore.getState().measureMode).toBe(true);
    expect(useEditorStore.getState().measurePoints).toHaveLength(2);

    act(() => {
      store.toggleMeasureMode();
    });

    expect(useEditorStore.getState().measureMode).toBe(false);
    expect(useEditorStore.getState().measurePoints).toEqual([]);
  });

  it('should clear measure points', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.toggleMeasureMode();
      store.addMeasurePoint([10, 20]);
      store.clearMeasurePoints();
    });

    expect(useEditorStore.getState().measurePoints).toEqual([]);
  });
});

describe('Editor Store - Aliases', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should use setSelectedTool alias', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.setSelectedTool('pan');
    });

    expect(useEditorStore.getState().selectedTool).toBe('pan');
  });

  it('should have drawingCoordinates available', () => {
    const store = useEditorStore.getState();

    act(() => {
      store.startDrawing();
      store.addDrawingPoint([10, 20]);
    });

    // drawingCoordinates is the canonical property
    expect(useEditorStore.getState().drawingCoordinates).toEqual([[10, 20]]);
  });
});
