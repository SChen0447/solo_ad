import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Editor from './Editor/Editor';
import Game from './Game/Game';
import Lobby from './Lobby/Lobby';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 200);
  };

  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    background: 'linear-gradient(135deg, #1e2a3a 0%, #2a3a4a 100%)',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundClip: 'padding-box',
    margin: '12px',
    minWidth: '200px'
  };

  const buttonBorderStyle = {
    borderImage: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%) 1'
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e2a3a 0%, #0f1a2a 100%)',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 30%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <h1 style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#00d4ff',
        marginBottom: '16px',
        textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
        letterSpacing: '2px'
      }}>
        塔防对战平台
      </h1>
      
      <p style={{
        fontSize: '16px',
        color: '#8899aa',
        marginBottom: '48px',
        letterSpacing: '1px'
      }}>
        自定义地图 · 实时攻防对战 · 多人观战
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          style={{ ...buttonStyle, ...buttonBorderStyle }}
          onClick={(e) => { handleRipple(e); navigate('/editor'); }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {ripples.map(r => (
            <span key={r.id} style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: '10px',
              height: '10px',
              background: 'rgba(0, 212, 255, 0.5)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 0.2s ease-out forwards',
              pointerEvents: 'none'
            }} />
          ))}
          🎨 地图编辑器
        </button>

        <button
          style={{ ...buttonStyle, ...buttonBorderStyle }}
          onClick={(e) => { handleRipple(e); navigate('/lobby'); }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ⚔️ 对战大厅
        </button>
      </div>

      <style>{`
        @keyframes ripple {
          0% {
            width: 10px;
            height: 10px;
            opacity: 1;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/editor/:mapId" element={<Editor />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/game/:roomId" element={<Game />} />
      <Route path="/spectate/:roomId" element={<Game spectate />} />
    </Routes>
  );
};

export default App;
