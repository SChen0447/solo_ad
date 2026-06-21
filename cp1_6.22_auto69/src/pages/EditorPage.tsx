import { useEffect, useRef, useCallback, useState } from 'react';
import { FabricCanvas } from '../components/Canvas/FabricCanvas';
import { Toolbar } from '../components/Toolbar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ExportDialog } from '../components/ExportDialog';
import { useCanvasHistory } from '../hooks/useCanvasHistory';
import { useEditorStore } from '../store/useEditorStore';
import type { CanvasApi, TemplateData, FabricObjectWithProps } from '../types/types';

export function EditorPage() {
  const canvasRef = useRef<CanvasApi | null>(null);
  const {
    templates,
    setTemplates,
    selectedObject,
    setSelectedObject,
    showExportDialog,
    setShowExportDialog,
    canvasApi,
    setCanvasApi,
    isLoading,
    setIsLoading,
    isTemplateApplying,
  } = useEditorStore();

  const [previewUrl, setPreviewUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const {
    canUndo,
    canRedo,
    saveState,
    initializeHistory,
    undo,
    redo,
    clearHistory,
  } = useCanvasHistory(canvasApi);

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
      });
  }, [setTemplates]);

  const handleCanvasReady = useCallback((api: CanvasApi) => {
    canvasRef.current = api;
    setCanvasApi(api);
    setTimeout(() => {
      initializeHistory();
    }, 100);
  }, [setCanvasApi, initializeHistory]);

  const handleStateChange = useCallback(() => {
    if (!isTemplateApplying) {
      saveState();
    }
  }, [saveState, isTemplateApplying]);

  const handleSelectionChange = useCallback((obj: FabricObjectWithProps | null) => {
    setSelectedObject(obj);
    if (obj) {
      useEditorStore.getState().setActivePanel('properties');
    }
  }, [setSelectedObject]);

  const handleApplyTemplate = useCallback(async (template: TemplateData) => {
    if (!canvasApi) return;

    setIsLoading(true);
    clearHistory();

    try {
      const applyFn = (window as any).applyTemplate;
      if (typeof applyFn === 'function') {
        await applyFn(template.data);
        setTimeout(() => {
          saveState();
        }, 600);
      }
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [canvasApi, clearHistory, saveState, setIsLoading]);

  const handleExport = useCallback(() => {
    if (!canvasApi) return;

    const dataUrl = canvasApi.toDataURL();

    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      previewCanvas.width = img.width * 0.1;
      previewCanvas.height = img.height * 0.1;
      previewCtx?.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      setPreviewUrl(previewCanvas.toDataURL());
      setDownloadUrl(null);
      setShowExportDialog(true);
    };

    img.src = dataUrl;
  }, [canvasApi, setShowExportDialog]);

  const handleConfirmExport = useCallback(async () => {
    if (!canvasApi) return;

    setIsExporting(true);

    try {
      const dataUrl = canvasApi.toDataURL();

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataUrl,
          dpi: 300,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDownloadUrl(result.downloadUrl);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('导出失败，请重试');
      setShowExportDialog(false);
    } finally {
      setIsExporting(false);
    }
  }, [canvasApi, setShowExportDialog]);

  const handleCloseExport = useCallback(() => {
    setShowExportDialog(false);
    setPreviewUrl('');
    setDownloadUrl(null);
    setIsExporting(false);
  }, [setShowExportDialog]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f0f4f8]">
      <Toolbar
        canvasApi={canvasApi}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
      />

      <main className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-[#4a90d9] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <FabricCanvas
          onCanvasReady={handleCanvasReady}
          onStateChange={handleStateChange}
          onSelectionChange={handleSelectionChange}
        />
      </main>

      <PropertiesPanel
        selectedObject={selectedObject}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
      />

      <ExportDialog
        isOpen={showExportDialog}
        onClose={handleCloseExport}
        onConfirm={handleConfirmExport}
        previewUrl={previewUrl}
        isExporting={isExporting}
        downloadUrl={downloadUrl}
      />
    </div>
  );
}
