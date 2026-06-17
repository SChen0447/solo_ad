import { SimulationStats } from '@/types';

interface ResultPanelProps {
  stats: SimulationStats | null;
  visible: boolean;
  onReset: () => void;
}

export default function ResultPanel({ stats, visible, onReset }: ResultPanelProps) {
  const show = visible && stats !== null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 200,
        background: '#1e1e2f',
        borderRadius: 12,
        transform: show ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        boxSizing: 'border-box',
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'Orbitron',
          fontSize: 15,
          color: '#e0e0e0',
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        连锁反应结算
      </div>

      <div
        style={{
          height: 1,
          background: '#333355',
          margin: '12px 0',
        }}
      />

      {stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#888', fontSize: 12 }}>总碰撞次数</span>
            <span style={{ color: '#ff6699', fontSize: 16, fontWeight: 'bold' }}>{stats.totalCollisions}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#888', fontSize: 12 }}>最大传递距离</span>
            <div>
              <span style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 'bold' }}>{stats.maxTransferDistance}</span>
              <span style={{ color: '#666', fontSize: 11, marginLeft: 2 }}>px</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#888', fontSize: 12 }}>能量损失率</span>
            <div>
              <span style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 'bold' }}>{stats.energyLossRate}</span>
              <span style={{ color: '#666', fontSize: 11, marginLeft: 2 }}>%</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#888', fontSize: 12 }}>方块摧毁数</span>
            <span style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 'bold' }}>{stats.destroyedCount}</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onReset}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
        style={{
          width: '100%',
          height: 36,
          background: '#ff6699',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          cursor: 'pointer',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#ff4477';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#ff6699';
        }}
      >
        重新开始
      </button>
    </div>
  );
}
