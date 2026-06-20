import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CanvasRenderer } from '../core/CanvasRenderer';
import { 
  TEMPLATES, 
  GRADIENT_PRESETS, 
  FONT_FAMILIES, 
  DECORATION_SHAPES, 
  generateId,
  type TextElement,
  type DecorationElement,
  type CardElement,
  type BackgroundConfig,
} from '../types';

type TabType = 'text' | 'decoration' | 'background' | 'style';

const CardEditor: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elements, setElements] = useState<CardElement[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [textInput, setTextInput] = useState('');
  const [fontFamily, setFontFamily] = useState('Microsoft YaHei');
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#333333');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(0);
  
  const [selectedDecoration, setSelectedDecoration] = useState<DecorationElement['shape']>('heart');
  const [decorationColor, setDecorationColor] = useState('#FF6B6B');
  const [decorationScale, setDecorationScale] = useState(1);
  const [decorationRotation, setDecorationRotation] = useState(0);
  
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [selectedGradientId, setSelectedGradientId] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;

    renderer.setOnSelectChange((id) => {
      setSelectedElementId(id);
    });

    renderer.setOnElementsChange((els) => {
      setElements(els);
    });

    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      renderer.setBackground(template.background);
      
      template.defaultTexts.forEach((text) => {
        renderer.addElement({
          ...text,
          id: generateId(),
        } as TextElement);
      });
      
      template.defaultDecorations.forEach((dec) => {
        renderer.addElement({
          ...dec,
          id: generateId(),
        } as DecorationElement);
      });
    }

    return () => {
      renderer.destroy();
    };
  }, [templateId]);

  useEffect(() => {
    if (!selectedElementId || !rendererRef.current) return;
    
    const element = elements.find(el => el.id === selectedElementId);
    if (!element) return;

    if (element.type === 'text') {
      const textEl = element as TextElement;
      setTextInput(textEl.content);
      setFontFamily(textEl.fontFamily);
      setFontSize(textEl.fontSize);
      setTextColor(textEl.color);
      setStrokeWidth(textEl.strokeWidth);
      setStrokeColor(textEl.strokeColor);
      setShadowBlur(textEl.shadowBlur);
    } else {
      const decEl = element as DecorationElement;
      setSelectedDecoration(decEl.shape);
      setDecorationColor(decEl.color);
      setDecorationScale(decEl.scale);
      setDecorationRotation(decEl.rotation);
    }
  }, [selectedElementId, elements]);

  const getCanvasCoordinates = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    
    const { x, y } = getCanvasCoordinates(e);
    const element = rendererRef.current.getElementAtPosition(x, y);
    
    if (element) {
      rendererRef.current.startDrag(x, y);
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      rendererRef.current.setSelectedElementId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !isDragging) return;
    
    const { x, y } = getCanvasCoordinates(e);
    rendererRef.current.updateDrag(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    
    rendererRef.current.endDrag();
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  const handleAddText = () => {
    if (!rendererRef.current || !textInput.trim()) return;
    
    const newText: TextElement = {
      id: generateId(),
      type: 'text',
      content: textInput,
      x: 400,
      y: 300,
      fontSize,
      fontFamily,
      color: textColor,
      strokeWidth,
      strokeColor,
      shadowBlur,
      shadowColor: 'rgba(0,0,0,0.3)',
      rotation: 0,
    };
    
    rendererRef.current.addElement(newText);
    setTextInput('');
  };

  const handleAddDecoration = () => {
    if (!rendererRef.current) return;
    
    const newDecoration: DecorationElement = {
      id: generateId(),
      type: 'decoration',
      shape: selectedDecoration,
      x: 400,
      y: 300,
      scale: decorationScale,
      rotation: decorationRotation,
      color: decorationColor,
    };
    
    rendererRef.current.addElement(newDecoration);
  };

  const handleDeleteSelected = () => {
    if (!rendererRef.current || !selectedElementId) return;
    rendererRef.current.deleteElement(selectedElementId);
  };

  const handleUpdateSelected = (updates: Partial<CardElement>) => {
    if (!rendererRef.current || !selectedElementId) return;
    rendererRef.current.updateElement(selectedElementId, updates);
  };

  const handleGradientSelect = (gradientId: string) => {
    if (!rendererRef.current) return;
    
    const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId);
    if (gradient) {
      const bgConfig: BackgroundConfig = {
        type: 'gradient',
        gradient: {
          type: 'linear',
          colors: gradient.colors,
          angle: gradient.angle,
        },
      };
      rendererRef.current.setBackground(bgConfig);
      setSelectedGradientId(gradientId);
    }
  };

  const handleImageBackground = () => {
    if (!rendererRef.current || !bgImageUrl.trim()) return;
    
    const bgConfig: BackgroundConfig = {
      type: 'image',
      imageUrl: bgImageUrl,
    };
    rendererRef.current.setBackground(bgConfig);
    setSelectedGradientId(null);
  };

  const handlePreview = () => {
    if (!rendererRef.current) return;
    
    const dataURL = rendererRef.current.getCanvasDataURL();
    const state = {
      background: rendererRef.current.getBackground(),
      elements: rendererRef.current.getElements(),
      previewImage: dataURL,
    };
    navigate('/preview', { state });
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      handleDeleteSelected();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const tabs: { id: TabType; name: string; icon: string }[] = [
    { id: 'text', name: '文字', icon: '📝' },
    { id: 'decoration', name: '装饰', icon: '✨' },
    { id: 'background', name: '背景', icon: '🎨' },
    { id: 'style', name: '样式', icon: '⚙️' },
  ];

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button className="btn-secondary" onClick={handleBack}>
            ← 返回模板
          </button>
          <h1 className="text-2xl font-bold text-white hidden md:block">
            ✏️ 贺卡编辑器
          </h1>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleDeleteSelected} disabled={!selectedElementId}>
              🗑️ 删除
            </button>
            <button className="btn-primary" onClick={handlePreview}>
              👁️ 预览
            </button>
          </div>
        </div>

        <div className="md:hidden mb-4">
          <button 
            className="btn-primary w-full mb-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? '收起工具面板' : '展开工具面板'} ⚙️
          </button>
        </div>

        <div className="editor-layout flex flex-col md:flex-row gap-6">
          <div className={`tool-panel glass-panel p-4 w-full md:w-80 flex-shrink-0 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="space-y-4 max-h-96 md:max-h-[600px] overflow-y-auto">
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="input-label">文字内容</label>
                    <input
                      type="text"
                      className="input-field"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="输入贺卡文字..."
                    />
                  </div>
                  
                  <div>
                    <label className="input-label">字体</label>
                    <select
                      className="input-field"
                      value={fontFamily}
                      onChange={(e) => {
                        setFontFamily(e.target.value);
                        if (selectedElement?.type === 'text') {
                          handleUpdateSelected({ fontFamily: e.target.value });
                        }
                      }}
                    >
                      {FONT_FAMILIES.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="input-label">字号: {fontSize}px</label>
                    <input
                      type="range"
                      className="slider"
                      min="12"
                      max="72"
                      value={fontSize}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFontSize(val);
                        if (selectedElement?.type === 'text') {
                          handleUpdateSelected({ fontSize: val });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div>
                      <label className="input-label">文字颜色</label>
                      <input
                        type="color"
                        className="color-picker"
                        value={textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          if (selectedElement?.type === 'text') {
                            handleUpdateSelected({ color: e.target.value });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="input-label">描边颜色</label>
                      <input
                        type="color"
                        className="color-picker"
                        value={strokeColor}
                        onChange={(e) => {
                          setStrokeColor(e.target.value);
                          if (selectedElement?.type === 'text') {
                            handleUpdateSelected({ strokeColor: e.target.value });
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="input-label">描边宽度: {strokeWidth}px</label>
                    <input
                      type="range"
                      className="slider"
                      min="0"
                      max="4"
                      step="1"
                      value={strokeWidth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStrokeWidth(val);
                        if (selectedElement?.type === 'text') {
                          handleUpdateSelected({ strokeWidth: val });
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="input-label">阴影模糊: {shadowBlur}px</label>
                    <input
                      type="range"
                      className="slider"
                      min="0"
                      max="8"
                      step="1"
                      value={shadowBlur}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setShadowBlur(val);
                        if (selectedElement?.type === 'text') {
                          handleUpdateSelected({ shadowBlur: val });
                        }
                      }}
                    />
                  </div>
                  
                  <button className="btn-primary w-full" onClick={handleAddText}>
                    ➕ 添加文字
                  </button>
                </div>
              )}

              {activeTab === 'decoration' && (
                <div className="space-y-4">
                  <div>
                    <label className="input-label">选择装饰</label>
                    <div className="flex flex-wrap gap-2">
                      {DECORATION_SHAPES.map((dec) => (
                        <div
                          key={dec.shape}
                          className={`decoration-item ${selectedDecoration === dec.shape ? 'active' : ''}`}
                          onClick={() => setSelectedDecoration(dec.shape)}
                          title={dec.name}
                        >
                          {dec.icon}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="input-label">装饰颜色</label>
                    <input
                      type="color"
                      className="color-picker"
                      value={decorationColor}
                      onChange={(e) => {
                        setDecorationColor(e.target.value);
                        if (selectedElement?.type === 'decoration') {
                          handleUpdateSelected({ color: e.target.value });
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="input-label">大小: {decorationScale.toFixed(1)}x</label>
                    <input
                      type="range"
                      className="slider"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={decorationScale}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDecorationScale(val);
                        if (selectedElement?.type === 'decoration') {
                          handleUpdateSelected({ scale: val });
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="input-label">旋转: {decorationRotation}