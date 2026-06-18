import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  CellType,
  GridData,
  CELL_SIZE,
  CELL_LABELS,
  CELL_COLORS,
  createEmptyGrid,
  setCell,
  getCell,
  generatePresetLevel,
  findPlayerPosition,
} from './utils';
import EditorGrid from './EditorGrid';
import { runSimulation, PathPoint, SimulationResult } from './SimulationEngine';

type SimState = 'idle' | 'running' | 'done';

const TOOL_ITEMS: { type: CellType; icon: string }[] = [
  { type: CellType.Ground, icon: '🟫' },
  { type: CellType.Spike, icon: '🔺' },
  { type: CellType.Finish, icon: '🏁' },
  { type: CellType.Player, icon: '🟢' },
  { type: CellType.Empty, icon: '🧹' },
];

const STATUS_COLOR = '#6B7280';

const App: React.FC = () => {
  const [grid, setGrid] = useState<GridData>(() => createEmptyGrid(24, 16));
  const [editMode, setEditMode] = useState<CellType>(CellType.Ground);
  const [simState, setSimState] = useState<SimState>('idle');
  const [statusText, setStatusText] = useState('待运行');
  const [path, setPath] = useState<PathPoint[]>([]);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [flashCount, setFlashCount] = useState(0);
  const flashTimerRef = useRef<number | null>(null);

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (simState === 'running') return;

      if (path.length > 0 || simResult !== null) {
        setPath([]);
        setSimResult(null);
        setFlashCount(0);
        if (flashTimerRef.current) {
          clearInterval(flashTimerRef.current);
          flashTimerRef.current = null;
        }
      }

      const currentCell = getCell(grid, col, row);

      if (editMode === CellType.Empty) {
        setGrid((prev) => setCell(prev, col, row, CellType.Empty));
        return;
      }

      if (editMode === CellType.Player && currentCell !== CellType.Player) {
        const existingPlayer = findPlayerPosition(grid);
        if (existingPlayer) {
          setGrid((prev) => setCell(prev, existingPlayer.col, existingPlayer.row, CellType.Empty));
        }
      }

      if (currentCell === editMode) {
        setGrid((prev) => setCell(prev, col, row, CellType.Empty));
      } else {
        setGrid((prev) => setCell(prev, col, row, editMode));
      }
    },
    [grid, editMode, simState, path, simResult]
  );

  const handleRun = useCallback(async () => {
    if (simState === 'running') return;

    const playerPos = findPlayerPosition(grid);
    if (!playerPos) {
      setStatusText('请先放置玩家起点');
      return;
    }

    setSimState('running');
    setStatusText('模拟中...');
    setPath([]);
    setSimResult(null);
    setFlashCount(0);

    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    const output = await runSimulation(grid);
    setPath(output.path);
    setSimResult(output.result);
    setSimState('done');
    setStatusText(output.resultMessage);

    if (output.result === 'reached_finish') {
      let count = 0;
      flashTimerRef.current = window.setInterval(() => {
        count++;
        setFlashCount(count);
        if (count >= 6) {
          if (flashTimerRef.current) {
            clearInterval(flashTimerRef.current);
            flashTimerRef.current = null;
          }
        }
      }, 250);
    }
  }, [grid, simState]);

  const handleReset = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setGrid(createEmptyGrid(24, 16));
    setSimState('idle');
    setStatusText('待运行');
    setPath([]);
    setSimResult(null);
    setFlashCount(0);
  }, []);

  const handlePreset = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setGrid(generatePresetLevel());
    setSimState('idle');
    setStatusText('已加载示例关卡');
    setPath([]);
    setSimResult(null);
    setFlashCount(0);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        clearInterval(flashTimerRef.current);
      }
    };
  }, []);

  const statusColor = STATUS_COLOR;

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '24px 12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#1e293b',
          marginBottom: '16px',
          fontWeight: 700,
        }}
      >
        2D 平台关卡编辑器
      </h1>

      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 12px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {TOOL_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => setEditMode(item.type)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '8px',
                border:
                  editMode === item.type
                    ? '2px solid #3B82F6'
                    : '2px solid #e5e7eb',
                background: editMode === item.type ? '#EFF6FF' : '#fff',
                color: '#1e293b',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                fontWeight: 500,
                cursor: 'pointer',
                transform: 'scale(1)',
                transition: 'transform 0.15s ease',
                boxShadow: editMode === item.type ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none',
                flexShrink: 0,
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              <span>{CELL_LABELS[item.type] || '擦除'}</span>
            </button>
          ))}

          <div style={{ flex: 1, minWidth: '8px' }} />

          <button
            onClick={handleRun}
            disabled={simState === 'running'}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: simState === 'running' ? '#9CA3AF' : '#3B82F6',
              color: '#fff',
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              fontWeight: 600,
              cursor: simState === 'running' ? 'not-allowed' : 'pointer',
              transform: 'scale(1)',
              transition: 'transform 0.15s ease, background 0.15s ease',
              flexShrink: 0,
            }}
            onMouseDown={(e) => {
              if (simState !== 'running') {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            ▶ 运行
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              background: '#fff',
              color: '#6B7280',
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              fontWeight: 500,
              cursor: 'pointer',
              transform: 'scale(1)',
              transition: 'transform 0.15s ease',
              flexShrink: 0,
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            ↺ 重置
          </button>

          <button
            onClick={handlePreset}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              background: '#fff',
              color: '#6B7280',
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              fontWeight: 500,
              cursor: 'pointer',
              transform: 'scale(1)',
              transition: 'transform 0.15s ease',
              flexShrink: 0,
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            📋 示例关卡
          </button>
        </div>

        <div style={{ padding: '8px' }}>
          <EditorGrid
            grid={grid}
            editMode={editMode}
            onCellClick={handleCellClick}
            path={path}
            simulationResult={simResult}
            flashCount={flashCount}
          />
        </div>

        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '14px',
            color: statusColor,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ color: statusColor }}>{statusText}</span>
          <span style={{ fontSize: '12px', color: statusColor }}>
            网格: {grid.cols}×{grid.rows} | 格子: {CELL_SIZE}px
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {[CellType.Ground, CellType.Spike, CellType.Finish, CellType.Player].map((type) => (
          <div
            key={type}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: statusColor }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                background: CELL_COLORS[type],
                flexShrink: 0,
              }}
            />
            {CELL_LABELS[type]}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
