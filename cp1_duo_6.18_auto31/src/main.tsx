import React from 'react';
import ReactDOM from 'react-dom/client';
import MazeCanvas from './ui';
import { useGameStore, CONSTANTS } from './store';

const App: React.FC = () => {
  const { walls, receivers, source, mazeSize, isMobile, resetGame, clearWalls } = useGameStore();

  const allReceiversActive = receivers.every((r) => r.intensity >= r.threshold);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: CONSTANTS.COLORS.BG_MAIN,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: isMobile ? '16px' : '32px',
        padding: isMobile ? '16px' : '32px',
        overflow: 'auto',
        fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: isMobile ? '100%' : '280px',
          width: isMobile ? '100%' : 'auto',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h1
            style={{
              color: '#fff',
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 600,
              margin: 0,
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #ffd700, #00ffff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            回声迷宫
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '13px',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            调整声源位置和迷宫布局，让声波照亮所有接收器
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              margin: 0,
              marginBottom: '12px',
            }}
          >
            操作说明
          </h3>
          <ul
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px',
              lineHeight: 1.8,
              margin: 0,
              paddingLeft: '16px',
            }}
          >
            <li>按住左键拖动绘制墙壁（自动对齐网格）</li>
            <li>右键点击墙壁删除</li>
            <li>拖拽金色圆点移动声源</li>
            <li>悬停接收器查看强度</li>
            <li>最多 {CONSTANTS.MAX_WALLS} 段墙壁</li>
          </ul>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              margin: 0,
              marginBottom: '12px',
            }}
          >
            接收器状态
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {receivers.map((receiver, index) => (
              <div
                key={receiver.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '12px',
                  }}
                >
                  接收器 {index + 1}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${receiver.intensity * 100}%`,
                        height: '100%',
                        background: receiver.intensity >= receiver.threshold
                          ? '#00ff00'
                          : '#8b0000',
                        transition: 'width 0.3s, background 0.3s',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: receiver.intensity >= receiver.threshold ? '#00ff00' : '#8b0000',
                      fontSize: '11px',
                      width: '36px',
                      textAlign: 'right',
                    }}
                  >
                    {Math.round(receiver.intensity * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={clearWalls}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            清除墙壁
          </button>
          <button
            onClick={resetGame}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(0, 255, 255, 0.3))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(0, 255, 255, 0.5))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(0, 255, 255, 0.3))';
            }}
          >
            重置游戏
          </button>
        </div>

        {allReceiversActive && (
          <div
            style={{
              background: 'rgba(0, 255, 0, 0.1)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 255, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <p
              style={{
                color: '#00ff00',
                fontSize: '14px',
                fontWeight: 600,
                margin: 0,
              }}
            >
              🎉 恭喜！所有接收器已激活！
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: isMobile ? '8px' : '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto',
          maxWidth: isMobile ? '100%' : `${mazeSize + 32}px`,
          aspectRatio: '1 / 1',
        }}
      >
        <MazeCanvas />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        
        canvas {
          display: block;
          max-width: 100%;
          max-height: 100%;
        }
      `}</style>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
