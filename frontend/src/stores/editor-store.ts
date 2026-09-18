import { create } from 'zustand';
import type { ResumeSection } from '@/types/resume';
import type { ResumeSnapshot } from '@/types/editor';
import { MAX_UNDO_STACK } from '@/lib/constants';

interface EditorStore {
  selectedSectionId: string | null;
  selectedItemId: string | null;
  isDragging: boolean;
  showAiChat: boolean;
  showThemeEditor: boolean;
  zoom: number;
  undoStack: ResumeSnapshot[];
  redoStack: ResumeSnapshot[];
  pendingAiMessage: string | null;
  optimizationRequest: {
    id: string;
    sectionId?: string;
    sectionTitle?: string;
  } | null;
  mobileActiveTab: "edit" | "preview";

  selectSection: (id: string | null) => void;
  selectItem: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  toggleAiChat: () => void;
  setShowAiChat: (show: boolean) => void;
  toggleThemeEditor: () => void;
  setPanelView: (view: 'preview' | 'ai' | 'theme') => void;
  setZoom: (zoom: number) => void;
  pushSnapshot: (sections: ResumeSection[]) => void;
  undo: () => ResumeSnapshot | null;
  redo: () => ResumeSnapshot | null;
  setPendingAiMessage: (message: string | null) => void;
  requestAiOptimization: (scope?: { sectionId?: string; sectionTitle?: string }) => void;
  clearAiOptimizationRequest: () => void;
  setMobileActiveTab: (tab: "edit" | "preview") => void;
  reset: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  selectedSectionId: null,
  selectedItemId: null,
  isDragging: false,
  showAiChat: false,
  showThemeEditor: false,
  zoom: 100,
  undoStack: [],
  redoStack: [],
  pendingAiMessage: null,
  optimizationRequest: null,
  mobileActiveTab: "edit",

  selectSection: (id) => set({ selectedSectionId: id, selectedItemId: null }),
  selectItem: (id) => set({ selectedItemId: id }),
  setDragging: (isDragging) => set({ isDragging }),
  toggleAiChat: () =>
    set((s) => {
      const next = !s.showAiChat;
      return {
        showAiChat: next,
        showThemeEditor: false,
        ...(next ? { mobileActiveTab: 'preview' as const } : {}),
      };
    }),
  setShowAiChat: (show) =>
    set({
      showAiChat: show,
      showThemeEditor: false,
      ...(show ? { mobileActiveTab: 'preview' as const } : {}),
    }),
  toggleThemeEditor: () => set((s) => ({ showThemeEditor: !s.showThemeEditor, showAiChat: false, mobileActiveTab: 'preview' })),
  setPanelView: (view) => set({ showAiChat: view === 'ai', showThemeEditor: view === 'theme', mobileActiveTab: 'preview' }),
  setZoom: (zoom) => set({ zoom }),

  pushSnapshot: (sections) => {
    set((state) => ({
      undoStack: [
        ...state.undoStack.slice(-MAX_UNDO_STACK + 1),
        { sections, timestamp: Date.now() },
      ],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    const snapshot = undoStack[undoStack.length - 1];
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, snapshot],
    }));
    return snapshot;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const snapshot = redoStack[redoStack.length - 1];
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, snapshot],
    }));
    return snapshot;
  },

  setPendingAiMessage: (message) => set({ pendingAiMessage: message }),
  requestAiOptimization: (scope = {}) => set((state) => (
    state.optimizationRequest
      ? state
      : {
          optimizationRequest: {
            id: crypto.randomUUID(),
            ...scope,
          },
        }
  )),
  clearAiOptimizationRequest: () => set({ optimizationRequest: null }),
  setMobileActiveTab: (tab) => set({ mobileActiveTab: tab }),

  reset: () =>
    set({
      selectedSectionId: null,
      selectedItemId: null,
      isDragging: false,
      showAiChat: false,
      showThemeEditor: false,
      zoom: 100,
      undoStack: [],
      redoStack: [],
      pendingAiMessage: null,
      optimizationRequest: null,
      mobileActiveTab: "edit",
    }),
}));
