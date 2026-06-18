import { useState, useEffect } from 'react';
import PlantScene from './components/PlantScene';
import ControlPanel from './components/ControlPanel';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #b3e5fc 0%, #ffe0b2 100%)',
  };

  const sceneStyle: React.CSSProperties = {
    flex: 1,
    minHeight: isMobile ? '60%' : 0,
    position: 'relative',
    overflow: 'hidden',
  };

  const panelStyle: React.CSSProperties = {
    width: isMobile ? '100%' : 340,
    minWidth: isMobile ? 'auto' : 320,
    maxWidth: isMobile ? '100%' : 380,
    flexShrink: 0,
    maxHeight: isMobile ? '40%' : '100%',
  };

  return (
    <div style={containerStyle}>
      <div style={sceneStyle}>
        <PlantScene />
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
            padding: '10px 16px',
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🌳</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#5d4037' }}>交互式园艺模拟器</div>
              <div style={{ fontSize: 11, color: '#8d6e63', marginTop: 2 }}>
                3D植物生长 · 物理反馈 · 环境交互
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? 'calc(40% + 12px)' : 16,
            left: 16,
            background: 'rgba(139, 195, 74, 0.95)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(139,195,74,0.4)',
            zIndex: 10,
          }}
        >
          💡 鼠标拖拽旋转视角 · 滚轮缩放
        </div>
      </div>
      <div style={panelStyle}>
        <ControlPanel />
      </div>
    </div>
  );
}
