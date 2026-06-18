import { useState } from 'react';
import { useStore, useCurrentMolecule, BackgroundColor } from '@/store/useStore';
import { MOLECULES, getLayerById, CPK_COLORS, ELEMENT_NAMES } from '@/data/molecules';
import { useLayerPeelProgress } from '@/store/useStore';

export function UIPanel() {
  const molecule = useCurrentMolecule();
  const currentMoleculeId = useStore(state => state.currentMoleculeId);
  const setCurrentMolecule = useStore(state => state.setCurrentMolecule);
  const peelSpeed = useStore(state => state.peelSpeed);
  const setPeelSpeed = useStore(state => state.setPeelSpeed);
  const atomOpacity = useStore(state => state.atomOpacity);
  const setAtomOpacity = useStore(state => state.setAtomOpacity);
  const backgroundColor = useStore(state => state.backgroundColor);
  const setBackgroundColor = useStore(state => state.setBackgroundColor);
  const isPanelExpanded = useStore(state => state.isPanelExpanded);
  const setPanelExpanded = useStore(state => state.setPanelExpanded);
  const toggleLayerPeel = useStore(state => state.toggleLayerPeel);
  const recombineAll = useStore(state => state.recombineAll);
  const statusText = useStore(state => state.statusText);
  const peeledLayers = useStore(state => state.peeledLayers);

  const [leftPanelExpanded, setLeftPanelExpanded] = useState(true);

  const bgOptions: { id: BackgroundColor; name: string; color: string }[] = [
    { id: 'deep-space', name: '深空蓝', color: '#0a0e1a' },
    { id: 'research-white', name: '科研白', color: '#f5f7fa' },
    { id: 'pure-black', name: '纯黑', color: '#000000' },
  ];

  const peeledCount = peeledLayers.filter(p => p.progress > 0).length;

  const getLayerElementColors = (layerId: string): string[] => {
    const layer = getLayerById(molecule, layerId);
    if (!layer) return [];
    const elements = new Set<string>();
    layer.atomIds.forEach(atomId => {
      const atom = molecule.atoms.find(a => a.id === atomId);
      if (atom) elements.add(atom.element);
    });
    return Array.from(elements).map(e => CPK_COLORS[e as keyof typeof CPK_COLORS]);
  };

  return (
    <>
      {/* Left Panel - Layer List */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: leftPanelExpanded ? '280px' : '48px',
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(107, 182, 255, 0.2)',
          transition: 'width 0.3s ease',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(107, 182, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {leftPanelExpanded && (
            <div>
              <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                分子分层
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                点击图层进行剥离/重组
              </p>
            </div>
          )}
          <button
            onClick={() => setLeftPanelExpanded(!leftPanelExpanded)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(107, 182, 255, 0.15)',
              border: '1px solid rgba(107, 182, 255, 0.3)',
              color: '#6bb6ff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(107, 182, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(107, 182, 255, 0.15)';
            }}
          >
            {leftPanelExpanded ? '‹' : '›'}
          </button>
        </div>

        {leftPanelExpanded && (
          <>
            <div style={{ padding: '12px 16px' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                选择分子
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {MOLECULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setCurrentMolecule(m.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: currentMoleculeId === m.id
                        ? '1px solid #6bb6ff'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: currentMoleculeId === m.id
                        ? 'rgba(107, 182, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: currentMoleculeId === m.id ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (currentMoleculeId !== m.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentMoleculeId !== m.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>{m.formula}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', marginTop: '8px' }}>
                图层列表（最多同时剥离2层）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {molecule.layers.map(layer => {
                  const progress = useLayerPeelProgress(layer.id);
                  const isPeeled = progress >= 1;
                  const isAnimating = progress > 0 && progress < 1;
                  const colors = getLayerElementColors(layer.id);
                  const isDisabled = !isPeeled && peeledCount >= 2 && progress === 0;

                  return (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayerPeel(layer.id)}
                      disabled={isDisabled && !isPeeled}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: isPeeled
                          ? '1px solid #6bb6ff'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isPeeled
                          ? 'linear-gradient(135deg, rgba(107, 182, 255, 0.25), rgba(107, 182, 255, 0.1))'
                          : 'rgba(255, 255, 255, 0.04)',
                        color: isDisabled ? 'rgba(255, 255, 255, 0.3)' : '#fff',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabled || isPeeled) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {isAnimating && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${progress * 100}%`,
                            background: 'rgba(107, 182, 255, 0.15)',
                            transition: 'width 0.05s linear',
                          }}
                        />
                      )}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {colors.slice(0, 3).map((color, i) => (
                            <div
                              key={i}
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: color,
                                boxShadow: `0 0 6px ${color}`,
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {layer.name}
                          </div>
                          <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>
                            {layer.atomIds.length} 个原子
                          </div>
                        </div>
                        {isPeeled && (
                          <div
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(107, 182, 255, 0.3)',
                              fontSize: '10px',
                              color: '#6bb6ff',
                            }}
                          >
                            已剥离
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid rgba(107, 182, 255, 0.15)' }}>
              <button
                onClick={recombineAll}
                disabled={peeledCount === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #6bb6ff',
                  background: peeledCount === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(107, 182, 255, 0.2)',
                  color: peeledCount === 0 ? 'rgba(255, 255, 255, 0.4)' : '#6bb6ff',
                  cursor: peeledCount === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (peeledCount > 0) {
                    e.currentTarget.style.background = 'rgba(107, 182, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 182, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  if (peeledCount > 0) {
                    e.currentTarget.style.background = 'rgba(107, 182, 255, 0.2)';
                  }
                }}
              >
                重组所有图层
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right Panel - Parameters */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: isPanelExpanded ? '280px' : '48px',
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(107, 182, 255, 0.2)',
          transition: 'width 0.3s ease',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(107, 182, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {isPanelExpanded && (
            <div>
              <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                参数调节
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                自定义显示效果
              </p>
            </div>
          )}
          <button
            onClick={() => setPanelExpanded(!isPanelExpanded)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(107, 182, 255, 0.15)',
              border: '1px solid rgba(107, 182, 255, 0.3)',
              color: '#6bb6ff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(107, 182, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(107, 182, 255, 0.15)';
            }}
          >
            {isPanelExpanded ? '›' : '‹'}
          </button>
        </div>

        {isPanelExpanded && (
          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', fontWeight: 500 }}>
                  剥离速度
                </label>
                <span style={{ color: '#6bb6ff', fontSize: '12px', fontWeight: 600 }}>
                  {peelSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={peelSpeed}
                onChange={(e) => setPeelSpeed(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                <span>0.5x</span>
                <span>3x</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', fontWeight: 500 }}>
                  原子透明度
                </label>
                <span style={{ color: '#6bb6ff', fontSize: '12px', fontWeight: 600 }}>
                  {Math.round(atomOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={atomOpacity}
                onChange={(e) => setAtomOpacity(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                <span>20%</span>
                <span>100%</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', fontWeight: 500, marginBottom: '12px', display: 'block' }}>
                背景颜色
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {bgOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setBackgroundColor(opt.id)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: backgroundColor === opt.id
                        ? '2px solid #6bb6ff'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: opt.color,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      if (backgroundColor !== opt.id) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: opt.color,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: opt.id === 'research-white' ? '#333' : 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                      {opt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(107, 182, 255, 0.08)', border: '1px solid rgba(107, 182, 255, 0.15)' }}>
              <div style={{ color: '#6bb6ff', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                操作提示
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', lineHeight: 1.8 }}>
                <li>拖拽旋转视角</li>
                <li>滚轮缩放场景</li>
                <li>点击原子剥离对应层</li>
                <li>双击原子查看详情</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 28px',
          background: 'rgba(10, 14, 26, 0.9)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(107, 182, 255, 0.25)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 100,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
          animation: 'fadeInUp 0.5s ease',
        }}
      >
        <span style={{ color: '#6bb6ff', marginRight: '8px' }}>●</span>
        {statusText}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #6bb6ff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(107, 182, 255, 0.4);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(107, 182, 255, 0.6);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #6bb6ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(107, 182, 255, 0.4);
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(107, 182, 255, 0.3);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 182, 255, 0.5);
        }
      `}</style>
    </>
  );
}
