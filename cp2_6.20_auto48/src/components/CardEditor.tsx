import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore, generateId } from '@/store/cardStore';
import { CanvasRenderer } from '@/core/CanvasRenderer';
import { gradientPresets, fontOptions } from '@/data/templates';
import type { TextElement, DecorationElement, DecorationShape, CardElementUnion } from '@/types';
import { Type, Star, Heart, Flower2, Trash2, Image, Palette, ChevronDown, ChevronUp, RotateCw, ZoomIn, Minus, Plus, Eye } from 'lucide-react';

type ToolSection = 'text' | 'decoration' | 'background' | 'properties';

export default function CardEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const dragRef = useRef<{ elementId: string; offsetX: number; offsetY: number } | null>(null);
  const animFrameRef = useRef<number>(0);

  const {
    elements,
    background,
    backgroundType,
    selectedElementId,
    addElement,
    removeElement,
    updateElement,
    selectElement,
    setBackground,
    moveElement,
  } = useCardStore();

  const [openSections, setOpenSections] = useState<Record<ToolSection, boolean>>({
    text: true,
    decoration: false,
    background: false,
    properties: false,
  });

  const [textInput, setTextInput] = useState('你好');
  const [imageUrl, setImageUrl] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  const toggleSection = (section: ToolSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderCanvas = useCallback(() => {
    if (!rendererRef.current) return;
    rendererRef.current.render(elements, background, backgroundType, selectedElementId);
  }, [elements, background, backgroundType, selectedElementId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new CanvasRenderer(canvasRef.current);
    renderCanvas();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    if (backgroundType === 'image' && imageUrl) {
      rendererRef.current?.loadImageBackground(imageUrl).then(() => {
        renderCanvas();
      }).catch(() => {});
    }
  }, [backgroundType, imageUrl, renderCanvas]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!rendererRef.current) return;
      const coords = rendererRef.current.getCanvasCoords(e.nativeEvent);

      let hitElement: CardElementUnion | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (rendererRef.current.hitTest(coords.x, coords.y, elements[i])) {
          hitElement = elements[i];
          break;
        }
      }

      if (hitElement) {
        selectElement(hitElement.id);
        dragRef.current = {
          elementId: hitElement.id,
          offsetX: coords.x - hitElement.x,
          offsetY: coords.y - hitElement.y,
        };
        if (canvasRef.current) canvasRef.current.classList.add('grabbing');
      } else {
        selectElement(null);
      }
    },
    [elements, selectElement]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragRef.current || !rendererRef.current) return;
      const coords = rendererRef.current.getCanvasCoords(e.nativeEvent);
      moveElement(
        dragRef.current.elementId,
        coords.x - dragRef.current.offsetX,
        coords.y - dragRef.current.offsetY
      );
    },
    [moveElement]
  );

  const handleCanvasMouseUp = useCallback(() => {
    dragRef.current = null;
    if (canvasRef.current) {
      canvasRef.current.classList.remove('grabbing');
    }
  }, []);

  const addTextElement = () => {
    const id = generateId();
    const newText: TextElement = {
      id,
      type: 'text',
      x: 400,
      y: 300,
      rotation: 0,
      scale: 1,
      text: textInput,
      fontFamily: 'Quicksand',
      fontSize: 28,
      color: '#FFFFFF',
      strokeWidth: 2,
      strokeColor: '#333333',
      shadowBlur: 4,
      shadowColor: 'rgba(0,0,0,0.3)',
    };
    addElement(newText);
    selectElement(id);
  };

  const addDecorationElement = (shape: DecorationShape) => {
    const id = generateId();
    const newDecoration: DecorationElement = {
      id,
      type: 'decoration',
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300,
      rotation: 0,
      scale: 1,
      shape,
    };
    addElement(newDecoration);
    selectElement(id);
  };

  const handleGradientSelect = (colors: [string, string]) => {
    setBackground(`${colors[0]},${colors[1]}`, 'gradient');
  };

  const handleImageUpload = () => {
    if (imageUrl.trim()) {
      setBackground(imageUrl.trim(), 'image');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedElementId) {
      removeElement(selectedElementId);
    }
  };

  const updateSelectedProperty = (key: string, value: string | number) => {
    if (selectedElementId) {
      let finalValue: string | number = value;
      if (key === 'rotation' && typeof value === 'number') {
        finalValue = Math.max(0, Math.min(360, Math.round(value / 15) * 15));
      }
      updateElement(selectedElementId, { [key]: finalValue } as Partial<CardElementUnion>);
    }
  };

  const SectionHeader = ({ section, icon, label }: { section: ToolSection; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {openSections[section] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  const toolPanelContent = (
    <div className="flex flex-col gap-1">
      <div className="px-3 py-2 text-lg font-bold text-white font-display">🛠 工具面板</div>

      <SectionHeader section="text" icon={<Type size={14} />} label="文字" />
      {openSections.text && (
        <div className="px-3 pb-3 space-y-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="输入文字内容..."
            className="w-full px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <button onClick={addTextElement} className="btn-gradient w-full py-1.5 text-sm">
            添加文字
          </button>
        </div>
      )}

      <SectionHeader section="decoration" icon={<Star size={14} />} label="装饰元素" />
      {openSections.decoration && (
        <div className="px-3 pb-3 grid grid-cols-3 gap-2">
          <button
            onClick={() => addDecorationElement('flower')}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Flower2 size={24} className="text-pink-300" />
            <span className="text-xs text-white/80">花朵</span>
          </button>
          <button
            onClick={() => addDecorationElement('star')}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Star size={24} className="text-yellow-300" />
            <span className="text-xs text-white/80">星星</span>
          </button>
          <button
            onClick={() => addDecorationElement('heart')}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Heart size={24} className="text-red-300" />
            <span className="text-xs text-white/80">心形</span>
          </button>
        </div>
      )}

      <SectionHeader section="background" icon={<Palette size={14} />} label="背景" />
      {openSections.background && (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {gradientPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleGradientSelect(preset.colors)}
                className="w-full aspect-square rounded-lg border-2 border-white/30 hover:border-white/60 transition-colors"
                style={{
                  background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                }}
                title={preset.name}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <Image size={12} />
              图片URL背景
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-2 py-1 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 text-xs focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <button onClick={handleImageUpload} className="btn-gradient px-2 py-1 text-xs">
                应用
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader section="properties" icon={<ZoomIn size={14} />} label="属性" />
      {openSections.properties && selectedElement && (
        <div className="px-3 pb-3 space-y-2.5">
          {selectedElement.type === 'text' && (
            <>
              <div>
                <label className="text-xs text-white/70 mb-1 block">文字内容</label>
                <input
                  type="text"
                  value={(selectedElement as TextElement).text}
                  onChange={(e) => updateSelectedProperty('text', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-white/20 border border-white/30 text-white text-xs focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 mb-1 block">字体</label>
                <select
                  value={(selectedElement as TextElement).fontFamily}
                  onChange={(e) => updateSelectedProperty('fontFamily', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-white/20 border border-white/30 text-white text-xs focus:outline-none"
                >
                  {fontOptions.map((f) => (
                    <option key={f} value={f} className="text-gray-900">{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/70 mb-1 flex items-center justify-between">
                  字体大小
                  <span className="text-white/50">{(selectedElement as TextElement).fontSize}px</span>
                </label>
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={(selectedElement as TextElement).fontSize}
                  onChange={(e) => updateSelectedProperty('fontSize', Number(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 mb-1 block">文字颜色</label>
                <input
                  type="color"
                  value={(selectedElement as TextElement).color}
                  onChange={(e) => updateSelectedProperty('color', e.target.value)}
                  className="w-8 h-8 rounded border border-white/30 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 mb-1 flex items-center justify-between">
                  描边宽度
                  <span className="text-white/50">{(selectedElement as TextElement).strokeWidth}px</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={(selectedElement as TextElement).strokeWidth}
                  onChange={(e) => updateSelectedProperty('strokeWidth', Number(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 mb-1 block">描边颜色</label>
                <input
                  type="color"
                  value={(selectedElement as TextElement).strokeColor}
                  onChange={(e) => updateSelectedProperty('strokeColor', e.target.value)}
                  className="w-8 h-8 rounded border border-white/30 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 mb-1 flex items-center justify-between">
                  阴影模糊
                  <span className="text-white/50">{(selectedElement as TextElement).shadowBlur}px</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={(selectedElement as TextElement).shadowBlur}
                  onChange={(e) => updateSelectedProperty('shadowBlur', Number(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-white/70 mb-1 flex items-center justify-between">
              缩放
              <span className="text-white/50">{selectedElement.scale.toFixed(1)}x</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSelectedProperty('scale', Math.max(0.5, selectedElement.scale - 0.1))}
                className="p-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <Minus size={12} />
              </button>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={selectedElement.scale}
                onChange={(e) => updateSelectedProperty('scale', Number(e.target.value))}
                className="flex-1 accent-purple-400"
              />
              <button
                onClick={() => updateSelectedProperty('scale', Math.min(2, selectedElement.scale + 0.1))}
                className="p-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/70 mb-1 flex items-center justify-between">
              旋转
              <span className="text-white/50">{selectedElement.rotation}°</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSelectedProperty('rotation', Math.max(0, selectedElement.rotation - 15))}
                className="p-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <RotateCw size={12} className="transform -scale-x-100" />
              </button>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={selectedElement.rotation}
                onChange={(e) => updateSelectedProperty('rotation', Number(e.target.value))}
                className="flex-1 accent-purple-400"
              />
              <button
                onClick={() => updateSelectedProperty('rotation', Math.min(360, selectedElement.rotation + 15))}
                className="p-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <RotateCw size={12} />
              </button>
            </div>
          </div>

          <button
            onClick={handleDeleteSelected}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-200 text-sm transition-colors"
          >
            <Trash2 size={14} />
            删除元素
          </button>
        </div>
      )}
      {!selectedElement && openSections.properties && (
        <div className="px-3 pb-3 text-xs text-white/50 text-center py-4">
          点击画布上的元素以编辑属性
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen gap-4 p-4">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden btn-gradient px-4 py-2 text-sm self-start"
      >
        {isMobileMenuOpen ? '关闭工具面板' : '打开工具面板'}
      </button>

      {/* Tool Panel - Desktop */}
      <div className="hidden md:block w-72 shrink-0 glass-panel p-2 overflow-y-auto max-h-[calc(100vh-2rem)]">
        {toolPanelContent}
      </div>

      {/* Tool Panel - Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-panel p-2 max-h-80 overflow-y-auto">
          {toolPanelContent}
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="glass-panel max-w-full h-auto"
            style={{ cursor: selectedElement ? 'grab' : 'default' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => useCardStore.getState().clearCanvas()}
            className="btn-gradient px-5 py-2 text-sm flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            清空画布
          </button>
          <button
            onClick={() => navigate('/preview')}
            className="btn-gradient px-5 py-2 text-sm flex items-center gap-1.5"
          >
            <Eye size={14} />
            预览贺卡
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-gradient px-5 py-2 text-sm"
          >
            🏠 首页
          </button>
        </div>
      </div>
    </div>
  );
}
