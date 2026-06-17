import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useConceptStore } from '@/store/useConceptStore';
import { COLOR_PALETTE, NodeType } from '@/types/conceptTypes';

const UIPanel: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const nodes = useConceptStore((s) => s.nodes);
  const connections = useConceptStore((s) => s.connections);
  const cameraMode = useConceptStore((s) => s.cameraMode);
  const forceSimulationEnabled = useConceptStore((s) => s.forceSimulationEnabled);
  const toggleForceSimulation = useConceptStore((s) => s.toggleForceSimulation);
  const setCameraMode = useConceptStore((s) => s.setCameraMode);
  const setFocusedNodeId = useConceptStore((s) => s.setFocusedNodeId);
  const editingNodeId = useConceptStore((s) => s.editingNodeId);
  const setEditingNodeId = useConceptStore((s) => s.setEditingNodeId);
  const updateNode = useConceptStore((s) => s.updateNode);
  const removeNode = useConceptStore((s) => s.removeNode);
  const showRadialMenu = useConceptStore((s) => s.showRadialMenu);
  const radialMenuPosition = useConceptStore((s) => s.radialMenuPosition);
  const closeRadialMenu = useConceptStore((s) => s.closeRadialMenu);
  const addNode = useConceptStore((s) => s.addNode);
  const connectingFromId = useConceptStore((s) => s.connectingFromId);

  useEffect(() => {
    const updateScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w <= 1366 || h <= 768) {
        setScale(0.9);
      } else {
        setScale(1);
      }
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const editingNode = nodes.find((n) => n.id === editingNodeId);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[6].value);

  useEffect(() => {
    if (editingNode) {
      setTitleInput(editingNode.title);
      setDescInput(editingNode.description);
      setSelectedColor(editingNode.color);
    }
  }, [editingNodeId]);

  const handleSave = () => {
    if (!editingNode) return;
    updateNode(editingNode.id, {
      title: titleInput.slice(0, 20),
      description: descInput.slice(0, 200),
      color: selectedColor,
    });
    setEditingNodeId(null);
  };

  const handleDelete = () => {
    if (!editingNode) return;
    if (confirm('确定要删除这个概念节点吗？')) {
      removeNode(editingNode.id);
      setEditingNodeId(null);
    }
  };

  const handleCreateNode = (type: NodeType) => {
    if (!radialMenuPosition) return;
    const palette = COLOR_PALETTE;
    const color = palette[Math.floor(Math.random() * palette.length)].value;
    addNode(type, radialMenuPosition, color);
  };

  const radialMenuScreenPos = useMemo(() => {
    if (!radialMenuPosition) return { x: 0, y: 0, visible: false };
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: true };
      const rect = canvas.getBoundingClientRect();
      const fov = 60 * (Math.PI / 180);
      const aspect = rect.width / rect.height;
      const near = 0.1;
      const tanFov = Math.tan(fov / 2);
      const dist = 12;
      const sx = (radialMenuPosition.x / (dist * tanFov * aspect)) * (rect.width / 2) + rect.width / 2;
      const sy = (-radialMenuPosition.y / (dist * tanFov)) * (rect.height / 2) + rect.height / 2;
      return { x: sx + rect.left, y: sy + rect.top, visible: true };
    } catch {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: true };
    }
  }, [radialMenuPosition, nodes.length]);

  const s = scale;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        transform: `scale(${s})`,
        transformOrigin: 'top left',
        width: `${100 / s}%`,
        height: `${100 / s}%`,
      }}
    >
      {/* 左上角操作提示 */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '16px 20px',
          borderRadius: 16,
          background: 'rgba(20, 20, 60, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(150, 170, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 40, 0.35)',
          pointerEvents: 'auto',
          maxWidth: 320,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#c4d0ff',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6ea8ff', boxShadow: '0 0 10px #6ea8ff' }} />
          概念星图 · 操作指引
        </div>
        <div style={{ fontSize: 12, color: '#a8b4e0', lineHeight: 1.9, opacity: 0.92 }}>
          <div>🖱️ <b>左键拖拽</b>：旋转视角</div>
          <div>🖱️ <b>滚轮</b>：缩放视角</div>
          <div>🖱️ <b>Ctrl + 拖拽</b>：平移视角</div>
          <div>🖱️ <b>右键空白</b>：创建节点菜单</div>
          <div>✨ <b>单击节点</b>：编辑属性</div>
          <div>🔍 <b>双击节点</b>：聚焦环绕观察</div>
          <div>🔗 <b>Shift + 拖拽节点</b>：连线</div>
          {isTouchDevice && (
            <>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(150,170,255,0.15)' }}>
                📱 触屏：双指旋转/缩放
              </div>
            </>
          )}
        </div>
      </div>

      {/* 顶部状态栏 */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          pointerEvents: 'auto',
        }}
      >
        <div
          onClick={toggleForceSimulation}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background: forceSimulationEnabled
              ? 'linear-gradient(135deg, rgba(80, 200, 120, 0.35), rgba(60, 180, 100, 0.25))'
              : 'rgba(80, 80, 100, 0.35)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: forceSimulationEnabled
              ? '1px solid rgba(100, 255, 150, 0.4)'
              : '1px solid rgba(150, 150, 170, 0.2)',
            color: forceSimulationEnabled ? '#9cf5c0' : '#c0c0d0',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.25s',
            boxShadow: forceSimulationEnabled ? '0 0 20px rgba(80,200,120,0.15)' : 'none',
          }}
        >
          <span>{forceSimulationEnabled ? '🌀' : '⏸️'}</span>
          力模拟{forceSimulationEnabled ? '运行中' : '已暂停'}
        </div>

        <div
          onClick={() => {
            if (cameraMode === 'focus') {
              setCameraMode('free');
              setFocusedNodeId(null);
            }
          }}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background:
              cameraMode === 'focus'
                ? 'linear-gradient(135deg, rgba(180, 120, 255, 0.35), rgba(150, 100, 220, 0.25))'
                : 'rgba(80, 80, 100, 0.35)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:
              cameraMode === 'focus'
                ? '1px solid rgba(200, 150, 255, 0.4)'
                : '1px solid rgba(150, 150, 170, 0.2)',
            color: cameraMode === 'focus' ? '#d4b8ff' : '#c0c0d0',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.25s',
            boxShadow: cameraMode === 'focus' ? '0 0 20px rgba(180,120,255,0.15)' : 'none',
          }}
        >
          <span>{cameraMode === 'focus' ? '🎯' : '🆓'}</span>
          {cameraMode === 'focus' ? '聚焦模式（点击退出）' : '自由模式'}
        </div>

        <div
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background: 'rgba(60, 80, 140, 0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(120, 150, 220, 0.2)',
            color: '#a8b8e8',
            fontSize: 13,
            fontWeight: 500,
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>⚛️ 节点 {nodes.length}</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>🔗 连线 {connections.length}</span>
        </div>
      </div>

      {/* 连接中提示 */}
      {connectingFromId && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 28px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(110, 168, 255, 0.4), rgba(180, 120, 255, 0.3))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(150, 200, 255, 0.45)',
            color: '#d8e4ff',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 0 30px rgba(100, 150, 255, 0.3)',
            animation: 'pulse 1.6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        >
          ✨ 正在连线 · 拖动到目标节点松开以建立连接（空白处取消）
        </div>
      )}

      {/* 径向菜单 */}
      {showRadialMenu && radialMenuPosition && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: radialMenuScreenPos.x,
            top: radialMenuScreenPos.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            zIndex: 20,
            animation: 'radialFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 240,
              height: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {(['core', 'attribute', 'relation'] as NodeType[]).map((type, i) => {
              const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
              const radius = 90;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const config = {
                core: { icon: '🔵', name: '核心节点', color: 'from-blue-500 to-indigo-600', bg: 'rgba(76, 110, 245, 0.35)', border: 'rgba(120, 150, 255, 0.55)' },
                attribute: { icon: '🟩', name: '属性节点', color: 'from-green-500 to-emerald-600', bg: 'rgba(81, 207, 102, 0.35)', border: 'rgba(120, 230, 140, 0.55)' },
                relation: { icon: '🔺', name: '关联节点', color: 'from-orange-500 to-amber-600', bg: 'rgba(255, 169, 77, 0.35)', border: 'rgba(255, 200, 120, 0.55)' },
              }[type];

              return (
                <div
                  key={type}
                  onClick={() => handleCreateNode(type)}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: config.bg,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `2px solid ${config.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: `0 6px 24px rgba(0,0,0,0.25), 0 0 20px ${config.border.replace('0.55', '0.3')}`,
                    animationDelay: `${i * 50}ms`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  }}
                >
                  <div style={{ fontSize: 26 }}>{config.icon}</div>
                  <div style={{ fontSize: 10, color: '#e8ecff', fontWeight: 500 }}>{config.name}</div>
                </div>
              );
            })}

            <div
              onClick={closeRadialMenu}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(50, 50, 80, 0.55)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '2px solid rgba(180, 180, 220, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#c0c8e0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              ✕
            </div>
          </div>
        </div>
      )}

      {/* 节点编辑面板 */}
      {editingNode && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 10, 40, 0.2)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease',
          }}
          onClick={() => setEditingNodeId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 460,
              padding: 32,
              borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(40, 45, 95, 0.65) 0%, rgba(30, 35, 70, 0.55) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(160, 180, 255, 0.22)',
              position: 'relative',
              boxShadow: '0 24px 64px rgba(0, 0, 60, 0.5), 0 0 0 1px rgba(140, 170, 255, 0.08)',
              animation: 'panelSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${editingNode.color}, #fff, ${editingNode.color})`,
                opacity: 0.6,
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                width: 28,
                height: 28,
                borderRadius: 8,
                background: editingNode.color,
                boxShadow: `0 0 16px ${editingNode.color}`,
                opacity: 0.85,
              }}
            />

            <div
              style={{
                textAlign: 'center',
                marginBottom: 28,
                paddingTop: 4,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#e8ecff',
                  letterSpacing: 0.5,
                }}
              >
                编辑概念节点
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8898c0',
                  marginTop: 6,
                }}
              >
                类型：{{ core: '● 核心节点', attribute: '■ 属性节点', relation: '▲ 关联节点' }[editingNode.type]}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#a0b0d8',
                  marginBottom: 8,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                }}
              >
                节点标题 · {titleInput.length}/20
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value.slice(0, 20))}
                placeholder="输入概念标题..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(20, 25, 50, 0.5)',
                  border: '1.5px solid rgba(140, 160, 220, 0.25)',
                  color: '#e8ecff',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border 0.2s, box-shadow 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = selectedColor;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${selectedColor}22`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(140, 160, 220, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#a0b0d8',
                  marginBottom: 8,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                }}
              >
                描述文本 · {descInput.length}/200
              </label>
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value.slice(0, 200))}
                placeholder="描述这个概念的内涵、作用或关联..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(20, 25, 50, 0.5)',
                  border: '1.5px solid rgba(140, 160, 220, 0.25)',
                  color: '#e8ecff',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.6,
                  transition: 'border 0.2s, box-shadow 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = selectedColor;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${selectedColor}22`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(140, 160, 220, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#a0b0d8',
                  marginBottom: 12,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                }}
              >
                标签颜色
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 10,
                }}
              >
                {COLOR_PALETTE.map((c) => (
                  <div
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    title={c.name}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      background: c.value,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.15s',
                      boxShadow:
                        selectedColor === c.value
                          ? `0 0 0 3px #fff, 0 0 0 5px ${c.value}, 0 6px 16px ${c.value}55`
                          : `0 2px 8px rgba(0,0,0,0.25), 0 0 0 2px ${c.value}33 inset`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {selectedColor === c.value && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 14,
                          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
              }}
            >
              <button
                onClick={handleDelete}
                style={{
                  flex: 0.9,
                  padding: '13px 16px',
                  borderRadius: 12,
                  background: 'rgba(255, 100, 100, 0.15)',
                  border: '1.5px solid rgba(255, 120, 120, 0.3)',
                  color: '#ff9a9a',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 80, 80, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 100, 100, 0.15)';
                }}
              >
                🗑️ 删除节点
              </button>
              <button
                onClick={() => setEditingNodeId(null)}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  borderRadius: 12,
                  background: 'rgba(100, 110, 150, 0.3)',
                  border: '1.5px solid rgba(150, 160, 200, 0.25)',
                  color: '#c0c8e0',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(120, 130, 170, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(100, 110, 150, 0.3)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1.2,
                  padding: '13px 20px',
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${selectedColor}dd, ${selectedColor}99)`,
                  border: `1.5px solid ${selectedColor}`,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: `0 6px 20px ${selectedColor}55`,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 10px 28px ${selectedColor}77`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${selectedColor}55`;
                }}
              >
                ✓ 保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes panelSlideIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes radialFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
};

export default UIPanel;
