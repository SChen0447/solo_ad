import React, { useState, useRef, useCallback, useEffect } from 'react';
import MatrixRain, { type MatrixRainConfig, type MatrixRainRef } from './MatrixRain';
import Controls from './Controls';
import { THEMES } from './theme';
import GIF from 'gif.js';

const App: React.FC = () => {
  const [config, setConfig] = useState<MatrixRainConfig>({
    speedMultiplier: 1,
    fontSize: 16,
    colorTheme: THEMES[0],
    columnSpacing: 20,
    backgroundOpacity: 0.1,
    fps: 60,
    enableBlink: true,
    enableTrail: true
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExportingGIF, setIsExportingGIF] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const matrixRainRef = useRef<MatrixRainRef>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleConfigChange = useCallback((updates: Partial<MatrixRainConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleExportPNG = useCallback(() => {
    const canvas = matrixRainRef.current?.getCanvas();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `matrix-rain-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleExportGIF = useCallback(async () => {
    const canvas = matrixRainRef.current?.getCanvas();
    if (!canvas || isExportingGIF) return;

    setIsExportingGIF(true);

    try {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: width,
        height: height,
        workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
      });

      const frameCount = 60;
      const delay = 1000 / config.fps;

      for (let i = 0; i < frameCount; i++) {
        matrixRainRef.current?.renderFrame();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.fillStyle = '#0A0A0A';
          tempCtx.fillRect(0, 0, width, height);
          tempCtx.drawImage(
            canvas,
            0, 0, canvas.width, canvas.height,
            0, 0, width, height
          );
        }

        gif.addFrame(tempCanvas, { delay, copy: true });

        await new Promise((resolve) => setTimeout(resolve, delay / 2));
      }

      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `matrix-rain-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setIsExportingGIF(false);
      });

      gif.on('progress', (progress: number) => {
        console.log(`GIF encoding: ${Math.round(progress * 100)}%`);
      });

      gif.render();
    } catch (error) {
      console.error('GIF export failed:', error);
      setIsExportingGIF(false);
    }
  }, [config.fps, isExportingGIF]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0A0A0A',
        overflow: 'hidden'
      }}
    >
      <MatrixRain ref={matrixRainRef} config={config} />

      <Controls
        config={config}
        onConfigChange={handleConfigChange}
        onExportPNG={handleExportPNG}
        onExportGIF={handleExportGIF}
        isExportingGIF={isExportingGIF}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobile={isMobile}
      />

      {isExportingGIF && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              border: `3px solid ${config.colorTheme.hex}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <p style={{ color: config.colorTheme.hex, fontSize: 16, fontWeight: 600 }}>
            正在导出 GIF，请稍候...
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default App;
