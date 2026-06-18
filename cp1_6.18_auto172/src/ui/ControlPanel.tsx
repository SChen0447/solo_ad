import React from 'react';
import { useGameStore, CollisionBody } from '../engine/GameStore';

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  WebkitAppearance: 'none',
  appearance: 'none',
  borderRadius: '3px',
  outline: 'none',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: '#ccc',
  marginBottom: '4px',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(26,26,46,0.95)',
  borderRadius: '8px',
  padding: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
};

export const ControlPanel: React.FC = () => {
  const physics = useGameStore((s) => s.physics);
  const setPhysics = useGameStore((s) => s.setPhysics);
  const saveScene = useGameStore((s) => s.saveScene);
  const loadScene = useGameStore((s) => s.loadScene);
  const selectedBodyId = useGameStore((s) => s.selectedBodyId);
  const bodies = useGameStore((s) => s.bodies);
  const updateBody = useGameStore((s) => s.updateBody);
  const removeBody = useGameStore((s) => s.removeBody);
  const setSelectedBodyId = useGameStore((s) => s.setSelectedBodyId);
  const resetCharacter = useGameStore((s) => s.resetCharacter);

  const selectedBody = bodies.find((b) => b.id === selectedBodyId) || null;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '44px',
          background: 'rgba(26,26,46,0.95)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          zIndex: 100,
        }}
      >
        <span style={{ color: '#FF6B35', fontWeight: 'bold', fontSize: '15px', marginRight: '16px' }}>
          2D Physics Sandbox
        </span>
        <TopButton onClick={saveScene} label="💾 保存场景" />
        <TopButton onClick={loadScene} label="📂 加载场景" />
        <TopButton onClick={resetCharacter} label="🔄 重置角色" />
        <div style={{ flex: 1 }} />
        <span style={{ color: '#888', fontSize: '11px' }}>
          方向键/WASD移动 | 空格跳跃(二段跳) | 点击选中碰撞体
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '56px',
          right: '12px',
          width: '220px',
          ...panelStyle,
          zIndex: 90,
        }}
      >
        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
          物理参数
        </div>
        <PhysicsSlider
          label="重力"
          value={physics.gravity}
          min={100}
          max={2000}
          step={1}
          unit="u/s²"
          color="#FF6B35"
          onChange={(v) => setPhysics({ gravity: v })}
        />
        <PhysicsSlider
          label="摩擦力"
          value={physics.friction}
          min={0}
          max={1}
          step={0.01}
          unit=""
          color="#4CAF50"
          onChange={(v) => setPhysics({ friction: v })}
        />
        <PhysicsSlider
          label="弹力"
          value={physics.bounce}
          min={0}
          max={1}
          step={0.01}
          unit=""
          color="#2196F3"
          onChange={(v) => setPhysics({ bounce: v })}
        />
      </div>

      {selectedBody && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            width: '240px',
            ...panelStyle,
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
              属性 - {bodyTypeLabel(selectedBody.type)}
            </span>
            <button
              onClick={() => {
                removeBody(selectedBody.id);
                setSelectedBodyId(null);
              }}
              style={{
                background: '#F44336',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              删除
            </button>
          </div>

          <PropInput
            label="X"
            value={Math.round(selectedBody.x)}
            onChange={(v) => updateBody(selectedBody.id, { x: v })}
          />
          <PropInput
            label="Y"
            value={Math.round(selectedBody.y)}
            onChange={(v) => updateBody(selectedBody.id, { y: v })}
          />
          <PropInput
            label="宽度"
            value={Math.round(selectedBody.width)}
            onChange={(v) => updateBody(selectedBody.id, { width: v })}
          />
          <PropInput
            label="高度"
            value={Math.round(selectedBody.height)}
            onChange={(v) => updateBody(selectedBody.id, { height: v })}
          />

          {selectedBody.type === 'slope' && (
            <div style={{ marginTop: '6px' }}>
              <div style={labelStyle}>
                <span>旋转角度</span>
                <span>{selectedBody.rotation}°</span>
              </div>
              <input
                type="range"
                min={-45}
                max={45}
                step={5}
                value={selectedBody.rotation}
                onChange={(e) => updateBody(selectedBody.id, { rotation: Number(e.target.value) })}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <SlopeAngleBtn
                  active={selectedBody.slopeAngle === 30}
                  onClick={() => updateBody(selectedBody.id, { slopeAngle: 30 })}
                  label="30°"
                />
                <SlopeAngleBtn
                  active={selectedBody.slopeAngle === 45}
                  onClick={() => updateBody(selectedBody.id, { slopeAngle: 45 })}
                  label="45°"
                />
              </div>
            </div>
          )}

          {selectedBody.type === 'movingPlatform' && (
            <div style={{ marginTop: '6px' }}>
              <div style={labelStyle}>
                <span>移动速度</span>
                <span>{selectedBody.platformSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={selectedBody.platformSpeed}
                onChange={(e) => updateBody(selectedBody.id, { platformSpeed: Number(e.target.value) })}
                style={sliderStyle}
              />
              <PropInput
                label="移动范围"
                value={Math.round(selectedBody.platformRange)}
                onChange={(v) => updateBody(selectedBody.id, { platformRange: v })}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

const TopButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      background: 'rgba(255,255,255,0.1)',
      color: '#ddd',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '6px 14px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'background 0.2s, color 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
      e.currentTarget.style.color = '#fff';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      e.currentTarget.style.color = '#ddd';
    }}
  >
    {label}
  </button>
);

const PhysicsSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit, color, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={labelStyle}>
        <span>{label}</span>
        <span>
          {step >= 1 ? value : value.toFixed(2)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          ...sliderStyle,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)`,
        }}
      />
    </div>
  );
};

const PropInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '4px',
    }}
  >
    <span style={{ color: '#aaa', fontSize: '11px', width: '36px' }}>{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v)) onChange(v);
      }}
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '6px',
        color: '#fff',
        padding: '4px 8px',
        fontSize: '12px',
        width: '60px',
        outline: 'none',
      }}
    />
  </div>
);

const SlopeAngleBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      background: active ? '#FF9800' : 'rgba(255,255,255,0.1)',
      color: active ? '#fff' : '#aaa',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '6px',
      padding: '4px',
      cursor: 'pointer',
      fontSize: '11px',
      transition: 'background 0.2s',
    }}
  >
    {label}
  </button>
);

function bodyTypeLabel(type: CollisionBody['type']): string {
  const labels: Record<string, string> = {
    ground: '地面',
    wall: '墙壁',
    slope: '斜坡',
    movingPlatform: '移动平台',
    bouncePad: '弹射板',
  };
  return labels[type] || type;
}
