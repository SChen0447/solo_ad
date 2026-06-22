import React, { useState, useCallback, useRef } from 'react';
import EditorCanvas from './EditorCanvas';
import ConfigPanel from './ConfigPanel';
import { EnemyConfig, PathPoint } from './EnemyEngine';

const enemyColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#a8e6cf'];

let enemyIdCounter = 1;

const createDefaultEnemy = (index: number): EnemyConfig => {
  const baseX = 150 + index * 100;
  const baseY = 150 + index * 80;
  return {
    id: `enemy-${enemyIdCounter++}`,
    active: index === 0,
    color: enemyColors[index % enemyColors.length],
    pathPoints: [
      { x: baseX, y: baseY, stayTime: 0.5 },
      { x: baseX + 200, y: baseY + 50, stayTime: 0 },
      { x: baseX + 100, y: baseY + 150, stayTime: 0.3 },
    ],
    bulletConfig: {
      pattern: 'linear',
      speed: 300,
      fireInterval: 0.5,
      color: 'red',
      offsetAngle: 0,
    },
  };
};

const App: React.FC = () => {
  const [enemyConfigs, setEnemyConfigs] = useState<EnemyConfig[]>([
    createDefaultEnemy(0),
  ]);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewEnemyId, setPreviewEnemyId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleSelectEnemy = useCallback((id: string | null) => {
    setSelectedEnemyId(id);
    setSelectedPointIndex(null);
  }, []);

  const handleSelectPoint = useCallback((enemyId: string, pointIndex: number | null) => {
    setSelectedEnemyId(enemyId);
    setSelectedPointIndex(pointIndex);
  }, []);

  const handleUpdateEnemy = useCallback((id: string, config: Partial<EnemyConfig>) => {
    setEnemyConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...config } : c))
    );
  }, []);

  const handleUpdatePoint = useCallback(
    (enemyId: string, pointIndex: number, point: Partial<PathPoint>) => {
      setEnemyConfigs((prev) =>
        prev.map((c) => {
          if (c.id !== enemyId) return c;
          const newPoints = [...c.pathPoints];
          newPoints[pointIndex] = { ...newPoints[pointIndex], ...point };
          return { ...c, pathPoints: newPoints };
        })
      );
    },
    []
  );

  const handleMovePoint = useCallback(
    (enemyId: string, pointIndex: number, x: number, y: number) => {
      setEnemyConfigs((prev) =>
        prev.map((c) => {
          if (c.id !== enemyId) return c;
          const newPoints = [...c.pathPoints];
          newPoints[pointIndex] = { ...newPoints[pointIndex], x, y };
          return { ...c, pathPoints: newPoints };
        })
      );
    },
    []
  );

  const handleAddPoint = useCallback((enemyId: string, x: number, y: number) => {
    setEnemyConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== enemyId || c.pathPoints.length >= 20) return c;
        const newPoint: PathPoint = { x, y, stayTime: 0 };
        return { ...c, pathPoints: [...c.pathPoints, newPoint] };
      })
    );
    setSelectedPointIndex((prev) => {
      const enemy = enemyConfigs.find((c) => c.id === enemyId);
      if (enemy && prev === null) {
        return enemy.pathPoints.length;
      }
      return prev;
    });
  }, [enemyConfigs]);

  const handleDeletePoint = useCallback((enemyId: string, pointIndex: number) => {
    setEnemyConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== enemyId || c.pathPoints.length <= 2) return c;
        const newPoints = c.pathPoints.filter((_, i) => i !== pointIndex);
        return { ...c, pathPoints: newPoints };
      })
    );
    setSelectedPointIndex((prev) => {
      if (prev === null) return null;
      if (prev === pointIndex) return null;
      if (prev > pointIndex) return prev - 1;
      return prev;
    });
  }, []);

  const handleAddEnemy = useCallback(() => {
    setEnemyConfigs((prev) => {
      if (prev.length >= 5) return prev;
      const newEnemy = createDefaultEnemy(prev.length);
      return [...prev, newEnemy];
    });
  }, []);

  const handleDeleteEnemy = useCallback((id: string) => {
    setEnemyConfigs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((c) => c.id !== id);
    });
    setSelectedEnemyId((prev) => (prev === id ? null : prev));
    setSelectedPointIndex(null);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleTogglePreview = useCallback((id: string) => {
    setPreviewEnemyId((prev) => (prev === id ? null : id));
    setSelectedEnemyId(id);
    setSelectedPointIndex(null);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setEnemyConfigs((prev) => [...prev]);
  }, []);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(enemyConfigs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formation.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [enemyConfigs]);

  const handleImport = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data) && data.length > 0 && data.length <= 5) {
        const validConfigs = data.map((item: any, index: number) => ({
          id: item.id || `enemy-${enemyIdCounter++}`,
          active: typeof item.active === 'boolean' ? item.active : true,
          color: item.color || enemyColors[index % enemyColors.length],
          pathPoints: Array.isArray(item.pathPoints)
            ? item.pathPoints
                .filter((p: any) => p && typeof p.x === 'number' && typeof p.y === 'number')
                .slice(0, 20)
                .map((p: any) => ({
                  x: p.x,
                  y: p.y,
                  stayTime: Math.max(0, Math.min(3, p.stayTime || 0)),
                }))
            : [{ x: 200, y: 200, stayTime: 0 }],
          bulletConfig: {
            pattern: item.bulletConfig?.pattern || 'linear',
            speed: Math.max(200, Math.min(800, item.bulletConfig?.speed || 300)),
            fireInterval: Math.max(0.1, Math.min(2, item.bulletConfig?.fireInterval || 0.5)),
            color: item.bulletConfig?.color || 'red',
            offsetAngle: Math.max(-45, Math.min(45, item.bulletConfig?.offsetAngle || 0)),
          },
        }));
        setEnemyConfigs(validConfigs);
        setSelectedEnemyId(null);
        setSelectedPointIndex(null);
      }
    } catch (e) {
      console.error('导入失败:', e);
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#0d1117',
        overflow: 'hidden',
      }}
    >
      <div ref={canvasRef} style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <EditorCanvas
          enemyConfigs={enemyConfigs}
          selectedEnemyId={selectedEnemyId}
          selectedPointIndex={selectedPointIndex}
          onSelectEnemy={handleSelectEnemy}
          onSelectPoint={handleSelectPoint}
          onMovePoint={handleMovePoint}
          onAddPoint={handleAddPoint}
          isPlaying={isPlaying}
          previewEnemyId={previewEnemyId}
        />
      </div>
      <ConfigPanel
        enemyConfigs={enemyConfigs}
        selectedEnemyId={selectedEnemyId}
        selectedPointIndex={selectedPointIndex}
        onSelectEnemy={handleSelectEnemy}
        onSelectPoint={handleSelectPoint}
        onUpdateEnemy={handleUpdateEnemy}
        onUpdatePoint={handleUpdatePoint}
        onAddPoint={handleAddPoint}
        onDeletePoint={handleDeletePoint}
        onAddEnemy={handleAddEnemy}
        onDeleteEnemy={handleDeleteEnemy}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onExport={handleExport}
        onImport={handleImport}
        previewEnemyId={previewEnemyId}
        onTogglePreview={handleTogglePreview}
      />
    </div>
  );
};

export default App;
