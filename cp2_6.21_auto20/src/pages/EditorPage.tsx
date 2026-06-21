import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import PanelComponent from '../modules/storyboard/PanelComponent';
import BubbleOverlay from '../modules/dialogue/BubbleOverlay';
import { storyboardEngine } from '../modules/storyboard/StoryboardEngine';
import { dialogueEditor } from '../modules/dialogue/DialogueEditor';
import { effectManager, getSpeedlineData } from '../modules/effects/EffectManager';
import {
  Panel,
  Bubble,
  EffectItem,
  Size,
  PRESET_COLORS,
  ONOMATOPOEIA_LIST,
  SPEEDLINE_TYPES,
  GRID_SIZE,
  CANVAS_PADDING
} from '../types';

type CollapsibleSection = 'size' | 'background' | 'border' | 'bubbles' | 'effects' | 'spacing';

const EditorPage: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [panelSpacing, setPanelSpacing] = useState<number>(10);
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 1200, height: 900 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Record<CollapsibleSection, boolean>>({
    size: true,
    background: true,
    border: true,
    bubbles: true,
    effects: true,
    spacing: true
  });
  const [draggingPanelIndex, setDraggingPanelIndex] = useState<number | null>(null);

  const [widthInput, setWidthInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');

  useEffect(() => {
    const initialPanels: Panel[] = [
      storyboardEngine.createDefaultPanel(CANVAS_PADDING, CANVAS_PADDING, 0),
      storyboardEngine.createDefaultPanel(CANVAS_PADDING + 200 + panelSpacing, CANVAS_PADDING, 1),
      storyboardEngine.createDefaultPanel(CANVAS_PADDING, CANVAS_PADDING + 150 + panelSpacing, 2)
    ];
    setPanels(initialPanels);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const mobile = window.innerWidth < 1200;
      setIsMobile(mobile);
      if (!mobile) setSidebarCollapsed(false);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        setCanvasSize({
          width: Math.max(1000, parent.clientWidth - 40),
          height: Math.max(700, parent.clientHeight - 40)
        });
      }
    }
  }, [sidebarCollapsed, isMobile]);

  const selectedPanel = panels.find(p => p.id === selectedPanelId) || null;

  useEffect(() => {
    if (selectedPanel) {
      setWidthInput(String(selectedPanel.width));
      setHeightInput(String(selectedPanel.height));
    }
  }, [selectedPanelId, selectedPanel?.width, selectedPanel?.height]);

  // Keyboard arrow key support for moving panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPanelId) return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowLeft':
          dx = -step;
          break;
        case 'ArrowRight':
          dx = step;
          break;
        case 'ArrowUp':
          dy = -step;
          break;
        case 'ArrowDown':
          dy = step;
          break;
        default:
          return;
      }

      e.preventDefault();
      setPanels(prev => prev.map(p => {
        if (p.id !== selectedPanelId) return p;
        return storyboardEngine.movePanelByKeyboard(p, dx, dy, canvasSize, step > 1);
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPanelId, canvasSize]);

  const handleCanvasClick = useCallback(() => {
    setSelectedPanelId(null);
    setSelectedBubbleId(null);
    setSelectedEffectId(null);
  }, []);

  const addPanel = useCallback(() => {
    const existingCount = panels.length;
    const cols = Math.floor((canvasSize.width - CANVAS_PADDING * 2) / (200 + panelSpacing));
    const col = existingCount % Math.max(1, cols);
    const row = Math.floor(existingCount / Math.max(1, cols));
    const newPanel = storyboardEngine.createDefaultPanel(
      CANVAS_PADDING + col * (200 + panelSpacing),
      CANVAS_PADDING + row * (150 + panelSpacing),
      existingCount
    );
    setPanels(prev => [...prev, newPanel]);
    setSelectedPanelId(newPanel.id);
  }, [panels.length, canvasSize.width, panelSpacing]);

  const deleteSelectedPanel = useCallback(() => {
    if (!selectedPanelId) return;
    setPanels(prev => {
      const filtered = prev.filter(p => p.id !== selectedPanelId);
      return filtered.map((p, idx) => ({ ...p, order: idx }));
    });
    setSelectedPanelId(null);
    setSelectedBubbleId(null);
    setSelectedEffectId(null);
  }, [selectedPanelId]);

  const handlePanelPositionChange = useCallback((id: string, x: number, y: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  }, []);

  const handlePanelSizeChange = useCallback((id: string, width: number, height: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, width: Math.round(width), height: Math.round(height) } : p));
  }, []);

  const handlePanelPositionAndSizeChange = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    setPanels(prev => prev.map(p =>
      p.id === id ? { ...p, x, y, width: Math.round(width), height: Math.round(height) } : p
    ));
  }, []);

  const applyPanelSize = useCallback((dim: 'width' | 'height') => {
    if (!selectedPanelId) return;
    const val = dim === 'width' ? parseInt(widthInput) : parseInt(heightInput);
    if (isNaN(val) || val < 60) return;

    setPanels(prev => prev.map(p => {
      if (p.id !== selectedPanelId) return p;
      if (dim === 'width') {
        return storyboardEngine.resizePanel(p, val, p.height, canvasSize);
      }
      return storyboardEngine.resizePanel(p, p.width, val, canvasSize);
    }));
  }, [selectedPanelId, widthInput, heightInput, canvasSize]);

  const updatePanelStyle = useCallback((updates: Partial<Pick<Panel, 'backgroundColor' | 'borderWidth' | 'borderColor'>>) => {
    if (!selectedPanelId) return;
    setPanels(prev => prev.map(p => p.id === selectedPanelId ? { ...p, ...updates } : p));
  }, [selectedPanelId]);

  const addBubble = useCallback((type: 'ellipse' | 'rectangle' | 'cloud') => {
    if (!selectedPanel) return;
    if (selectedPanel.bubbles.length >= 3) {
      alert('每个面板最多支持3个对话气泡');
      return;
    }
    const newBubble = dialogueEditor.createBubble(type, selectedPanel.width, selectedPanel.height);
    setPanels(prev => prev.map(p =>
      p.id === selectedPanelId ? { ...p, bubbles: [...p.bubbles, newBubble] } : p
    ));
    setSelectedBubbleId(newBubble.id);
  }, [selectedPanel, selectedPanelId]);

  const updateBubble = useCallback((updatedBubble: Bubble) => {
    if (!selectedPanelId) return;
    setPanels(prev => prev.map(p => {
      if (p.id !== selectedPanelId) return p;
      return {
        ...p,
        bubbles: p.bubbles.map(b => b.id === updatedBubble.id ? updatedBubble : b)
      };
    }));
  }, [selectedPanelId]);

  const deleteBubble = useCallback((bubbleId: string) => {
    if (!selectedPanelId) return;
    setPanels(prev => prev.map(p => {
      if (p.id !== selectedPanelId) return p;
      return { ...p, bubbles: p.bubbles.filter(b => b.id !== bubbleId) };
    }));
    if (selectedBubbleId === bubbleId) setSelectedBubbleId(null);
  }, [selectedPanelId, selectedBubbleId]);

  const addEffect = useCallback((type: 'onomatopoeia' | 'speedline', subtype: string) => {
    if (!selectedPanel) return;
    const newEffect = effectManager.createEffect(type, subtype, selectedPanel);
    setPanels(prev => prev.map(p =>
      p.id === selectedPanelId ? { ...p, effects: [...p.effects, newEffect] } : p
    ));
    setSelectedEffectId(newEffect.id);
  }, [selectedPanel, selectedPanelId]);

  const updateEffect = useCallback((updatedEffect: EffectItem) => {
    if (!selectedPanelId) return;
    setPanels(prev => prev.map(p => {
      if (p.id !== selectedPanelId) return p;
      return {
        ...p,
        effects: p.effects.map(e => e.id === updatedEffect.id ? updatedEffect : e)
      };
    }));
  }, [selectedPanelId]);

  const deleteEffect = useCallback((effectId: string) => {
    if (!selectedPanelId) return;
    setPanels(prev => prev.map(p => {
      if (p.id !== selectedPanelId) return p;
      return { ...p, effects: p.effects.filter(e => e.id !== effectId) };
    }));
    if (selectedEffectId === effectId) setSelectedEffectId(null);
  }, [selectedPanelId, selectedEffectId]);

  const handlePanelReorder = useCallback((fromIdx: number, toIdx: number) => {
    setPanels(prev => storyboardEngine.reorderPanels(prev, fromIdx, toIdx));
  }, []);

  const exportToPng = useCallback(async () => {
    if (!canvasRef.current) return;

    const a4WidthMm = 210;
    const a4HeightMm = 297;
    const dpi = 150;
    const a4WidthPx = Math.round((a4WidthMm / 25.4) * dpi);
    const a4HeightPx = Math.round((a4HeightMm / 25.4) * dpi);

    const originalStyle = canvasRef.current.style.cssText;
    canvasRef.current.style.background = '#FFFFFF';
    canvasRef.current.style.border = 'none';

    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = a4WidthPx;
      exportCanvas.height = a4HeightPx;
      const ctx = exportCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, a4WidthPx, a4HeightPx);

        const scale = Math.min(a4WidthPx / canvas.width, a4HeightPx / canvas.height) * 0.9;
        const drawWidth = canvas.width * scale;
        const drawHeight = canvas.height * scale;
        const offsetX = (a4WidthPx - drawWidth) / 2;
        const offsetY = (a4HeightPx - drawHeight) / 2;

        ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);
      }

      const link = document.createElement('a');
      link.download = `storyboard_${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请重试');
    } finally {
      canvasRef.current.style.cssText = originalStyle;
    }
  }, []);

  const toggleSection = useCallback((section: CollapsibleSection) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const sortedPanels = [...panels].sort((a, b) => a.order - b.order);

  const overlappingPanelIds = selectedPanelId
    ? storyboardEngine.checkPanelSpacing(panels, selectedPanelId, panelSpacing)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          flexShrink: 0,
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToolbarButton title="新建分镜面板" onClick={addPanel}>
            <div style={{ width: 18, height: 2, background: '#333', position: 'relative' }}>
              <div style={{ width: 2, height: 18, background: '#333', position: 'absolute', left: 8, top: -8 }} />
            </div>
          </ToolbarButton>

          <ToolbarButton title="删除选中面板" onClick={deleteSelectedPanel} disabled={!selectedPanelId}>
            <div style={{ width: 18, height: 18, border: '2px solid #333', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 2, background: '#333' }} />
            </div>
          </ToolbarButton>

          <div style={{ width: 1, height: 24, background: '#E0E0E0', margin: '0 4px' }} />

          <ToolbarButton title="导出为PNG" onClick={exportToPng}>
            <div style={{ width: 16, height: 18, border: '2px solid #333', borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: 3, left: 2, right: 2, height: 4, background: '#333' }} />
              <div style={{ position: 'absolute', top: 3, left: 5, width: 2, height: 4, background: '#333' }} />
            </div>
          </ToolbarButton>

          {isMobile && (
            <ToolbarButton title="属性面板" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ width: 16, height: 2, background: '#333' }} />
                <div style={{ width: 16, height: 2, background: '#333' }} />
                <div style={{ width: 16, height: 2, background: '#333' }} />
              </div>
            </ToolbarButton>
          )}
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
          漫画分镜故事板编辑器
        </div>

        <div style={{ width: 200 }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* Canvas area */}
        <div
          style={{
            flex: isMobile ? 1 : undefined,
            width: isMobile ? '100%' : '70%',
            minWidth: 0,
            backgroundColor: '#F0F0F0',
            padding: 20,
            overflow: 'auto',
            position: 'relative'
          }}
          onClick={handleCanvasClick}
        >
          <div
            ref={canvasRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: canvasSize.width,
              height: canvasSize.height,
              backgroundColor: '#FFFFFF',
              border: '2px dashed #D0D0D0',
              margin: '0 auto',
              backgroundImage: `
                linear-gradient(to right, rgba(220,220,220,0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(220,220,220,0.3) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
            }}
          >
            {sortedPanels.map(panel => {
              const overlappingBubbleIds = selectedBubbleId
                ? dialogueEditor.checkBubbleOverlap(panel.bubbles, selectedBubbleId)
                : [];

              return (
                <PanelComponent
                  key={panel.id}
                  panel={panel}
                  isSelected={panel.id === selectedPanelId}
                  onSelect={setSelectedPanelId}
                  onDoubleClick={setSelectedPanelId}
                  onPositionChange={handlePanelPositionChange}
                  onSizeChange={handlePanelSizeChange}
                  onPositionAndSizeChange={handlePanelPositionAndSizeChange}
                  canvasSize={canvasSize}
                  showWarning={overlappingPanelIds.includes(panel.id)}
                >
                  <BubbleOverlay
                    bubbles={panel.bubbles}
                    panel={panel}
                    selectedBubbleId={panel.id === selectedPanelId ? selectedBubbleId : null}
                    onSelectBubble={(id) => {
                      setSelectedPanelId(panel.id);
                      setSelectedBubbleId(id);
                      setSelectedEffectId(null);
                    }}
                    onBubbleChange={updateBubble}
                    overlappingIds={overlappingBubbleIds}
                  />

                  {panel.effects.map(effect => (
                    <EffectRenderer
                      key={effect.id}
                      effect={effect}
                      isSelected={panel.id === selectedPanelId && effect.id === selectedEffectId}
                      onSelect={() => {
                        setSelectedPanelId(panel.id);
                        setSelectedEffectId(effect.id);
                        setSelectedBubbleId(null);
                      }}
                      panel={panel}
                      onChange={updateEffect}
                    />
                  ))}
                </PanelComponent>
              );
            })}
          </div>
        </div>

        {/* Property sidebar overlay for mobile */}
        {isMobile && sidebarCollapsed && (
          <div
            onClick={() => setSidebarCollapsed(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 10,
              transition: 'opacity 0.3s ease'
            }}
          />
        )}

        {/* Right property panel */}
        <div
          style={{
            width: isMobile ? (sidebarCollapsed ? 320 : 0) : '30%',
            minWidth: isMobile ? 0 : 280,
            maxWidth: isMobile ? 320 : undefined,
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #E0E0E0',
            overflowY: 'auto',
            overflowX: 'hidden',
            transition: isMobile ? 'width 0.3s ease' : undefined,
            position: isMobile ? 'absolute' : 'relative',
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: isMobile ? 20 : 'auto',
            flexShrink: 0
          }}
        >
          {(!isMobile || sidebarCollapsed) && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 280 }}>
              {/* Selected panel thumbnail */}
              <div
                style={{
                  borderRadius: 12,
                  backgroundColor: '#FAFAFA',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>
                  {selectedPanel ? `分镜面板 #${selectedPanel.order + 1}` : '未选中面板'}
                </div>
                <div
                  style={{
                    width: 140,
                    height: Math.round(140 * (selectedPanel?.height || 150) / (selectedPanel?.width || 200)),
                    backgroundColor: selectedPanel?.backgroundColor || '#EEEEEE',
                    border: `2px solid ${selectedPanel?.borderColor || '#999999'}`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: 11,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {!selectedPanel && '预览'}
                  {selectedPanel && selectedPanel.bubbles.map((b, i) => (
                    <div
                      key={b.id}
                      style={{
                        position: 'absolute',
                        left: `${(b.x / selectedPanel.width) * 100}%`,
                        top: `${(b.y / selectedPanel.height) * 100}%`,
                        width: `${(b.width / selectedPanel.width) * 100}%`,
                        height: `${(b.height / selectedPanel.height) * 100}%`,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        border: '1px solid #CCC',
                        borderRadius: b.type === 'ellipse' ? '50%' : b.type === 'cloud' ? '50% 50% 50% 50% / 60% 60% 40% 40%' : 2,
                        fontSize: 4,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 1
                      }}
                    >
                      {b.text.slice(0, 4)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel list with drag reorder */}
              <CollapsibleSection
                title={`分镜列表 (${panels.length})`}
                expanded={expandedSections.spacing}
                onToggle={() => toggleSection('spacing')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sortedPanels.map((panel, idx) => (
                    <div
                      key={panel.id}
                      draggable
                      onDragStart={() => setDraggingPanelIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggingPanelIndex !== null && draggingPanelIndex !== idx) {
                          handlePanelReorder(draggingPanelIndex, idx);
                        }
                        setDraggingPanelIndex(null);
                      }}
                      onDragEnd={() => setDraggingPanelIndex(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPanelId(panel.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 6,
                        backgroundColor: panel.id === selectedPanelId ? '#E3F2FD' : '#F5F5F5',
                        border: panel.id === selectedPanelId ? '1px solid #1976D2' : '1px solid transparent',
                        cursor: 'grab',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 30,
                          backgroundColor: panel.backgroundColor,
                          border: `1px solid ${panel.borderColor}`,
                          borderRadius: 3,
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#333' }}>
                        #{panel.order + 1}
                      </div>
                      <div style={{ fontSize: 10, color: '#999' }}>
                        {panel.width}×{panel.height}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Global spacing slider */}
              <CollapsibleSection
                title="全局间距"
                expanded={expandedSections.size}
                onToggle={() => toggleSection('size')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 12, color: '#666' }}>面板间距</label>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1976D2' }}>{panelSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={panelSpacing}
                    onChange={(e) => setPanelSpacing(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#1976D2' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999' }}>
                    <span>5px</span>
                    <span>30px</span>
                  </div>
                </div>
              </CollapsibleSection>

              {selectedPanel && (
                <>
                  {/* Size input */}
                  <CollapsibleSection
                    title="面板尺寸"
                    expanded={expandedSections.background}
                    onToggle={() => toggleSection('background')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>宽度 (px)</label>
                          <input
                            type="number"
                            value={widthInput}
                            min={60}
                            onChange={(e) => setWidthInput(e.target.value)}
                            onBlur={() => applyPanelSize('width')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>高度 (px)</label>
                          <input
                            type="number"
                            value={heightInput}
                            min={60}
                            onChange={(e) => setHeightInput(e.target.value)}
                            onBlur={() => applyPanelSize('height')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: '#999' }}>
                        提示：按方向键微调面板位置，按住 Shift 加速
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* Background color */}
                  <CollapsibleSection
                    title="背景颜色"
                    expanded={expandedSections.border}
                    onToggle={() => toggleSection('border')}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => updatePanelStyle({ backgroundColor: color })}
                          title={color}
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: color,
                            border: selectedPanel.backgroundColor === color ? '2px solid #1976D2' : '1px solid #E0E0E0',
                            borderRadius: 6,
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.15s ease',
                            outline: 'none'
                          }}
                        />
                      ))}
                      <label style={inputStyle}>
                        <input
                          type="color"
                          value={selectedPanel.backgroundColor}
                          onChange={(e) => updatePanelStyle({ backgroundColor: e.target.value })}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, width: '100%', height: '100%' }}
                        />
                      </label>
                    </div>
                  </CollapsibleSection>

                  {/* Border settings */}
                  <CollapsibleSection
                    title="边框设置"
                    expanded={expandedSections.bubbles}
                    onToggle={() => toggleSection('bubbles')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>边框宽度</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1, 2, 3].map(w => (
                            <button
                              key={w}
                              onClick={() => updatePanelStyle({ borderWidth: w as 1 | 2 | 3 })}
                              style={{
                                flex: 1,
                                padding: '6px 0',
                                fontSize: 12,
                                borderRadius: 4,
                                border: selectedPanel.borderWidth === w ? '1px solid #1976D2' : '1px solid #E0E0E0',
                                backgroundColor: selectedPanel.borderWidth === w ? '#E3F2FD' : '#FAFAFA',
                                color: selectedPanel.borderWidth === w ? '#1976D2' : '#333',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>边框颜色</label>
                        <select
                          value={selectedPanel.borderColor}
                          onChange={(e) => updatePanelStyle({ borderColor: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="#333333">深灰 (#333333)</option>
                          <option value="#000000">黑色 (#000000)</option>
                        </select>
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* Bubbles */}
                  <CollapsibleSection
                    title={`对话气泡 (${selectedPanel.bubbles.length}/3)`}
                    expanded={expandedSections.effects}
                    onToggle={() => toggleSection('effects')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <BubbleTypeButton label="椭圆" type="ellipse" onClick={() => addBubble('ellipse')} disabled={selectedPanel.bubbles.length >= 3} />
                        <BubbleTypeButton label="矩形" type="rectangle" onClick={() => addBubble('rectangle')} disabled={selectedPanel.bubbles.length >= 3} />
                        <BubbleTypeButton label="云朵" type="cloud" onClick={() => addBubble('cloud')} disabled={selectedPanel.bubbles.length >= 3} />
                      </div>

                      {selectedPanel.bubbles.map(bubble => (
                        <BubblePropertyEditor
                          key={bubble.id}
                          bubble={bubble}
                          isSelected={bubble.id === selectedBubbleId}
                          onSelect={() => {
                            setSelectedBubbleId(bubble.id);
                            setSelectedEffectId(null);
                          }}
                          onChange={updateBubble}
                          onDelete={() => deleteBubble(bubble.id)}
                        />
                      ))}
                    </div>
                  </CollapsibleSection>

                  {/* Effects */}
                  <CollapsibleSection
                    title={`效果文字 (${selectedPanel.effects.length})`}
                    expanded={expandedSections.spacing && false}
                    onToggle={() => {}}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>拟声词</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {ONOMATOPOEIA_LIST.slice(0, 4).map(word => (
                            <button
                              key={word}
                              onClick={() => addEffect('onomatopoeia', word)}
                              style={{
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 4,
                                border: '1px solid #E0E0E0',
                                backgroundColor: '#FAFAFA',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>速度线</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {SPEEDLINE_TYPES.map(type => (
                            <button
                              key={type}
                              onClick={() => addEffect('speedline', type)}
                              style={{
                                flex: 1,
                                padding: '4px 0',
                                fontSize: 10,
                                borderRadius: 4,
                                border: '1px solid #E0E0E0',
                                backgroundColor: '#FAFAFA',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {type === 'horizontal' ? '水平' : type === 'vertical' ? '垂直' : '放射'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedPanel.effects.map(effect => (
                        <EffectPropertyEditor
                          key={effect.id}
                          effect={effect}
                          isSelected={effect.id === selectedEffectId}
                          onSelect={() => {
                            setSelectedEffectId(effect.id);
                            setSelectedBubbleId(null);
                          }}
                          onChange={updateEffect}
                          onDelete={() => deleteEffect(effect.id)}
                        />
                      ))}
                    </div>
                  </CollapsibleSection>
                </>
              )}

              {!selectedPanel && (
                <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
                  点击画布中的分镜面板以编辑属性
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #E0E0E0',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box' as const,
  height: 32
};

const ToolbarButton: React.FC<{
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, disabled, children }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 36,
      height: 36,
      borderRadius: 8,
      border: 'none',
      backgroundColor: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s ease',
      opacity: disabled ? 0.4 : 1,
      padding: 0,
      outline: 'none'
    }}
    onMouseEnter={(e) => {
      if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E0E0E0';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
    }}
  >
    {children}
  </button>
);

const CollapsibleSection: React.FC<{
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, expanded, onToggle, children }) => (
  <div style={{ overflow: 'hidden' }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: '#333',
        outline: 'none'
      }}
    >
      <span>{title}</span>
      <div
        style={{
          width: 10,
          height: 10,
          borderRight: '2px solid #999',
          borderBottom: '2px solid #999',
          transform: expanded ? 'rotate(45deg)' : 'rotate(-45deg)',
          transition: 'transform 0.2s ease',
          marginTop: expanded ? -2 : 2
        }}
      />
    </button>
    <div
      style={{
        maxHeight: expanded ? 2000 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.2s ease',
        opacity: expanded ? 1 : 0,
        transitionProperty: 'max-height, opacity'
      }}
    >
      {children}
    </div>
  </div>
);

const BubbleTypeButton: React.FC<{
  label: string;
  type: 'ellipse' | 'rectangle' | 'cloud';
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      flex: 1,
      padding: '6px 0',
      fontSize: 11,
      borderRadius: 4,
      border: '1px solid #E0E0E0',
      backgroundColor: disabled ? '#F0F0F0' : '#FAFAFA',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease',
      opacity: disabled ? 0.5 : 1,
      fontWeight: 600,
      color: '#333'
    }}
  >
    {label}
  </button>
);

const BubblePropertyEditor: React.FC<{
  bubble: Bubble;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (bubble: Bubble) => void;
  onDelete: () => void;
}> = ({ bubble, isSelected, onSelect, onChange, onDelete }) => (
  <div
    onClick={onSelect}
    style={{
      padding: 10,
      borderRadius: 6,
      border: isSelected ? '1px solid #1976D2' : '1px solid #E0E0E0',
      backgroundColor: isSelected ? '#E3F2FD' : '#FAFAFA',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>
        {bubble.type === 'ellipse' ? '椭圆' : bubble.type === 'rectangle' ? '矩形' : '云朵'}气泡
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          border: 'none',
          backgroundColor: '#FFEBEE',
          color: '#D32F2F',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
      >
        ×
      </button>
    </div>

    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 3 }}>文字内容</label>
        <input
          type="text"
          value={bubble.text}
          onChange={(e) => onChange({ ...bubble, text: e.target.value })}
          style={{ ...inputStyle, height: 28, fontSize: 11 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 3 }}>字号</label>
          <input
            type="number"
            min={12}
            max={24}
            value={bubble.fontSize}
            onChange={(e) => onChange({ ...bubble, fontSize: Number(e.target.value) })}
            style={{ ...inputStyle, height: 28, fontSize: 11 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 3 }}>颜色</label>
          <div style={{ ...inputStyle, height: 28, padding: 2, display: 'flex', alignItems: 'center' }}>
            <input
              type="color"
              value={bubble.textColor}
              onChange={(e) => onChange({ ...bubble, textColor: e.target.value })}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 3 }}>对齐方式</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              onClick={() => onChange({ ...bubble, textAlign: align })}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 10,
                borderRadius: 4,
                border: bubble.textAlign === align ? '1px solid #1976D2' : '1px solid #E0E0E0',
                backgroundColor: bubble.textAlign === align ? '#E3F2FD' : '#FFFFFF',
                cursor: 'pointer',
                fontWeight: 600,
                color: bubble.textAlign === align ? '#1976D2' : '#333'
              }}
            >
              {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const EffectPropertyEditor: React.FC<{
  effect: EffectItem;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (effect: EffectItem) => void;
  onDelete: () => void;
}> = ({ effect, isSelected, onSelect, onChange, onDelete }) => (
  <div
    onClick={onSelect}
    style={{
      padding: 10,
      borderRadius: 6,
      border: isSelected ? '1px solid #1976D2' : '1px solid #E0E0E0',
      backgroundColor: isSelected ? '#E3F2FD' : '#FAFAFA',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>
        {effect.type === 'onomatopoeia' ? effect.text : (effect.subtype === 'horizontal' ? '水平速度线' : effect.subtype === 'vertical' ? '垂直速度线' : '放射速度线')}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          border: 'none',
          backgroundColor: '#FFEBEE',
          color: '#D32F2F',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
      >
        ×
      </button>
    </div>

    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 10, color: '#666' }}>旋转角度</label>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#1976D2' }}>{Math.round(effect.rotation)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={effect.rotation}
          onChange={(e) => onChange(effectManager.updateEffectRotation(effect, Number(e.target.value)))}
          style={{ width: '100%', accentColor: '#1976D2' }}
        />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 10, color: '#666' }}>透明度</label>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#1976D2' }}>{effect.opacity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={effect.opacity}
          onChange={(e) => onChange(effectManager.updateEffectOpacity(effect, Number(e.target.value)))}
          style={{ width: '100%', accentColor: '#1976D2' }}
        />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 10, color: '#666' }}>缩放</label>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#1976D2' }}>{effect.scale.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={effect.scale}
          onChange={(e) => onChange(effectManager.updateEffectScale(effect, Number(e.target.value)))}
          style={{ width: '100%', accentColor: '#1976D2' }}
        />
      </div>
    </div>
  </div>
);

const SpeedlineSvg: React.FC<{
  subtype: string;
  size: number;
  opacity: number;
  rotation: number;
}> = ({ subtype, size, opacity, rotation }) => {
  const data = getSpeedlineData(subtype, size);
  return (
    <svg
      width={size}
      height={size}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        display: 'block'
      }}
    >
      {data.lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#333"
          strokeWidth={line.width}
          opacity={opacity}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

const EffectRenderer: React.FC<{
  effect: EffectItem;
  isSelected: boolean;
  onSelect: () => void;
  panel: Panel;
  onChange: (effect: EffectItem) => void;
}> = ({ effect, isSelected, onSelect, panel, onChange }) => {
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startEffectX: number; startEffectY: number }>({
    isDragging: false, startX: 0, startY: 0, startEffectX: 0, startEffectY: 0
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startEffectX: effect.x,
      startEffectY: effect.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const moved = effectManager.moveEffect(
        { ...effect, x: dragRef.current.startEffectX + dx, y: dragRef.current.startEffectY + dy },
        0, 0, panel
      );
      onChange(moved);
    };
    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [effect, panel, onChange]);

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: effect.x,
    top: effect.y,
    transform: `rotate(${effect.rotation}deg) scale(${effect.scale})`,
    transformOrigin: 'center center',
    opacity: effect.opacity,
    cursor: 'move',
    boxShadow: isSelected ? '0 0 0 2px rgba(25, 118, 210, 0.4)' : 'none',
    padding: 4,
    userSelect: 'none'
  };

  if (effect.type === 'onomatopoeia') {
    return (
      <div
        onMouseDown={handleMouseDown}
        style={{
          ...baseStyle,
          fontSize: 28,
          fontWeight: 900,
          color: '#D32F2F',
          fontStyle: 'italic',
          WebkitTextStroke: '1.5px #000',
          textShadow: '2px 2px 0 #FFF'
        }}
      >
        {effect.text}
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        ...baseStyle,
        pointerEvents: 'auto'
      }}
    >
      <SpeedlineSvg subtype={effect.subtype} size={80} opacity={effect.opacity} rotation={0} />
    </div>
  );
};

export default EditorPage;
