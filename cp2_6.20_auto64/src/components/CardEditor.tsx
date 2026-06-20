import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TextElement, DecorationElement, DecorationType, BackgroundConfig, CardElement } from '../types';
import { CanvasRenderer, CANVAS_W, CANVAS_H } from '../core/CanvasRenderer';
import { gradientBackgrounds, fontOptions, decorationColors } from '../data/templates';
import { useCardStore } from '../store';

let nextId = 1000;
function genId(): string {
  return `el_${Date.now()}_${nextId++}`;
}

type ToolTab = 'text' | 'decoration' | 'background';

const decorationIcons: Record<DecorationType, string> = {
  flower: '🌸',
  star: '⭐',
  heart: '❤️',
  balloon: '🎈',
  confetti: '🎊',
};

const defaultText: Omit<TextElement, 'id'> = {
  type: 'text',
  content: '输入文字',
  x: 400,
  y: 300,
  fontSize: 28,
  fontFamily: 'Noto Sans SC',
  color: '#333333',
  strokeWidth: 0,
  strokeColor: '#FFFFFF',
  shadowBlur: 0,
  shadowColor: 'rgba(0,0,0,0.3)',
};

const CardEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [activeTab, setActiveTab] = useState<ToolTab>('text');
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef<{ startX: number; startY: number; elStartX: number; elStartY: number } | null>(null);
  const [textInput, setTextInput] = useState(defaultText.content);
  const [textFont, setTextFont] = useState(defaultText.fontFamily);
  const [textSize, setTextSize] = useState(defaultText.fontSize);
  const [textColor, setTextColor] = useState(defaultText.color);
  const [strokeWidth, setStrokeWidth] = useState(defaultText.strokeWidth);
  const [strokeColor, setStrokeColor] = useState(defaultText.strokeColor);
  const [shadowBlur, setShadowBlur] = useState(defaultText.shadowBlur);
  const [shadowColor, setShadowColor] = useState(defaultText.shadowColor);
  const [decoType, setDecoType] = useState<DecorationType>('flower');
  const [decoScale, setDecoScale] = useState(1);
  const [decoRotation, setDecoRotation] = useState(0);
  const [decoColor, setDecoColor] = useState('#FF6B6B');
  const [bgUrl, setBgUrl] = useState('');

  const template = useCardStore((state) => state.selectedTemplate!);
  const texts = useCardStore((state) => state.texts);
  const decorations = useCardStore((state) => state.decorations);
  const background = useCardStore((state) => state.background);
  const selectedElementId = useCardStore((state) => state.selectedElementId);
  const storeAddText = useCardStore((state) => state.addText);
  const storeUpdateText = useCardStore((state) => state.updateText);
  const storeAddDecoration = useCardStore((state) => state.addDecoration);
  const storeUpdateDecoration = useCardStore((state) => state.updateDecoration);
  const storeRemoveElement = useCardStore((state) => state.removeElement);
  const storeSetBackground = useCardStore((state) => state.setBackground);
  const storeSetSelected = useCardStore((state) => state.setSelectedElement);
  const storeSetPage = useCardStore((state) => state.setPage);
  const storeSetPreviewData = useCardStore((state) => state.setPreviewCanvasData);
  const storeGoBack = useCardStore((state) => state.goBack);

  const elements: CardElement[] = [...texts, ...decorations];
  const selectedElement = selectedElementId ? elements.find((e) => e.id === selectedElementId) : null;

  const syncStoreToRenderer = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setBackground(background);
    texts.forEach((t) => renderer.addText(t));
    decorations.forEach((d) => renderer.addDecoration(d));
    renderer.setSelected(selectedElementId);
    renderer.markDirty();
  }, [background, texts, decorations, selectedElementId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;
    syncStoreToRenderer();
    return () => renderer.destroy();
  }, []);

  useEffect(() => {
    syncStoreToRenderer();
  }, [syncStoreToRenderer]);

  useEffect(() => {
    if (selectedElement) {
      if (selectedElement.type === 'text') {
        setTextInput(selectedElement.content);
        setTextFont(selectedElement.fontFamily);
        setTextSize(selectedElement.fontSize);
        setTextColor(selectedElement.color);
        setStrokeWidth(selectedElement.strokeWidth);
        setStrokeColor(selectedElement.strokeColor);
        setShadowBlur(selectedElement.shadowBlur);
        setShadowColor(selectedElement.shadowColor);
      } else {
        setDecoType(selectedElement.shape);
        setDecoScale(selectedElement.scale);
        setDecoRotation(selectedElement.rotation);
        setDecoColor(selectedElement.color);
      }
    }
  }, [selectedElementId]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hitId = renderer.hitTest(x, y);
    renderer.setSelected(hitId);
    storeSetSelected(hitId);

    if (hitId) {
      const el = elements.find((e) => e.id === hitId);
      if (el) {
        setIsDragging(true);
        dragInfo.current = {
          startX: e.clientX,
          startY: e.clientY,
          elStartX: el.x,
          elStartY: el.y,
        };
        canvas.style.cursor = 'move';
      }
    }
    renderer.markDirty();
  }, [elements, storeSetSelected]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragInfo.current || !selectedElementId) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const newX = dragInfo.current.elStartX + dx * scaleX;
    const newY = dragInfo.current.elStartY + dy * scaleY;

    const el = elements.find((e) => e.id === selectedElementId);
    if (!el) return;

    if (el.type === 'text') {
      storeUpdateText(el.id, { x: newX, y: newY });
      renderer.updateText(el.id, { x: newX, y: newY });
    } else {
      storeUpdateDecoration(el.id, { x: newX, y: newY });
      renderer.updateDecoration(el.id, { x: newX, y: newY });
    }
    renderer.markDirty();
  }, [isDragging, selectedElementId, elements, storeUpdateText, storeUpdateDecoration]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    dragInfo.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  const handleAddText = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const el: TextElement = {
      id: genId(),
      type: 'text',
      content: textInput,
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 200,
      fontSize: textSize,
      fontFamily: textFont,
      color: textColor,
      strokeWidth,
      strokeColor,
      shadowBlur,
      shadowColor,
    };
    renderer.addText(el);
    renderer.setSelected(el.id);
    storeAddText(el);
    storeSetSelected(el.id);
    renderer.markDirty();
  }, [textInput, textSize, textFont, textColor, strokeWidth, strokeColor, shadowBlur, shadowColor, storeAddText, storeSetSelected]);

  const handleAddDecoration = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const el: DecorationElement = {
      id: genId(),
      type: 'decoration',
      shape: decoType,
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300,
      scale: decoScale,
      rotation: decoRotation,
      color: decoColor,
    };
    renderer.addDecoration(el);
    renderer.setSelected(el.id);
    storeAddDecoration(el);
    storeSetSelected(el.id);
    renderer.markDirty();
  }, [decoType, decoScale, decoRotation, decoColor, storeAddDecoration, storeSetSelected]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedElementId) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.removeElement(selectedElementId);
    storeRemoveElement(selectedElementId);
    storeSetSelected(null);
    renderer.markDirty();
  }, [selectedElementId, storeRemoveElement, storeSetSelected]);

  const handleBackgroundSelect = useCallback((bg: BackgroundConfig) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setBackground(bg);
    storeSetBackground(bg);
    renderer.markDirty();
  }, [storeSetBackground]);

  const handleBgUrlSubmit = useCallback(() => {
    if (!bgUrl.trim()) return;
    handleBackgroundSelect({ type: 'image', value: bgUrl.trim() });
  }, [bgUrl, handleBackgroundSelect]);

  const handleUpdateSelected = useCallback((updates: Partial<TextElement> | Partial<DecorationElement>) => {
    if (!selectedElementId || !selectedElement) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (selectedElement.type === 'text') {
      storeUpdateText(selectedElementId, updates as Partial<TextElement>);
      renderer.updateText(selectedElementId, updates as Partial<TextElement>);
    } else {
      storeUpdateDecoration(selectedElementId, updates as Partial<DecorationElement>);
      renderer.updateDecoration(selectedElementId, updates as Partial<DecorationElement>);
    }
    renderer.markDirty();
  }, [selectedElementId, selectedElement, storeUpdateText, storeUpdateDecoration]);

  const handlePreview = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setSelected(null);
    storeSetSelected(null);
    renderer.markDirty();
    setTimeout(() => {
      const dataUrl = renderer.getCanvasDataURL();
      storeSetPreviewData(dataUrl);
      storeSetPage('preview');
    }, 50);
  }, [storeSetPage, storeSetSelected, storeSetPreviewData]);

  const handleReset = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setBackground(template.background);
    storeSetBackground(template.background);
    renderer.markDirty();
  }, [template, storeSetBackground]);

  const renderTextPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className="label-text">文字内容</label>
      <input
        className="input-field"
        value={textInput}
        onChange={(e) => {
          setTextInput(e.target.value);
          if (selectedElement?.type === 'text') handleUpdateSelected({ content: e.target.value });
        }}
        placeholder="输入贺卡文字"
      />

      <label className="label-text">字体</label>
      <select
        className="select-field"
        value={textFont}
        onChange={(e) => {
          setTextFont(e.target.value);
          if (selectedElement?.type === 'text') handleUpdateSelected({ fontFamily: e.target.value });
        }}
      >
        {fontOptions.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label className="label-text">字号 ({textSize}px)</label>
          <input
            type="range"
            className="range-slider"
            min={12}
            max={72}
            value={textSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTextSize(v);
              if (selectedElement?.type === 'text') handleUpdateSelected({ fontSize: v });
            }}
          />
        </div>
        <input
          type="color"
          className="color-input"
          value={textColor}
          onChange={(e) => {
            setTextColor(e.target.value);
            if (selectedElement?.type === 'text') handleUpdateSelected({ color: e.target.value });
          }}
        />
      </div>

      <label className="label-text">描边宽度 ({strokeWidth}px)</label>
      <input
        type="range"
        className="range-slider"
        min={0}
        max={4}
        value={strokeWidth}
        onChange={(e) => {
          const v = Number(e.target.value);
          setStrokeWidth(v);
          if (selectedElement?.type === 'text') handleUpdateSelected({ strokeWidth: v });
        }}
      />

      {strokeWidth > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="label-text" style={{ marginBottom: 0 }}>描边颜色</label>
          <input
            type="color"
            className="color-input"
            value={strokeColor}
            onChange={(e) => {
              setStrokeColor(e.target.value);
              if (selectedElement?.type === 'text') handleUpdateSelected({ strokeColor: e.target.value });
            }}
          />
        </div>
      )}

      <label className="label-text">阴影模糊 ({shadowBlur}px)</label>
      <input
        type="range"
        className="range-slider"
        min={0}
        max={8}
        value={shadowBlur}
        onChange={(e) => {
          const v = Number(e.target.value);
          setShadowBlur(v);
          if (selectedElement?.type === 'text') handleUpdateSelected({ shadowBlur: v });
        }}
      />

      {shadowBlur > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="label-text" style={{ marginBottom: 0 }}>阴影颜色</label>
          <input
            type="color"
            className="color-input"
            value={shadowColor.startsWith('#') ? shadowColor : '#000000'}
            onChange={(e) => {
              const v = e.target.value;
              const rgba = `rgba(${parseInt(v.slice(1, 3), 16)},${parseInt(v.slice(3, 5), 16)},${parseInt(v.slice(5, 7), 16)},0.5)`;
              setShadowColor(rgba);
              if (selectedElement?.type === 'text') handleUpdateSelected({ shadowColor: rgba });
            }}
          />
        </div>
      )}

      <button className="btn" onClick={handleAddText} style={{ marginTop: '6px' }}>
        + 添加文字
      </button>
    </div>
  );

  const renderDecorationPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className="label-text">选择装饰</label>
      <div className="decoration-grid">
        {(['flower', 'star', 'heart', 'balloon', 'confetti'] as DecorationType[]).map((dt) => (
          <div
            key={dt}
            className={`decoration-item ${decoType === dt ? 'active' : ''}`}
            style={decoType === dt ? { borderColor: '#AA96DA', background: 'rgba(170,150,218,0.2)' } : {}}
            onClick={() => {
              setDecoType(dt);
              if (selectedElement?.type === 'decoration') handleUpdateSelected({ shape: dt });
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setDecoType(dt); }}
          >
            {decorationIcons[dt]}
          </div>
        ))}
      </div>

      <label className="label-text">大小 ({decoScale.toFixed(1)}x)</label>
      <input
        type="range"
        className="range-slider"
        min={0.5}
        max={2}
        step={0.1}
        value={decoScale}
        onChange={(e) => {
          const v = Number(e.target.value);
          setDecoScale(v);
          if (selectedElement?.type === 'decoration') handleUpdateSelected({ scale: v });
        }}
      />

      <label className="label-text">旋转 ({decoRotation}°)</label>
      <input
        type="range"
        className="range-slider"
        min={0}
        max={360}
        step={15}
        value={decoRotation}
        onChange={(e) => {
          const v = Number(e.target.value);
          setDecoRotation(v);
          if (selectedElement?.type === 'decoration') handleUpdateSelected({ rotation: v });
        }}
      />

      <label className="label-text">颜色</label>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {decorationColors.map((c) => (
          <div
            key={c}
            onClick={() => {
              setDecoColor(c);
              if (selectedElement?.type === 'decoration') handleUpdateSelected({ color: c });
            }}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: c,
              cursor: 'pointer',
              border: decoColor === c ? '2px solid #fff' : '2px solid rgba(255,255,255,0.3)',
              transition: 'all 0.15s ease',
              boxShadow: decoColor === c ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
            }}
          />
        ))}
      </div>

      <button className="btn" onClick={handleAddDecoration} style={{ marginTop: '6px' }}>
        + 添加装饰
      </button>
    </div>
  );

  const renderBackgroundPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className="label-text">预设渐变背景</label>
      <div className="gradient-grid">
        {gradientBackgrounds.map((bg, idx) => (
          <div
            key={idx}
            className={`gradient-item ${background.value === bg.value ? 'active' : ''}`}
            style={{ background: bg.value }}
            onClick={() => handleBackgroundSelect(bg)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBackgroundSelect(bg); }}
          />
        ))}
      </div>

      <label className="label-text" style={{ marginTop: '8px' }}>自定义图片URL</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          className="input-field"
          value={bgUrl}
          onChange={(e) => setBgUrl(e.target.value)}
          placeholder="输入图片URL"
          style={{ flex: 1 }}
        />
        <button className="btn btn-sm" onClick={handleBgUrlSubmit}>应用</button>
      </div>

      <label className="label-text">纯色背景</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['#FFF8F0', '#F5E6CA', '#E8D5B7', '#D4E6F1', '#D5F5E3', '#FADBD8'].map((c) => (
          <div
            key={c}
            onClick={() => handleBackgroundSelect({ type: 'solid', value: c })}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: c,
              cursor: 'pointer',
              border: background.value === c ? '2px solid #AA96DA' : '2px solid rgba(255,255,255,0.3)',
              transition: 'all 0.15s ease',
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="editor-layout" style={{
      display: 'flex',
      height: '100vh',
      position: 'relative',
      zIndex: 1,
    }}>
      <div className="tool-panel glass-panel" style={{
        width: '280px',
        minWidth: '280px',
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <button className="btn btn-sm" onClick={storeGoBack} style={{ padding: '6px 10px', fontSize: '11px' }}>
            ← 返回
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {template.icon} {template.name}
          </span>
        </div>

        <div className="tab-group">
          {(['text', 'decoration', 'background'] as ToolTab[]).map((tab) => (
            <button
              key={tab}
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'text' ? '文字' : tab === 'decoration' ? '装饰' : '背景'}
            </button>
          ))}
        </div>

        {activeTab === 'text' && renderTextPanel()}
        {activeTab === 'decoration' && renderDecorationPanel()}
        {activeTab === 'background' && renderBackgroundPanel()}

        {selectedElementId && (
          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected} style={{ width: '100%' }}>
              删除选中元素
            </button>
          </div>
        )}
      </div>

      <div className="canvas-area" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '16px',
        overflow: 'auto',
      }}>
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ maxWidth: '100%', height: 'auto', cursor: isDragging ? 'move' : 'default' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn" onClick={handlePreview}>
            预览贺卡
          </button>
          <button className="btn btn-sm" onClick={handleReset}>
            重置背景
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardEditor;
