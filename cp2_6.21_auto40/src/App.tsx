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
    const checkWidth = () => {
      setPanelCollapsed(window.innerWidth < 1024);
    };
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
      ? manager.elements.find((e) => e.id === manager.selectedIds[0]) || null
      : null;

  const handleExport = useCallback(async () => {
    setShowExportProgress(true);
    try {
      const blob = await exportToPNG(manager.elements, paperSize);
      setTimeout(() => {
        downloadBlob(blob, `手账模板_${paperSize}_${Date.now()}.png`);
        setShowExportProgress(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setShowExportProgress(false);
    }
  }, [manager.elements, paperSize]);

  const handleSaveTemplate = useCallback(async () => {
    const name = templateName.trim() || `模板 ${new Date().toLocaleDateString('zh-CN')}`;
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

  const alignButtons: { type: AlignmentType; label: string; icon: string }[] = [
    { type: 'left', label: '左对齐', icon: '⬅' },
    { type: 'center-h', label: '水平居中', icon: '↔' },
    { type: 'right', label: '右对齐', icon