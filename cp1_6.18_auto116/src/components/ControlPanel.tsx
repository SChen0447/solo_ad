import { getStarList } from '@/modules/starData';
import { useStore } from '@/store';

const panelStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 40, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '8px',
  border: '1px solid rgba(0, 212, 255, 0.15)',
  padding: '16px',
  transition: 'all 0.3s ease',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '10px',
  fontWeight: 600,
  color: '#00d4ff',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  marginBottom: '8px',
};

const neonBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(124, 58, 237, 0.3)' : 'rgba(0, 212, 255, 0.08)',
  border: `1px solid ${active ? '#7c3aed' : 'rgba(0, 212, 255, 0.3)'}`,
  borderRadius: '6px',
  color: active ? '#c4b5fd' : '#88ccdd',
  padding: '6px 12px',
  fontSize: '12px',
  fontFamily: "'Source Sans 3', sans-serif",
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  outline: 'none',
  width: '100%',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export default function ControlPanel() {
  const selectedStars = useStore((s) => s.selectedStars);
  const simulationEnabled = useStore((s) => s.simulationEnabled);
  const rotationSpeed = useStore((s) => s.rotationSpeed);
  const toggleStar = useStore((s) => s.toggleStar);
  const setSimulationEnabled = useStore((s) => s.setSimulationEnabled);
  const setRotationSpeed = useStore((s) => s.setRotationSpeed);

  const allStars = getStarList();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={panelStyle}>
        <div style={labelStyle}>恒星选择</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allStars.map((star) => {
            const active = selectedStars.includes(star.id);
            return (
              <button
                key={star.id}
                style={neonBtnStyle(active)}
                onClick={() => toggleStar(star.id)}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#00d4ff';
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)';
                  }
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: active ? '#7c3aed' : star.layers[0].emissiveColor,
                    boxShadow: active ? '0 0 8px #7c3aed' : `0 0 6px ${star.layers[0].emissiveColor}`,
                    transition: 'all 0.3s ease',
                  }} />
                  <span>
                    <span style={{ fontWeight: 600 }}>{star.name}</span>
                    <span style={{ fontSize: '10px', color: '#667799', marginLeft: '6px' }}>
                      {star.type}
                    </span>
                  </span>
                </span>
                <span style={{
                  fontSize: '10px',
                  color: active ? '#a78bfa' : '#445566',
                  transition: 'color 0.3s ease',
                }}>
                  {active ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#556677',
          textAlign: 'center',
        }}>
          已选 {selectedStars.length}/3 颗
        </div>
      </div>

      <div style={panelStyle}>
        <div style={labelStyle}>动态模拟</div>
        <button
          style={{
            ...neonBtnStyle(simulationEnabled),
            justifyContent: 'center',
            fontWeight: 600,
          }}
          onClick={() => setSimulationEnabled(!simulationEnabled)}
        >
          <span style={{ fontSize: '13px' }}>
            {simulationEnabled ? '⏸ 暂停模拟' : '▶ 启动模拟'}
          </span>
        </button>
      </div>

      <div style={panelStyle}>
        <div style={labelStyle}>旋转速度</div>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={rotationSpeed}
          onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#00d4ff',
            cursor: 'pointer',
          }}
        />
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#667799',
          marginTop: '4px',
        }}>
          {rotationSpeed.toFixed(1)}×
        </div>
      </div>

      <div style={panelStyle}>
        <div style={labelStyle}>操作提示</div>
        <div style={{
          fontSize: '11px',
          color: '#667799',
          lineHeight: '1.6',
        }}>
          <div>🖱 拖拽旋转视角</div>
          <div>🔍 滚轮缩放</div>
          <div>👆 悬停查看层参数</div>
        </div>
      </div>
    </div>
  );
}
