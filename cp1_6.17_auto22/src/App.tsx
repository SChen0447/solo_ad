import React, { useState, useEffect, useRef, useCallback } from 'react';
import GardenCanvas from './modules/garden/GardenCanvas';
import ControlPanel from './components/ControlPanel';
import { TreeData, DEFAULT_TREE_CONFIG } from './modules/garden/TreeEngine';

const App: React.FC = () => {
  const [growthSpeed, setGrowthSpeed] = useState(DEFAULT_TREE_CONFIG.growthSpeedMultiplier);
  const [nutrientRate, setNutrientRate] = useState(DEFAULT_TREE_CONFIG.nutrientExchangeRate);
  const [maxTreeCount, setMaxTreeCount] = useState(DEFAULT_TREE_CONFIG.maxTreeCount);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const canvasRef = useRef<any>(null);
  const resetKeyRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const gardenConfig = {
    growthSpeedMultiplier: growthSpeed,
    nutrientExchangeRate: nutrientRate,
    maxTreeCount: maxTreeCount,
  };

  const handleTreeSelect = useCallback((tree: TreeData | null) => {
    setSelectedTree(tree);
  }, []);

  const handleReset = useCallback(() => {
    resetKeyRef.current += 1;
    setSelectedTree(null);
    setTreeCount(0);
    if (canvasRef.current) {
      canvasRef.current = null;
    }
  }, []);

  const closeInfoPanel = () => {
    setSelectedTree(null);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} 秒`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${mins} 分 ${secs} 秒`;
  };

  const getTreeStatus = (tree: TreeData): { text: string; color: string } => {
    if (tree.isWilting) {
      return { text: '⚠️ 枯萎中', color: '#ffd700' };
    }
    if (tree.growthProgress < 1) {
      return { text: '🌱 生长中', color: '#6be5a0' };
    }
    return { text: '🌳 成熟', color: '#4ade80' };
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: isMobile ? 0 : '0',
          bottom: 0,
          padding: isMobile ? '0' : '0',
          transition: 'all 0.3s ease',
        }}
      >
        <GardenCanvas
          key={resetKeyRef.current}
          config={gardenConfig}
          onTreeSelect={handleTreeSelect}
          selectedTreeId={selectedTree?.id || null}
        />
      </div>

      {!isMobile && (
        <ControlPanel
          growthSpeed={growthSpeed}
          nutrientRate={nutrientRate}
          maxTreeCount={maxTreeCount}
          onGrowthSpeedChange={setGrowthSpeed}
          onNutrientRateChange={setNutrientRate}
          onMaxTreeCountChange={setMaxTreeCount}
          onReset={handleReset}
          isOpen={panelOpen}
          onToggle={() => setPanelOpen(!panelOpen)}
        />
      )}

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(20, 50, 35, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px 16px 0 0',
            padding: '16px',
            zIndex: 100,
            transform: panelOpen ? 'translateY(0)' : 'translateY(calc(100% - 50px))',
            transition: 'transform 0.3s ease',
          }}
        >
          <div
            onClick={() => setPanelOpen(!panelOpen)}
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0',
              cursor: 'pointer',
              marginBottom: panelOpen ? '8px' : '0',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '4px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
              }}
            />
          </div>
          {panelOpen && (
            <div style={{ color: 'white' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#b8f0d0' }}>
                🌿 控制面板
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>生长速度</span>
                  <span style={{ color: '#6be5a0', fontWeight: 600 }}>
                    {growthSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={growthSpeed}
                  onChange={(e) => setGrowthSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                  className="custom-slider"
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>养分速率</span>
                  <span style={{ color: '#6be5a0', fontWeight: 600 }}>
                    {nutrientRate.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.01"
                  value={nutrientRate}
                  onChange={(e) => setNutrientRate(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                  className="custom-slider"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>最大数量</span>
                  <span style={{ color: '#6be5a0', fontWeight: 600 }}>{maxTreeCount}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={maxTreeCount}
                  onChange={(e) => setMaxTreeCount(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                  className="custom-slider"
                />
              </div>
              <button
                onClick={handleReset}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #6be5a0 0%, #3db871 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#0d2818',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🔄 重置花园
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTree && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 50, 35, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            minWidth: isMobile ? '280px' : '340px',
            maxWidth: '90vw',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
            zIndex: 200,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ fontSize: '18px', margin: 0, color: '#b8f0d0' }}>
              🌳 树木信息
            </h3>
            <button
              onClick={closeInfoPanel}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>状态</span>
              <span style={{ color: getTreeStatus(selectedTree).color, fontWeight: 600 }}>
                {getTreeStatus(selectedTree).text}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>年龄</span>
              <span style={{ color: 'white', fontFamily: 'monospace' }}>
                {formatTime(selectedTree.age)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>养分值</span>
              <span
                style={{
                  color: selectedTree.nutrients < 20 ? '#ff6b6b' : '#6be5a0',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                {selectedTree.nutrients.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>生长进度</span>
              <span style={{ color: '#6be5a0', fontWeight: 600 }}>
                {(selectedTree.growthProgress * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>树干分叉</span>
              <span style={{ color: 'white' }}>{selectedTree.trunkBranches} 个</span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '13px',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
              💡 提示
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
              树木通过发光的连接线与相邻树木交换养分。距离越近，养分交换越频繁。
              {selectedTree.nutrients < 30 &&
                ' 这棵树的养分较低，多种植一些邻近的树可以帮助它恢复。'}
            </p>
          </div>
        </div>
      )}

      {selectedTree && (
        <div
          onClick={closeInfoPanel}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 150,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {!isMobile && !panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(20, 50, 35, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: 'none',
            color: '#6be5a0',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⚙️
        </button>
      )}

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          color: 'white',
          zIndex: 50,
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? '20px' : '28px',
            fontWeight: 700,
            margin: 0,
            color: '#b8f0d0',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          🌿 数字花园
        </h1>
        <p
          style={{
            fontSize: isMobile ? '12px' : '14px',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '4px',
          }}
        >
          种植属于你的虚拟森林
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.15);
          outline: none;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6be5a0 0%, #3db871 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(100, 220, 160, 0.4);
        }
        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6be5a0 0%, #3db871 100%);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default App;
