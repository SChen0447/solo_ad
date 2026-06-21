import { create } from 'zustand';
import type { TemplateData, SelectedObjectProps, CanvasApi, FabricObjectWithProps } from '../types/types';

interface EditorState {
  templates: TemplateData[];
  selectedObject: FabricObjectWithProps | null;
  activePanel: 'templates' | 'properties';
  showExportDialog: boolean;
  canvasApi: CanvasApi | null;
  isLoading: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  isTemplateApplying: boolean;

  setTemplates: (templates: TemplateData[]) => void;
  setSelectedObject: (obj: FabricObjectWithProps | null) => void;
  setActivePanel: (panel: 'templates' | 'properties') => void;
  setShowExportDialog: (show: boolean) => void;
  setCanvasApi: (api: CanvasApi | null) => void;
  setIsLoading: (loading: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setIsTemplateApplying: (applying: boolean) => void;
  updateSelectedObject: (props: Partial<SelectedObjectProps>) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  templates: [],
  selectedObject: null,
  activePanel: 'templates',
  showExportDialog: false,
  canvasApi: null,
  isLoading: false,
  leftPanelOpen: true,
  rightPanelOpen: true,
  isTemplateApplying: false,

  setTemplates: (templates) => set({ templates }),
  setSelectedObject: (obj) => set({ selectedObject: obj }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setShowExportDialog: (show) => set({ showExportDialog: show }),
  setCanvasApi: (api) => set({ canvasApi: api }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setIsTemplateApplying: (applying) => set({ isTemplateApplying: applying }),

  updateSelectedObject: (props) => {
    const { canvasApi, selectedObject } = get();
    if (!canvasApi || !selectedObject) return;

    canvasApi.updateObject(props);
    set({
      selectedObject: {
        ...selectedObject,
        ...props,
      } as FabricObjectWithProps,
    });
  },
}));
