import React, { useState, useCallback } from 'react';
import { useCanvasState } from './useCanvasState';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { exportWallpaper, type Resolution } from './exportWallpaper';
import type { Tool } from './types';

export default function App() {
  const state = useCanvasState();
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [brushColor, setBrushColor] = useState('#ff6b6b');
  const [brushWidth, setBrushWidth] = useState<2 | 4 | 6>(4);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showResPicker, setShowResPicker] = useState(false);

  const handleUploadImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const centerX = (window.innerWidth / 2 - state.view.offsetX) / state.view.scale;
        const centerY = (window.innerHeight / 2 - state.view.offsetY) / state.view.scale;
        state.addImageElement(src, centerX, centerY);
        setActiveTool('select');
      };
      reader.readAsDataURL(file);
    },
    [state]
  );

  const handleAddText = useCallback(() => {
    const centerX = (window.innerWidth / 2 - state.view.offsetX) / state.view.scale;
    const centerY = (window.innerHeight / 2 - state.view.offsetY) / state.view.scale;
    state.addTextElement(centerX, centerY);
  }, [state]);

  const handleExport = useCallback(
    async (resolution: Resolution) => {
      setShowResPicker(false);
      setExporting(true);
      setExportProgress(0);
      try {
        await exportWallpaper(state.elements, state.view, {
          resolution,
          onProgress: setExportProgress,
        });
      } catch (err) {
        console.error('导出失败', err);
      } finally {
        setTimeout(() => {
          setExporting(false);
          setExportProgress(0);
        }, 500);
      }
    },
    [state]
  );

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        state={state}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        brushColor={brushColor}
        brushWidth={brushWidth}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        onUploadImage={handleUploadImage}
        onAddText={handleAddText}
      />

      <button
        onClick={() => setShowResPicker(true)}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#6c5ce7',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontFamily: "'PingFang SC', -apple-system, sans-serif",
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'background 0.2s',
          boxShadow: '0 2px 12px rgba(108,92,231,0.4)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#7c6cf7')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#6c5ce7')}
      >
        生成壁纸
      </button>

      {showResPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowResPicker(false)}
        >
          <div
            style={{
              background: 'rgba(30,30,40,0.95)',
              borderRadius: 12,
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: '#e0e0e0', fontSize: 16, fontFamily: "'PingFang SC', sans-serif", textAlign: 'center', marginBottom: 4 }}>
              选择壁纸分辨率
            </div>
            <button
              onClick={() => handleExport('1920x1080')}
              style={{
                background: '#6c5ce7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontFamily: "'PingFang SC', sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#7c6cf7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#6c5ce7')}
            >
              横屏 1920 × 1080
            </button>
            <button
              onClick={() => handleExport('1080x1920')}
              style={{
                background: '#6c5ce7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontFamily: "'PingFang SC', sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#7c6cf7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#6c5ce7')}
            >
              竖屏 1080 × 1920
            </button>
            <button
              onClick={() => setShowResPicker(false)}
              style={{
                background: 'transparent',
                color: '#888',
                border: '1px solid #444',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'PingFang SC', sans-serif",
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {exporting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
        >
          <div
            style={{
              background: 'rgba(30,30,40,0.95)',
              borderRadius: 12,
              padding: '28px 36px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              minWidth: 320,
            }}
          >
            <div style={{ color: '#e0e0e0', fontSize: 15, fontFamily: "'PingFang SC', sans-serif" }}>
              正在生成壁纸...
            </div>
            <div
              style={{
                width: '100%',
                height: 8,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(exportProgress * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)',
                  borderRadius: 4,
                  transition: 'width 0.1s ease-out',
                }}
              />
            </div>
            <div style={{ color: '#a29bfe', fontSize: 13, fontFamily: "'PingFang SC', sans-serif" }}>
              {Math.round(exportProgress * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
