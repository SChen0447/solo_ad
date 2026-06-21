import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CanvasArea } from './components/CanvasArea';
import { ToolPanel } from './components/ToolPanel';
import { useElementManager } from './hooks/useElementManager';
import { exportToPNG, downloadBlob, generateThumbnail } from './utils/exportUtils';
import { loadTemplates, saveTemplates, createTemplate } from './utils/templateUtils';
import {
  PaperSize,
  PAPER_SIZES,
  AlignmentType,
  GuideLine,
  Template,
  ElementType,
  CanvasElement,
} from './types';

const App: React.FC = () => {
  const manager = useElementManager();
  const [paperSize, setPaperSize] = useState<PaperSize>('A5');
  const [showGrid, setShowGrid] = useState(true);
  const [guidelines, setGuidelines] = useState<GuideLine[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    const checkWidth = () => setPanelCollapsed(window.innerWidth < 1024);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) manager.redo();
        else manager.undo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        manager.deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [manager]);

  const selectedElement =
    manager.selectedIds.length === 1
      ? manager.elements.find((el) => el.id === manager.selectedIds[0]) || null
      : null;

  const handleExport = useCallback(async () => {
    setShowExportProgress(true);
    try {
      const blob = await exportToPNG(manager.elements, paperSize);
      setTimeout(() => {
        downloadBlob(blob, `journal_${paperSize}_${Date.now()}.png`);
        setShowExportProgress(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setShowExportProgress(false);
    }
  }, [manager.elements, paperSize]);

  const handleSaveTemplate = useCallback(async () => {
    const name = templateName.trim() || `template_${new Date().toLocaleDateString('zh-CN')}`;
    const thumbnail = await generateThumbnail(manager.elements, paperSize);
    const tpl = createTemplate(name, paperSize, manager.elements, thumbnail);
    const next = [tpl, ...templates];
    setTemplates(next);
    saveTemplates(next);
    setShowSaveDialog(false);
    setTemplateName('');
  }, [manager.elements, paperSize, templateName, templates]);

  const handleLoadTemplate = useCallback(
    (tpl: Template) => {
      setPaperSize(tpl.paperSize);
      manager.setAllElements(JSON.parse(JSON.stringify(tpl.elements)) as CanvasElement[]);
      setGuidelines([]);
    },
    [manager]
  );

  const handleDeleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTemplates(next);
      return next;
    });
  }, []);

  const handleAddGuideline = useCallback((g: GuideLine) => {
    setGuidelines((prev) => [...prev, g]);
  }, []);

  const handleRemoveGuideline = useCallback((id: string) => {
    setGuidelines((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const handleUpdateGuideline = useCallback((id: string, position: number) => {
    setGuidelines((prev) => prev.map((g) => (g.id === id ? { ...g, position } : g)));
  }, []);

  const handleAddElement = useCallback(
    (type: ElementType, x: number, y: number) => {
      manager.addElement(type, x, y);
    },
    [manager]
  );

  const alignButtons: { type: AlignmentType; label: string; svg: string }[] = [
    { type: 'top', label: '上对齐', svg: '<line x1="8" y1="4" x2="8" y2="20"/><polyline points="3,8 8,3 13,8"/><line x1="3" y1="20" x2="13" y2="20"/>' },
    { type: 'bottom', label: '下对齐', svg: '<line x1="8" y1="4" x2="8" y2="20"/><polyline points="3,16 8,21 13,16"/><line x1="3" y1="4" x2="13" y2="4"/>' },
    { type: 'left', label: '左对齐', svg: '<line x1="4" y1="8" x2="20" y2="8"/><polyline points="8,3 3,8 8,13"/><line x1="20" y1="3" x2="20" y2="13"/>' },
    { type: 'right', label: '右对齐', svg: '<line x1="4" y1="8" x2="20" y2="8"/><polyline points="16,3 21,8 16,13"/><line x1="4" y1="3" x2="4" y2="13"/>' },
    { type: 'center-h', label: '水平居中', svg: '<line x1="12" y1="3" x2="12" y2="21"/><line x1="5" y1="7" x2="19" y2="7"/><line x1="5" y1="17" x2="19" y2="17"/>' },
    { type: 'center-v', label: '垂直居中', svg: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="7" y1="5" x2="7" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/>' },
  ];

  const paper = PAPER_SIZES[paperSize];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 48,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginRight: 4 }}>
          手账模板设计器
        </div>
        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as PaperSize)}
          style={{
            padding: '6px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: 13,
            background: '#FFFFFF',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="A5">A5 ({PAPER_SIZES.A5.width}×{PAPER_SIZES.A5.height})</option>
          <option value="A6">A6 ({PAPER_SIZES.A6.width}×{PAPER_SIZES.A6.height})</option>
          <option value="B6">B6 ({PAPER_SIZES.B6.width}×{PAPER_SIZES.B6.height})</option>
        </select>

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        {alignButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => manager.alignElements(btn.type)}
            disabled={manager.selectedIds.length < 2}
            title={btn.label}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: manager.selectedIds.length < 2 ? '#F3F4F6' : '#FFFFFF',
              cursor: manager.selectedIds.length < 2 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (manager.selectedIds.length >= 2) e.currentTarget.style.background = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              if (manager.selectedIds.length >= 2) e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={manager.selectedIds.length < 2 ? '#9CA3AF' : '#374151'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: btn.svg }} />
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        <button
          onClick={() => manager.undo()}
          disabled={!manager.canUndo}
          title="撤销 (Ctrl+Z)"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: manager.canUndo ? '#FFFFFF' : '#F3F4F6',
            cursor: manager.canUndo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
            padding: 0,
          }}
          onMouseEnter={(e) => { if (manager.canUndo) e.currentTarget.style.background = '#E5E7EB'; }}
          onMouseLeave={(e) => { if (manager.canUndo) e.currentTarget.style.background = '#FFFFFF'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={manager.canUndo ? '#374151' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          onClick={() => manager.redo()}
          disabled={!manager.canRedo}
          title="重做 (Ctrl+Shift+Z)"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: manager.canRedo ? '#FFFFFF' : '#F3F4F6',
            cursor: manager.canRedo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
            padding: 0,
          }}
          onMouseEnter={(e) => { if (manager.canRedo) e.currentTarget.style.background = '#E5E7EB'; }}
          onMouseLeave={(e) => { if (manager.canRedo) e.currentTarget.style.background = '#FFFFFF'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={manager.canRedo ? '#374151' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23,4 23,10 17,10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={manager.elements.length === 0}
          style={{
            padding: '6px 14px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            background: manager.elements.length === 0 ? '#F3F4F6' : '#FFFFFF',
            cursor: manager.elements.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13,
            color: '#374151',
            transition: 'all 0.15s',
          }}
        >
          保存模板
        </button>

        <button
          onClick={handleExport}
          disabled={manager.elements.length === 0}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: 8,
            background: manager.elements.length === 0
              ? '#93C5FD'
              : 'linear-gradient(to right, #3B82F6, #2563EB)',
            color: '#FFFFFF',
            cursor: manager.elements.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => { if (manager.elements.length > 0) e.currentTarget.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
        >
          导出PNG
        </button>

        <div style={{ flex: 1 }} />

        <select
          value={showGrid ? 'show' : 'hide'}
          onChange={(e) => setShowGrid(e.target.value === 'show')}
          style={{
            padding: '6px 10px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: 12,
            background: '#FFFFFF',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="show">网格: 显示</option>
          <option value="hide">网格: 隐藏</option>
        </select>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <CanvasArea
          elements={manager.elements}
          selectedIds={manager.selectedIds}
          paperSize={paperSize}
          showGrid={showGrid}
          guidelines={guidelines}
          onSelectElement={manager.selectElement}
          onClearSelection={manager.clearSelection}
          onUpdateElement={manager.updateElement}
          onUpdateElements={manager.updateElements}
          onAddGuideline={handleAddGuideline}
          onRemoveGuideline={handleRemoveGuideline}
          onUpdateGuideline={handleUpdateGuideline}
          canvasRef={canvasRef}
        />

        {!panelCollapsed && (
          <ToolPanel
            selectedElement={selectedElement}
            paperSize={paperSize}
            templates={templates}
            onUpdateElement={manager.updateElement}
            onUpdateElementStyle={manager.updateElementStyle}
            onAddElement={handleAddElement}
            onLoadTemplate={handleLoadTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}
      </div>

      {panelCollapsed && (
        <div
          style={{
            height: 280,
            background: '#F3F4F6',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
            overflowY: 'auto',
            padding: 16,
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <ToolPanel
            selectedElement={selectedElement}
            paperSize={paperSize}
            templates={templates}
            onUpdateElement={manager.updateElement}
            onUpdateElementStyle={manager.updateElementStyle}
            onAddElement={handleAddElement}
            onLoadTemplate={handleLoadTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        </div>
      )}

      {showExportProgress && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '4px solid #E5E7EB',
              borderTopColor: '#60A5FA',
              borderRightColor: '#1D4ED8',
              animation: 'spin 1.5s linear infinite',
            }}
          />
        </div>
      )}

      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              width: 360,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              保存模板
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#6B7280' }}>模板名称</div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={`模板 ${new Date().toLocaleDateString('zh-CN')}`}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF' }}>
              {paperSize} · {manager.elements.length} 个元素
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'linear-gradient(to right, #3B82F6, #2563EB)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(280px); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
