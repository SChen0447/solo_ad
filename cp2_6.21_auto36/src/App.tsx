import React, { useState, useRef, useCallback, useEffect } from 'react';
import { loadFontFile, registerFontFace, FontData } from './fontLoader';
import { typeset, TypesetResult } from './typesetter';
import { render, renderCard, RenderOptions } from './renderer';
import { Controls, TypesetControls } from './controls';

const DEFAULT_TEXT = '字体排印 Typography Lab\nThe quick brown fox jumps over the lazy dog.\n永东国酬爱袋盒，远近道边进迟。\n0123456789 !@#$%^&*()';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 567;

function useDebounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  return useCallback(
    ((...args: unknown[]) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), ms);
    }) as T,
    [fn, ms]
  );
}

export const App: React.FC = () => {
  const [fontData, setFontData] = useState<FontData | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [debouncedText, setDebouncedText] = useState(DEFAULT_TEXT);
  const [controls, setControls] = useState<TypesetControls>({
    fontSize: 32,
    letterSpacing: 0,
    lineHeight: 1.6,
    alignment: 'left',
    showGuides: true,
    contrastMode: false,
  });
  const [scale] = useState(1);
  const [offsetX] = useState(0);
  const [offsetY] = useState(0);
  const [cardVisible, setCardVisible] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const debouncedSetText = useDebounce(
    useCallback((t: unknown) => setDebouncedText(t as string), []),
    200
  );

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      debouncedSetText(newText);
    },
    [debouncedSetText]
  );

  const handleFontUpload = useCallback(async (file: File) => {
    setLoading(true);
    setFontError(null);
    try {
      const data = await loadFontFile(file);
      await registerFontFace(data);
      setFontData(data);
      setFontFamily(data.fontFamilyName);
      setFontError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '文件格式不支持或解析失败';
      setFontError(message);
      setFontData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleControlChange = useCallback((partial: Partial<TypesetControls>) => {
    setControls(prev => ({ ...prev, ...partial }));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleGenerateCard = useCallback(() => {
    const cardCanvas = cardCanvasRef.current;
    if (!cardCanvas) return;

    cardCanvas.width = CARD_WIDTH * 2;
    cardCanvas.height = CARD_HEIGHT * 2;
    const ctx = cardCanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);

    const effectiveFont = fontData?.font || null;
    const result = effectiveFont
      ? typeset(effectiveFont, {
          fontSize: controls.fontSize,
          letterSpacing: controls.letterSpacing,
          lineHeight: controls.lineHeight,
          alignment: controls.alignment,
          text: debouncedText,
          maxWidth: CARD_WIDTH - 40,
        })
      : { lines: [], totalHeight: 0, maxLineWidth: 0 };

    const displayName = fontData?.meta.familyName || 'sans-serif';

    renderCard(ctx, result, {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      showGuides: false,
      showRuler: false,
      fontSize: controls.fontSize,
      lineHeight: controls.lineHeight,
      fontFamily,
      contrastMode: false,
      contrastFontFamily: 'sans-serif',
      text: debouncedText,
      letterSpacing: controls.letterSpacing,
      alignment: controls.alignment,
    }, CARD_WIDTH, CARD_HEIGHT, displayName);

    setCardDataUrl(cardCanvas.toDataURL('image/png'));
    setCardVisible(true);
  }, [fontData, controls, debouncedText, fontFamily]);

  const handleDownload = useCallback(() => {
    if (!cardDataUrl) return;
    const link = document.createElement('a');
    link.download = `typography-card-${Date.now()}.png`;
    link.href = cardDataUrl;
    link.click();
    showToast('导出成功');
  }, [cardDataUrl, showToast]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardCanvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>(resolve =>
        cardCanvasRef.current!.toBlob(resolve, 'image/png')
      );
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('导出成功');
      }
    } catch {
      showToast('复制失败');
    }
  }, [showToast]);

  const performRender = useCallback(() => {
    const canvas = canvasRef.current;
    const container = previewContainerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w <= 0 || h <= 0) return;

    const useOffscreen = debouncedText.length > 1000;
    const effectiveFont = fontData?.font || null;

    const typesetResult: TypesetResult = effectiveFont
      ? typeset(effectiveFont, {
          fontSize: controls.fontSize,
          letterSpacing: controls.letterSpacing,
          lineHeight: controls.lineHeight,
          alignment: controls.alignment,
          text: debouncedText,
          maxWidth: w - 40,
        })
      : { lines: [], totalHeight: 0, maxLineWidth: 0 };

    const renderOpts: RenderOptions = {
      scale,
      offsetX,
      offsetY,
      showGuides: controls.showGuides,
      showRuler: true,
      fontSize: controls.fontSize,
      lineHeight: controls.lineHeight,
      fontFamily,
      contrastMode: controls.contrastMode,
      contrastFontFamily: 'sans-serif',
      text: debouncedText,
      letterSpacing: controls.letterSpacing,
      alignment: controls.alignment,
    };

    if (useOffscreen) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const offscreen = offscreenCanvasRef.current;
      offscreen.width = w * dpr;
      offscreen.height = h * dpr;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      render(offCtx, w, h, typesetResult, renderOpts);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const mainCtx = canvas.getContext('2d');
      if (mainCtx) {
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.drawImage(offscreen, 0, 0);
      }
    } else {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      render(ctx, w, h, typesetResult, renderOpts);
    }
  }, [fontData, controls, debouncedText, fontFamily, scale, offsetX, offsetY]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      performRender();
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [performRender, renderTick]);

  useEffect(() => {
    const handleResize = () => setRenderTick(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Controls
        fontData={fontData}
        fontError={fontError}
        loading={loading}
        controls={controls}
        text={text}
        onFontUpload={handleFontUpload}
        onControlChange={handleControlChange}
        onTextChange={handleTextChange}
        onGenerateCard={handleGenerateCard}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen(p => !p)}
      />

      <div
        ref={previewContainerRef}
        className="preview-area"
        style={{
          flex: 1,
          height: '100vh',
          background: '#FAFAFA',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block' }}
        />

        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            <div className="loading-spinner" />
          </div>
        )}

        {!fontData && !loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#BBB',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>Aa</div>
            <div style={{ fontSize: 14 }}>上传字体文件开始排印实验</div>
          </div>
        )}

        {cardVisible && cardDataUrl && (
          <div className="card-toolbar" style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FFF',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'slideUp 0.25s ease-out',
          }}>
            <img
              src={cardDataUrl}
              alt="测试卡片"
              style={{ height: 120, borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
            />
            <button
              onClick={handleDownload}
              className="btn-action"
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                border: '1px solid #E0E0E0',
                background: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'all 0.15s',
              }}
              title="下载为PNG"
            >
              ⬇
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="btn-action"
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                border: '1px solid #E0E0E0',
                background: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'all 0.15s',
              }}
              title="复制到剪贴板"
            >
              📋
            </button>
            <button
              onClick={() => setCardVisible(false)}
              className="btn-action"
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 16,
                color: '#999',
                transition: 'all 0.15s',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <canvas ref={cardCanvasRef} style={{ display: 'none' }} />

      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#4CAF50',
          color: '#FFF',
          padding: '10px 24px',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};
