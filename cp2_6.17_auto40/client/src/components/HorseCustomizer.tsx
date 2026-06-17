import React, { useState } from 'react';

export type Strategy = 'lead' | 'follow' | 'sprint';

export interface HorseConfig {
  name: string;
  color: string;
  stamina: number;
  speed: number;
  strategy: Strategy;
}

const COLORS = [
  '#e94560', '#6c63ff', '#00bcd4', '#4caf50',
  '#ff9800', '#e91e63', '#9c27b0', '#ffeb3b',
];

const STRATEGIES: { key: Strategy; icon: string; label: string; desc: string }[] = [
  { key: 'lead', icon: '🐴', label: '领跑', desc: '高速起步，体力消耗快' },
  { key: 'follow', icon: '🏇', label: '跟随', desc: '稳定节奏，尾流加速' },
  { key: 'sprint', icon: '⚡', label: '冲刺', desc: '蓄力后发，终局爆发' },
];

interface Props {
  onReady: (config: HorseConfig) => void;
  waitingForPlayers: boolean;
  playerCount: number;
  totalSlots: number;
}

export default function HorseCustomizer({ onReady, waitingForPlayers, playerCount, totalSlots }: Props) {
  const [color, setColor] = useState(COLORS[0]);
  const [stamina, setStamina] = useState(75);
  const [speed, setSpeed] = useState(75);
  const [strategy, setStrategy] = useState<Strategy>('lead');
  const [name] = useState(`Player-${Math.floor(Math.random() * 9000 + 1000)}`);

  const total = stamina + speed;
  const isOverLimit = total > 150;

  const handleStaminaChange = (val: number) => {
    const newTotal = val + speed;
    if (newTotal <= 150) {
      setStamina(val);
    } else {
      setStamina(150 - speed);
    }
  };

  const handleSpeedChange = (val: number) => {
    const newTotal = stamina + val;
    if (newTotal <= 150) {
      setSpeed(val);
    } else {
      setSpeed(150 - stamina);
    }
  };

  const handleReady = () => {
    if (isOverLimit) return;
    onReady({ name, color, stamina, speed, strategy });
  };

  return (
    <div className="customizer-overlay">
      <div className="customizer-panel glass-panel">
        <h2 className="customizer-title">竞速赛马</h2>

        <div className="customizer-section">
          <span className="customizer-label">选择马匹颜色</span>
          <div className="color-grid">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="customizer-section">
          <span className="customizer-label">属性分配（总和不超过150）</span>
          <div className="attribute-row">
            <label>耐力</label>
            <input
              type="range"
              min={0}
              max={100}
              value={stamina}
              onChange={(e) => handleStaminaChange(Number(e.target.value))}
            />
            <span className="attribute-value">{stamina}</span>
          </div>
          <div className="attribute-row">
            <label>速度</label>
            <input
              type="range"
              min={0}
              max={100}
              value={speed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
            />
            <span className="attribute-value">{speed}</span>
          </div>
          <div className={`attribute-total ${isOverLimit ? 'over' : ''}`}>
            总计: {total} / 150 {isOverLimit ? '⚠️ 超出限制！' : ''}
          </div>
        </div>

        <div className="customizer-section">
          <span className="customizer-label">赛程策略</span>
          <div className="strategy-grid">
            {STRATEGIES.map((s) => (
              <button
                key={s.key}
                className={`strategy-btn ${strategy === s.key ? 'selected' : ''}`}
                onClick={() => setStrategy(s.key)}
              >
                <span className="strategy-icon">{s.icon}</span>
                {s.label}
                <span className="strategy-desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="ready-btn"
          onClick={handleReady}
          disabled={waitingForPlayers && total <= 150}
        >
          {waitingForPlayers
            ? `等待其他玩家... (${playerCount}/${totalSlots})`
            : '准备'}
        </button>
      </div>
    </div>
  );
}
