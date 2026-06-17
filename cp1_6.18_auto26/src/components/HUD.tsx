import { GameState, STORY_FRAGMENTS } from '../game/entities';

interface HUDProps {
  state: GameState;
}

function Bar({
  value,
  max,
  color,
  label,
  icon,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  icon: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={barContainerStyle}>
      <div style={barLabelStyle}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span className="pixel-text" style={barTextStyle}>
          {label}
        </span>
        <span className="pixel-text" style={barValueStyle}>
          {Math.round(value)}/{max}
        </span>
      </div>
      <div style={barOuterStyle}>
        <div
          style={{
            ...barInnerStyle,
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}, 0 0 16px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

export default function HUD({ state }: HUDProps) {
  const sub = state.submarine;
  const totalStories = STORY_FRAGMENTS.length;

  return (
    <div style={hudContainerStyle}>
      <div style={topLeftStyle}>
        <Bar value={sub.health} max={sub.maxHealth} color="#ff4757" label="HP" icon="❤️" />
        <div style={{ height: 8 }} />
        <Bar value={sub.oxygen} max={sub.maxOxygen} color="#00d4ff" label="O₂" icon="💨" />
      </div>

      <div style={topCenterStyle}>
        {state.boss && state.boss.active && (
          <div style={bossBarContainerStyle}>
            <div className="pixel-text" style={bossNameStyle}>
              {state.boss.bossType === 'octopus' ? '🐙 深海巨章鱼' : '🐉 远古海龙'}
            </div>
            <div style={bossBarOuterStyle}>
              <div
                style={{
                  ...bossBarInnerStyle,
                  width: `${(state.boss.health / state.boss.maxHealth) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={topRightStyle}>
        <div style={statBoxStyle}>
          <span style={{ fontSize: 20 }}>💰</span>
          <span className="pixel-text" style={statTextStyle}>
            {sub.coins}
          </span>
        </div>
        <div style={statBoxStyle}>
          <span style={{ fontSize: 20 }}>💎</span>
          <span className="pixel-text" style={statTextStyle}>
            {sub.relics}/{totalStories}
          </span>
        </div>
        {sub.relicFragments > 0 && (
          <div style={{ ...statBoxStyle, opacity: 0.7 }}>
            <span style={{ fontSize: 16 }}>🔮</span>
            <span className="pixel-text" style={{ ...statTextStyle, fontSize: 10 }}>
              碎片 {sub.relicFragments}/3
            </span>
          </div>
        )}
      </div>

      <div style={bottomStyle}>
        <div style={depthMeterStyle}>
          <div className="pixel-text" style={depthLabelStyle}>
            深度
          </div>
          <div style={depthBarStyle}>
            <div
              style={{
                ...depthFillStyle,
                height: `${Math.max(0, Math.min(100, (state.depth / 1000) * 100))}%`,
              }}
            />
            <div
              style={{
                ...depthMarkerStyle,
                bottom: `${Math.max(0, Math.min(100, (state.depth / 1000) * 100))}%`,
              }}
            />
          </div>
          <div className="pixel-text" style={depthValueStyle}>
            {state.depth}m
          </div>
        </div>
      </div>

      <div style={hintBubbleStyle}>
        <div className="pixel-text" style={hintTextStyle}>
          WASD 移动
        </div>
        <div className="pixel-text" style={hintTextStyle}>
          空格 射击
        </div>
        <div className="pixel-text" style={hintTextStyle}>
          R 重新开始
        </div>
      </div>
    </div>
  );
}

const hudContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 10,
};

const topLeftStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 260,
};

const topCenterStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 400,
  maxWidth: '50%',
};

const topRightStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'flex-end',
};

const bottomStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
};

const barContainerStyle: React.CSSProperties = {
  marginBottom: 2,
};

const barLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 3,
};

const barTextStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#5bc0de',
  textShadow: '0 0 6px #5bc0de, 0 0 12px rgba(91, 192, 222, 0.5)',
  letterSpacing: 1,
};

const barValueStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#ffffff',
  marginLeft: 'auto',
  textShadow: '0 0 4px #5bc0de',
};

const barOuterStyle: React.CSSProperties = {
  width: '100%',
  height: 14,
  background: 'rgba(0, 0, 0, 0.6)',
  border: '2px solid #5bc0de',
  borderRadius: 2,
  overflow: 'hidden',
  boxShadow: '0 0 6px rgba(91, 192, 222, 0.4), inset 0 0 4px rgba(0,0,0,0.5)',
  imageRendering: 'pixelated',
};

const barInnerStyle: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.15s ease-out',
  imageRendering: 'pixelated',
};

const statBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(0, 0, 0, 0.5)',
  border: '2px solid #5bc0de',
  padding: '6px 12px',
  borderRadius: 2,
  boxShadow: '0 0 8px rgba(91, 192, 222, 0.3)',
};

const statTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#ffd700',
  textShadow: '0 0 6px #ffd700',
  letterSpacing: 1,
};

const bossBarContainerStyle: React.CSSProperties = {
  textAlign: 'center',
};

const bossNameStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#ff6b6b',
  textShadow: '0 0 8px #ff0000, 0 0 16px rgba(255, 0, 0, 0.5)',
  marginBottom: 6,
  letterSpacing: 2,
};

const bossBarOuterStyle: React.CSSProperties = {
  width: '100%',
  height: 18,
  background: 'rgba(0, 0, 0, 0.7)',
  border: '2px solid #ff4757',
  borderRadius: 2,
  overflow: 'hidden',
  boxShadow: '0 0 10px rgba(255, 71, 87, 0.5)',
};

const bossBarInnerStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(180deg, #ff6b6b 0%, #c0392b 100%)',
  boxShadow: '0 0 12px #ff4757, inset 0 -3px 0 rgba(0,0,0,0.3)',
  transition: 'width 0.2s ease-out',
};

const depthMeterStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const depthLabelStyle: React.CSSProperties = {
  fontSize: 8,
  color: '#5bc0de',
  textShadow: '0 0 4px #5bc0de',
  letterSpacing: 2,
};

const depthBarStyle: React.CSSProperties = {
  width: 14,
  height: 120,
  background: 'rgba(0, 0, 0, 0.6)',
  border: '2px solid #5bc0de',
  borderRadius: 2,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 0 6px rgba(91, 192, 222, 0.4)',
};

const depthFillStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'linear-gradient(0deg, #1a5276 0%, #5bc0de 100%)',
  boxShadow: '0 0 10px #5bc0de',
  transition: 'height 0.3s ease-out',
};

const depthMarkerStyle: React.CSSProperties = {
  position: 'absolute',
  left: -4,
  right: -4,
  height: 3,
  background: '#ffd700',
  boxShadow: '0 0 6px #ffd700',
  transition: 'bottom 0.3s ease-out',
};

const depthValueStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#ffffff',
  textShadow: '0 0 6px #5bc0de',
};

const hintBubbleStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(0, 20, 40, 0.55)',
  border: '2px solid rgba(91, 192, 222, 0.5)',
  borderRadius: 12,
  padding: '10px 18px',
  display: 'flex',
  flexDirection: 'row',
  gap: 16,
  backdropFilter: 'blur(4px)',
  animation: 'bubbleFloat 3s ease-in-out infinite',
};

const hintTextStyle: React.CSSProperties = {
  fontSize: 9,
  color: 'rgba(180, 220, 255, 0.85)',
  textShadow: '0 0 4px rgba(91, 192, 222, 0.6)',
  letterSpacing: 1,
};
