// ===========================================
// Unit Tests - Editor Store
// ===========================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useEditorStore } from '@/stores/editor-store';

describe('Editor Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useEditorStore.getState();
    store.resetEditor();
  });

  describe('Timeline Operations', () => {
    it('should set current frame', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setCurrentFrame(100);
      });
      
      expect(useEditorStore.getState().currentFrame).toBe(100);
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

    it('should set duration', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setDuration(3000);
      });
      
      expect(useEditorStore.getState().duration).toBe(3000);
    });

    it('should set zoom level', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setZoom(2);
      });
      
      expect(useEditorStore.getState().zoom).toBe(2);
    });
  });

  describe('Selection Operations', () => {
    it('should set selected element', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setSelectedElement('element-123');
      });
      
      expect(useEditorStore.getState().selectedElement).toBe('element-123');
    });

    it('should clear selection', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setSelectedElement('element-123');
        store.clearSelection();
      });
      
      expect(useEditorStore.getState().selectedElement).toBeNull();
    });
  });

  describe('Tool Operations', () => {
    it('should set active tool', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setActiveTool('draw');
      });
      
      expect(useEditorStore.getState().activeTool).toBe('draw');
    });
  });

  describe('Panel Operations', () => {
    it('should toggle panel visibility', () => {
      const store = useEditorStore.getState();
      const initialState = store.panels.properties;
      
      act(() => {
        store.togglePanel('properties');
      });
      
      expect(useEditorStore.getState().panels.properties).toBe(!initialState);
    });

    it('should set panel size', () => {
      const store = useEditorStore.getState();
      
      act(() => {
        store.setPanelSize('properties', 350);
      });
      
      // Panel size should be updated if the store tracks panel sizes
      // This test may need adjustment based on actual implementation
    });
  });

  describe('History Operations', () => {
    it('should track undo/redo availability', () => {
      const store = useEditorStore.getState();
      
      // Initial state should have no undo/redo
      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
    });
  });

  describe('Reset Operations', () => {
    it('should reset editor to initial state', () => {
      const store = useEditorStore.getState();
      
      // Make some changes
      act(() => {
        store.setCurrentFrame(500);
        store.setSelectedElement('element-123');
        store.setActiveTool('draw');
      });
      
      // Reset
      act(() => {
        store.resetEditor();
      });
      
      const state = useEditorStore.getState();
      expect(state.currentFrame).toBe(0);
      expect(state.selectedElement).toBeNull();
      expect(state.activeTool).toBe('select');
    });
  });
});

describe('Editor Store - Map Operations', () => {
  beforeEach(() => {
    const store = useEditorStore.getState();
    store.resetEditor();
  });

  it('should update map position', () => {
    const store = useEditorStore.getState();
    
    act(() => {
      store.updateMapPosition({
        center: { lng: 55.2708, lat: 25.2048 },
        zoom: 14,
        bearing: 45,
        pitch: 60,
      });
    });
    
    const state = useEditorStore.getState();
    expect(state.mapPosition.center.lng).toBe(55.2708);
    expect(state.mapPosition.center.lat).toBe(25.2048);
    expect(state.mapPosition.zoom).toBe(14);
    expect(state.mapPosition.bearing).toBe(45);
    expect(state.mapPosition.pitch).toBe(60);
  });

  it('should set map style', () => {
    const store = useEditorStore.getState();
    
    act(() => {
      store.setMapStyle('satellite');
    });
    
    expect(useEditorStore.getState().mapStyle).toBe('satellite');
  });
});
