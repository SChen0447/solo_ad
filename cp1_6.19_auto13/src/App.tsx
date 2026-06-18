import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlantEngine } from './PlantEngine';
import { CanvasRenderer } from './CanvasRenderer';
import { UIControls } from './UIControls';
import { useAppStore } from './store';
import type { PlantState } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PlantEngine | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [plantState, setPlantState] = useState<PlantState | null>(null);

  const {
    light,
    moisture,
    temperature,
    obstacles,
    isAddingObstacle,
    addObstacle,
    setIsAddingObstacle,
    updateObstacleOpacity,
  } = useAppStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    canvasRef.current.width = CANVAS_WIDTH;
    canvasRef.current.height = CANVAS_HEIGHT;

    engineRef.current = new PlantEngine();
    rendererRef.current = new CanvasRenderer(canvasRef.current);

    setPlantState(engineRef.current.getPlantState());

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current || !rendererRef.current) return;

    const animate = (timestamp: number) => {
      if (!engineRef.current || !rendererRef.current) return;

      const params = { light, moisture, temperature };
      const newState = engineRef.current.updatePlant(
        params,
        obstacles,
        timestamp
      );

      obstacles.forEach((obstacle) => {
        const age = timestamp - obstacle.createdAt;
        const fadeProgress = Math.min(1, age / 300);
        const targetOpacity = 0.5 * fadeProgress;
        if (Math.abs(obstacle.opacity - targetOpacity) > 0.01) {
          updateObstacleOpacity(obstacle.id, targetOpacity);
        }
      });

      rendererRef.current.render(newState, obstacles);
      setPlantState(newState);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [light, moisture, temperature, obstacles, updateObstacleOpacity]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAddingObstacle || !engineRef.current || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const radius = 20 + Math.random() * 20;
      const obstacle = engineRef.current.addObstacle(x, y, radius);
      addObstacle(obstacle);
    },
    [isAddingObstacle, addObstacle]
  );

  const handleAddObstacleMode = useCallback(() => {
    setIsAddingObstacle(!isAddingObstacle);
  }, [isAddingObstacle, setIsAddingObstacle]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f4f0',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1
        style={{
          color: '#2e7d32',
          marginBottom: '20px',
          fontSize: '28px',
          fontWeight: 700,
        }}
      >
        植物生长模拟器
      </h1>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: 'block',
              cursor: isAddingObstacle ? 'crosshair' : 'default',
            }}
          />
        </div>

        <UIControls
          plantState={plantState}
          onAddObstacleMode={handleAddObstacleMode}
          isAddingObstacle={isAddingObstacle}
        />
      </div>

      <p
        style={{
          marginTop: '20px',
          color: '#666',
          fontSize: '13px',
          textAlign: 'center',
          maxWidth: '600px',
        }}
      >
        调节右侧的光照、湿度和温度滑块，观察植物的实时生长变化。点击"添加环境障碍物"按钮后在画布上点击可放置障碍物，植物会自动向光照充足的方向弯曲生长。
      </p>
    </div>
  );
};

export default App;
