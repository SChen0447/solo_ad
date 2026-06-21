import React, { useState, useEffect, useRef, useCallback, useMemo, CSSProperties } from 'react';
import { FontWrapper, loadFontFromFile, FontInfo } from './fontLoader';
import { Typesetter, LayoutResult, TypesetParams, TextAlign } from './typesetter';
import { CanvasRenderer, RenderOptions } from './renderer';
import Controls, { ControlValues } from './controls';
import './styles.css';

interface FontFaceStyle extends HTMLStyleElement {
  // extension marker
}

const DEFAULT_TEXT = `字体排印实验室 Typography Lab

欢迎使用在线字体排印工具！上传您的 .woff2 或 .ttf 字体文件，调整字距行距，即可实时预览排版效果。

The quick brown fox jumps over the lazy dog.

使用方法：
  1. 点击"上传字体文件"按钮选择本地字体
  2. 在文本框中输入要预览的内容
  3. 拖动滑块调整字号、字距和行距
  4. 切换对齐方式查看不同排版
  5. 开启对比模式比较自定义字体与系统字体

支持中英文混合排版，参考线和网格帮助您精确定位。调整完成后可生成A5尺寸测试卡片，支持PNG导出和复制到剪贴板。

— Typography Lab 2026`;

const App: React.FC = () => {
  const [font, setFont] = useState<FontWrapper | null>(null);
  const [fontInfo, setFontInfo] = useState<FontInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLong, setIsLoadingLong] = useState(false);
  const loadTimerRef = useRef<number | null>(null);

  const [values, setValues] = useState<ControlValues>({
    fontSize: 24,
    letterSpacing: 0,
    lineHeightFactor: 1.5,
    textAlign: 'left',
    text: DEFAULT_TEXT,
    showGuides: true,
    compareMode: false,
  });

  const [debouncedText, setDebouncedText] = useState(DEFAULT_TEXT);
  const [cardVisible, setCardVisible] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color?: string } | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [fontReady, setFontReady] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<CanvasRenderer | null>(null);
  const cardRendererRef = useRef<CanvasRenderer | null>(null);
  const defaultFontFaceInjectedRef = useRef(false);
  const layoutCacheRef = useRef<{ key: string; layout: LayoutResult } | null>(null);

  const useOffscreen = values.text.length > 1000;

  const textDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (textDebounceRef.current) {
      window.clearTimeout(textDebounceRef.current);
    }
    textDebounceRef.current = window.setTimeout(() => {
      setDebouncedText(values.text);
    }, 200);
    return () => {
      if (textDebounceRef.current) window.clearTimeout(textDebounceRef.current);
    };
  }, [values.text]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 900) setMobileExpanded(false);
    else setMobileExpanded(true);
  }, [windowWidth]);

  const injectFontFace = useCallback((wrapper: FontWrapper) => {
    try {
      const styleId = 'custom-font-face-' + wrapper.fontFamily;
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        @font-face {
          font-family: "${wrapper.fontFamily}";
          src: url("${wrapper.url}") format("woff2");
          font-display: swap;
        }
      `;
      // Force font loading
      try {
        const f = new FontFace(wrapper.fontFamily, `url("${wrapper.url}")`);
        (document as any).fonts?.add(f);
        f.load().then(() => {
          // trigger re-render
          setFontReady((v) => v + 1);
        }).catch(() => {});
      } catch (e) {}
    } catch (e) {}
  }, []);

  const handleUploadFont = useCallback(async (file: File) => {
    setLoadError(null);
    setIsLoading(true);
    setIsLoadingLong(false);
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    loadTimerRef.current = window.setTimeout(() => {
      setIsLoadingLong(true);
    }, 200);

    try {
      const wrapper = await loadFontFromFile(file);
      setFont(wrapper);
      setFontInfo(wrapper.info);
      injectFontFace(wrapper);
      setIsLoading(false);
      setIsLoadingLong(false);
    } catch (e: any) {
      setFont(null);
      setFontInfo(null);
      setLoadError(e?.message || '文件格式不支持或解析失败');
      setIsLoading(false);
      setIsLoadingLong(false);
    } finally {
      if (loadTimerRef.current) {
        window.clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    }
  }, [injectFontFace]);

  const handleChange = useCallback((key: keyof ControlValues, v: any) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  }, []);

  const showToast = useCallback((msg: string, color?: string) => {
    setToast({ msg, color });
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  const customFontFamily = useMemo(() => font?.fontFamily, [font]);
  const defaultFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const computeLayout = useCallback((text: string, params: TypesetParams, useFont: FontWrapper | null): LayoutResult => {
    const key = [
      text, params.fontSize, params.letterSpacing, params.lineHeightFactor,
      params.textAlign, params.maxWidth, useFont?.fontFamily || 'default'
    ].join('|||');

    if (layoutCacheRef.current && layoutCacheRef.current.key === key) {
      return layoutCacheRef.current.layout;
    }

    if (useFont) {
      const typesetter = new Typesetter(useFont);
      const layout = typesetter.layout(text, params);
      layoutCacheRef.current = { key, layout };
      return layout;
    }
    return computeBrowserLayout(text, params);
  }, []);

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const wrap = previewWrapRef.current;
    if (!canvas || !wrap) return;

    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas);
    }
    const renderer = rendererRef.current;
    renderer.setUseOffscreen(useOffscreen);

    const rect = wrap.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width < 10 || height < 10) return;

    renderer.resize(width, height);

    const baseMaxWidth = Math.max(200, width - 140);
    const effectiveFont = font;

    const typesetParams: TypesetParams = {
      fontSize: values.fontSize,
      letterSpacing: values.letterSpacing,
      lineHeightFactor: values.lineHeightFactor,
      textAlign: values.textAlign,
      maxWidth: baseMaxWidth,
    };

    if (values.compareMode) {
      const halfW = width / 2;
      typesetParams.maxWidth = Math.max(200, halfW - 120);

      const layoutCustom = computeLayout(debouncedText, typesetParams, effectiveFont);
      const layoutDefault = computeLayout(debouncedText, typesetParams, null);

      const dpr = window.devicePixelRatio || 1;
      const cssW = width;
      const cssH = height;
      const ctx = (renderer as any).ctx;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#FAFAFA';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();

      const renderOptionsBase: RenderOptions = {
        showGrid: values.showGuides,
        showRuler: values.showGuides,
        showBaselines: values.showGuides,
        zoom,
        panX,
        panY,
        compareMode: true,
        customFontFamily: customFontFamily || defaultFontFamily,
        defaultFontFamily,
      };

      renderHalf(renderer, layoutCustom, debouncedText, typesetParams, renderOptionsBase, 0, halfW, true);
      renderHalf(renderer, layoutDefault, debouncedText, typesetParams, {
        ...renderOptionsBase,
        customFontFamily: defaultFontFamily,
      }, halfW, halfW, false);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, cssH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(25, 118, 210, 0.08)';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText('自定义字体 Custom', 10, 18);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillText('系统默认 System Default', halfW + 10, 18);
      ctx.restore();
    } else {
      const layout = computeLayout(debouncedText, typesetParams, effectiveFont);
      const renderOptions: RenderOptions = {
        showGrid: values.showGuides,
        showRuler: values.showGuides,
        showBaselines: values.showGuides,
        zoom,
        panX,
        panY,
        compareMode: false,
        customFontFamily: customFontFamily || defaultFontFamily,
        defaultFontFamily,
      };
      renderer.render(layout, debouncedText, typesetParams, renderOptions);
    }
  }, [font, values, debouncedText, zoom, panX, panY, useOffscreen, customFontFamily, defaultFontFamily, computeLayout, fontReady]);

  const renderHalf = (
    renderer: CanvasRenderer,
    layout: LayoutResult,
    text: string,
    params: TypesetParams,
    options: RenderOptions,
    offsetX: number,
    halfW: number,
    isLeft: boolean
  ) => {
    const canvas = previewCanvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const ctx = (renderer as any).ctx;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    ctx.rect(offsetX, 0, halfW, cssH);
    ctx.clip();
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(offsetX, 0, halfW, cssH);

    const alpha = 0.5;
    ctx.globalAlpha = alpha;

    if (options.showGrid) {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 0.3;
      for (let x = (offsetX + options.panX) % 50; x < offsetX + halfW; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssH);
        ctx.stroke();
      }
      for (let y = options.panY % 50; y < cssH; y += 50) {
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + halfW, y);
        ctx.stroke();
      }
    }

    if (options.showRuler && isLeft) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, 20, cssH);
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(20, cssH);
      ctx.stroke();
      ctx.fillStyle = '#999';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      for (let py = 0; py <= cssH; py += 50) {
        ctx.beginPath();
        ctx.moveTo(15, py);
        ctx.lineTo(20, py);
        ctx.strokeStyle = '#CCC';
        ctx.stroke();
        ctx.fillText(String(py), 13, py + 3);
      }
    }

    ctx.translate(options.panX, options.panY);
    ctx.scale(options.zoom, options.zoom);

    const contentStartX = isLeft ? (20 + 40) / options.zoom : (offsetX + 40) / options.zoom;
    const startY = 60 / options.zoom;

    ctx.fillStyle = '#111111';
    ctx.font = `${params.fontSize}px "${options.customFontFamily}", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';

    layout.lines.forEach((line, lineIdx) => {
      const lineY = startY + lineIdx * line.lineHeight + line.ascent;
      if (options.showBaselines) {
        ctx.save();
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(contentStartX - 20, lineY);
        ctx.lineTo(contentStartX + (params.maxWidth || 600) + 40, lineY);
        ctx.stroke();
        ctx.restore();
      }
      for (const g of line.glyphs) {
        if (g.char === ' ' || g.char === '\t') continue;
        ctx.fillText(g.char, contentStartX + g.x, lineY);
      }
    });

    ctx.restore();
  };

  const handleGenerateCard = useCallback(() => {
    if (!cardCanvasRef.current) return;

    if (!cardRendererRef.current) {
      cardRendererRef.current = new CanvasRenderer(cardCanvasRef.current);
    }
    const renderer = cardRendererRef.current;

    const cardWidth = 400;
    const cardHeight = 567;
    const padding = 20;

    const params: TypesetParams = {
      fontSize: values.fontSize,
      letterSpacing: values.letterSpacing,
      lineHeightFactor: values.lineHeightFactor,
      textAlign: 'center',
      maxWidth: cardWidth - padding * 2,
    };

    const layout = computeLayout(debouncedText, params, font);
    renderer.renderTestCard(layout, debouncedText, params, {
      cardWidth,
      cardHeight,
      padding,
      fontFamily: customFontFamily || defaultFontFamily,
    });

    setCardVisible(true);
  }, [values, debouncedText, font, customFontFamily, defaultFontFamily, computeLayout]);

  const handleDownloadPNG = useCallback(() => {
    if (!cardRendererRef.current) return;
    try {
      const dataURL = cardRendererRef.current.getImageData();
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `typography-card-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('导出成功');
    } catch (e) {
      showToast('导出失败', '#D32F2F');
    }
  }, [showToast]);

  const handleCopyClipboard = useCallback(async () => {
    if (!cardRendererRef.current) return;
    try {
      await cardRendererRef.current.copyToClipboard();
      showToast('复制成功');
    } catch (e) {
      showToast('复制失败', '#D32F2F');
    }
  }, [showToast]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      renderPreview();
      raf = requestAnimationFrame(() => {});
    };
    const timeout = window.setTimeout(tick, 0);
    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [renderPreview]);

  useEffect(() => {
    const onResize = () => {
      setTimeout(renderPreview, 30);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderPreview]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.min(4, Math.max(0.5, zoom + delta));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanX(panStartRef.current.panX + dx);
    setPanY(panStartRef.current.panY + dy);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  useEffect(() => {
    const onUp = () => { isPanningRef.current = false; };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const isMobile = windowWidth < 900;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
      <div
        style={{
          height: isMobile ? (mobileExpanded ? 'auto' : 60) : '100%',
          width: isMobile ? '100%' : 320,
          maxHeight: isMobile && mobileExpanded ? '50vh' : undefined,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <Controls
          fontInfo={fontInfo}
          loadError={loadError}
          isLoading={isLoading && isLoadingLong}
          values={values}
          onUploadFont={handleUploadFont}
          onChange={handleChange}
          onGenerateCard={handleGenerateCard}
          mobileExpanded={mobileExpanded}
          onToggleMobileExpand={() => setMobileExpanded((x) => !x)}
        />
      </div>

      <div style={previewAreaStyle} ref={previewWrapRef}>
        <canvas
          ref={previewCanvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: isPanningRef.current ? 'grabbing' : 'grab',
          }}
        />

        {!values.compareMode && (
          <div style={zoomToolbarStyle}>
            <button
              onClick={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                setTimeout(() => (e.currentTarget as HTMLButtonElement).style.transform = '', 100);
                setZoom((z) => Math.max(0.5, z - 0.25));
              }}
              style={zoomBtnStyle}
            >
              −
            </button>
            <span style={{ fontSize: 12, color: '#666', minWidth: 44, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                setTimeout(() => (e.currentTarget as HTMLButtonElement).style.transform = '', 100);
                setZoom((z) => Math.min(4, z + 0.25));
              }}
              style={zoomBtnStyle}
            >
              +
            </button>
            <div style={{ width: 1, height: 18, background: '#E0E0E0', margin: '0 4px' }} />
            <button
              onClick={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                setTimeout(() => (e.currentTarget as HTMLButtonElement).style.transform = '', 100);
                setZoom(1); setPanX(0); setPanY(0);
              }}
              style={{ ...zoomBtnStyle, fontSize: 11 }}
            >
              重置
            </button>
          </div>
        )}

        {cardVisible && (
          <div className="slide-up" style={cardToolbarStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <canvas
                ref={cardCanvasRef}
                style={{
                  width: 120,
                  height: 170,
                  borderRadius: 4,
                  border: '1px solid #E0E0E0',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                  A5 测试卡片 · 400 × 567px
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  白色背景 · 四周留白20px · 文本居中
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                      setTimeout(() => (e.currentTarget as HTMLButtonElement).style.transform = '', 100);
                      handleDownloadPNG();
                    }}
                    style={actionBtnStyle}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>下载为PNG</span>
                  </button>
                  <button
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                      setTimeout(() => (e.currentTarget as HTMLButtonElement).style.transform = '', 100);
                      handleCopyClipboard();
                    }}
                    style={{ ...actionBtnStyle, background: '#1976D2', color: 'white' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>复制到剪贴板</span>
                  </button>
                  <button
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                      setTimeout(() => (e.currentTarget as HTMLButtonElement).style.transform = '', 100);
                      setCardVisible(false);
                    }}
                    style={{
                      ...actionBtnStyle,
                      background: '#F5F5F5',
                      color: '#666',
                      padding: '8px 10px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="toast" style={{ background: toast.color || '#4CAF50' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

const previewAreaStyle: CSSProperties = {
  flex: 1,
  background: '#FAFAFA',
  position: 'relative',
  overflow: 'hidden',
  minWidth: 0,
  minHeight: 0,
};

const zoomToolbarStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'white',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  zIndex: 5,
};

const zoomBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: 6,
  background: '#F5F5F5',
  fontSize: 16,
  color: '#333',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.1s ease',
  fontWeight: 500,
};

const cardToolbarStyle: CSSProperties = {
  position: 'absolute',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'white',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  padding: 16,
  zIndex: 6,
  maxWidth: 'calc(100% - 32px)',
};

const actionBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 6,
  border: 'none',
  background: '#E3F2FD',
  color: '#1976D2',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

function computeBrowserLayout(text: string, params: TypesetParams): LayoutResult {
  const { fontSize, letterSpacing, lineHeightFactor, textAlign, maxWidth } = params;
  const lines: any[] = [];
  const lineHeight = fontSize * lineHeightFactor;

  const measure = (t: string) => {
    let w = 0;
    for (const ch of t) {
      if (ch.charCodeAt(0) > 127) w += fontSize * 1;
      else if (ch === ' ') w += fontSize * 0.3;
      else if (/[A-Z]/.test(ch)) w += fontSize * 0.6;
      else if (/[a-z0-9]/.test(ch)) w += fontSize * 0.5;
      else if (/[.,!?;:]/.test(ch)) w += fontSize * 0.25;
      else w += fontSize * 0.5;
      w += letterSpacing;
    }
    return w;
  };

  const toGlyphs = (t: string, extraX: number = 0): GlyphPos[] => {
    const result: GlyphPos[] = [];
    let x = extraX;
    for (const ch of t) {
      let w;
      if (ch.charCodeAt(0) > 127) w = fontSize * 1;
      else if (ch === ' ') w = fontSize * 0.3;
      else if (/[A-Z]/.test(ch)) w = fontSize * 0.6;
      else if (/[a-z0-9]/.test(ch)) w = fontSize * 0.5;
      else if (/[.,!?;:]/.test(ch)) w = fontSize * 0.25;
      else w = fontSize * 0.5;
      const adv = w + letterSpacing;
      result.push({ char: ch, glyphIndex: 0, x, y: 0, advance: adv, width: w });
      x += adv;
    }
    return result;
  };

  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push({ glyphs: [], width: 0, ascent: fontSize * 0.8, descent: fontSize * 0.2, lineHeight, text: '' });
      continue;
    }

    if (maxWidth <= 0) {
      const width = measure(para);
      lines.push({ glyphs: toGlyphs(para), width, ascent: fontSize * 0.8, descent: fontSize * 0.2, lineHeight, text: para });
      continue;
    }

    let cur = '';
    let curW = 0;
    const flush = () => {
      if (cur.length > 0) {
        let glyphs = toGlyphs(cur);
        let w = curW;
        if (textAlign === 'justify' && lines.length < paragraphs.length - 1 && glyphs.length > 1) {
          const gap = (maxWidth - w) / (glyphs.length - 1);
          glyphs = glyphs.map((g, i) => ({ ...g, x: g.x + i * gap }));
          w = maxWidth;
        } else if (textAlign === 'center') {
          const offset = (maxWidth - w) / 2;
          glyphs = toGlyphs(cur, offset);
        } else if (textAlign === 'right') {
          const offset = maxWidth - w;
          glyphs = toGlyphs(cur, offset);
        }
        lines.push({ glyphs, width: w, ascent: fontSize * 0.8, descent: fontSize * 0.2, lineHeight, text: cur });
        cur = ''; curW = 0;
      }
    };

    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      let cw;
      if (ch.charCodeAt(0) > 127) cw = fontSize * 1;
      else if (ch === ' ') cw = fontSize * 0.3;
      else if (/[A-Z]/.test(ch)) cw = fontSize * 0.6;
      else if (/[a-z0-9]/.test(ch)) cw = fontSize * 0.5;
      else if (/[.,!?;:]/.test(ch)) cw = fontSize * 0.25;
      else cw = fontSize * 0.5;
      cw += letterSpacing;

      if (curW + cw > maxWidth && cur.length > 0) {
        const lbIdx = [' ', '-', '/', '、', '。', '，', '；'].reduce((best, c) => {
          const idx = cur.lastIndexOf(c);
          return idx > best ? idx : best;
        }, -1);
        if (lbIdx >= 0 && lbIdx !== cur.length - 1) {
          const part1 = cur.slice(0, lbIdx + 1);
          const part2 = cur.slice(lbIdx + 1);
          const p1w = measure(part1);
          cur = part1; curW = p1w;
          flush();
          cur = part2 + ch;
          curW = measure(cur);
          continue;
        }
        flush();
      }
      cur += ch; curW += cw;
    }
    flush();
  }

  return {
    lines,
    totalHeight: lines.length * lineHeight,
    totalWidth: Math.max(...lines.map((l) => l.width), 0),
    fontSize,
  };
}

interface GlyphPos {
  char: string;
  glyphIndex: number;
  x: number;
  y: number;
  advance: number;
  width: number;
}

export default App;
