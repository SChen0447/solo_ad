import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GridCanvas } from './components/GridCanvas';
import {
  Cell,
  CellType,
  GRID_SIZE,
  calculateNextGeneration,
  countSpecies,
  createEmptyGrid,
  createCell,
} from './modules/ecosystemLogic';
import { saveState, loadState } from './modules/apiHelper';

const App: React.FC = () => {
  const [grid, setGrid] = useState<Cell[][]>(() => createEmptyGrid());
  const [speciesCounts, setSpeciesCounts] = useState({ plant: 0, carnivore: 0, decomposer: 0, dead: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const handleCellClick = useCallback((x: number, y: number, type: CellType, hp: number) => {
    setGrid((prev) => {
      const newGrid = prev.map((row) => row.map((c) => ({ ...c })));
      if (type === 'empty') {
        newGrid[y][x] = createCell('empty', 0);
      } else {
        newGrid[y][x] = createCell(type, hp);
      }
      return newGrid;
    });
  }, []);

  useEffect(() => {
    setSpeciesCounts(countSpecies(grid));
  }, [grid]);

  const step = useCallback(() => {
    setGrid((prev) => {
      const t0 = performance.now();
      const next = calculateNextGeneration(prev);
      const t1 = performance.now();
      if (t1 - t0 > 10) {
        console.warn(`calculateNextGeneration took ${(t1 - t0).toFixed(1)}ms (target < 10ms)`);
      }
      return next;
    });
    setGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(step, 2000);
      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isRunning, step]);

  const toggleRunning = () => {
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGrid(createEmptyGrid());
    setSpeciesCounts({ plant: 0, carnivore: 0, decomposer: 0, dead: 0 });
    setGeneration(0);
  };

  const handleSave = async () => {
    try {
      await saveState(grid, speciesCounts);
      alert('存档已保存');
    } catch (err) {
      alert('保存失败，请确认后端服务已启动');
    }
  };

  const handleLoad = async () => {
    try {
      const data = await loadState();
      if (data.grid && Array.isArray(data.grid) && data.grid.length === GRID_SIZE) {
        setGrid(data.grid);
        if (data.speciesCounts) {
          setSpeciesCounts(data.speciesCounts as typeof speciesCounts);
        }
        setGeneration(0);
        alert('存档已加载');
      } else {
        alert('存档为空');
      }
    } catch (err) {
      alert('加载失败，请确认后端服务已启动');
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: '100vh' }}>
      <div
        style={{
          width: '280px',
          flexShrink: 0,
          background: '#333',
          padding: '16px',
          borderRadius: '12px',
          margin: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 300,
            color: '#ccc',
            letterSpacing: '2px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Ecosystem Simulator
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleRunning}
            title={isRunning ? '暂停' : '播放'}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid #555',
              background: '#444',
              color: '#eee',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a4a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#444')}
          >
            {isRunning ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#eee">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#eee">
                <path d="M3 1 L14 8 L3 15 Z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleReset}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid #555',
              background: '#444',
              color: '#eee',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'background 0.2s',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a4a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#444')}
          >
            RESET
          </button>

          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              onClick={handleSave}
              title="保存存档"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid #555',
                background: '#444',
                color: '#eee',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#555')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#444')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eee" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>

            <button
              onClick={handleLoad}
              title="加载存档"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid #555',
                background: '#444',
                color: '#eee',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#555')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#444')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eee" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #444',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '4px', letterSpacing: '1px' }}>
            物种统计
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#6a994e',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#aaa', fontSize: '13px', flex: 1 }}>光合植物</span>
            <span style={{ color: '#6a994e', fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {speciesCounts.plant}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#a44d3b',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#aaa', fontSize: '13px', flex: 1 }}>肉食动物</span>
            <span style={{ color: '#a44d3b', fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {speciesCounts.carnivore}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#5e81ac',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#aaa', fontSize: '13px', flex: 1 }}>腐生菌</span>
            <span style={{ color: '#5e81ac', fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {speciesCounts.decomposer}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#888',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#aaa', fontSize: '13px', flex: 1 }}>总死亡数</span>
            <span style={{ color: '#ccc', fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {speciesCounts.dead}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid #444',
            fontSize: '11px',
            color: '#666',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, color: '#888', marginBottom: '6px' }}>规则说明</div>
          <div>• 光合植物：相邻空地可繁殖</div>
          <div>• 肉食动物：捕食植物，5回合不进食死亡</div>
          <div>• 腐生菌：分解死亡细胞增殖，偶发变异</div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          margin: '12px 12px 12px 0',
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            background: '#1a1a2e',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            minHeight: 0,
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <GridCanvas grid={grid} onCellClick={handleCellClick} />
        </div>

        <div
          style={{
            height: '40px',
            background: '#333',
            borderRadius: '8px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '14px',
            color: '#aaa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>演化代数:</span>
            <span style={{ color: '#eee', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{generation}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>状态:</span>
            <span
              style={{
                color: isRunning ? '#6a994e' : '#d08770',
                fontWeight: 600,
              }}
            >
              {isRunning ? '● 运行中' : '○ 已暂停'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
