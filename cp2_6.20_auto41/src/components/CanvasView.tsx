import React, { useRef, useEffect } from 'react';
import { CanvasModule } from '../canvas/CanvasModule';
import { useAppStore } from '../store';

const CanvasView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moduleRef = useRef<CanvasModule | null>(null);
  const sceneData = useAppStore((s) => s.sceneData);

  useEffect(() => {
    if (canvasRef.current && !moduleRef.current) {
      moduleRef.current = new CanvasModule(canvasRef.current);
    }
    return () => {
      moduleRef.current?.dispose();
      moduleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneData && moduleRef.current) {
      const currentStory = useAppStore.getState().currentStory;
      const theme = useAppStore.getState().currentTheme || '奇幻';
      moduleRef.current.renderScene(currentStory, theme);
    }
  }, [sceneData]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '12px',
          border: '2px solid rgba(108, 99, 255, 0.4)',
          boxShadow: '0 0 20px rgba(108, 99, 255, 0.2), 0 0 40px rgba(108, 99, 255, 0.1)',
          display: 'block',
        }}
      />
    </div>
  );
};

export default CanvasView;
