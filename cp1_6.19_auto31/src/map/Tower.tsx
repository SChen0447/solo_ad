import React from 'react';
import { useGameStore, TOWER_CONFIG, UPGRADE_PRICES, type TowerType } from '../state/gameStore';

const TOWER_COLORS: Record<TowerType, string> = {
  fire: '#e74c3c',
  ice: '#3498db',
  lightning: '#f1c40f',
};

const TOWER_SYMBOLS: Record<TowerType, string> = {
  fire: '🔥',
  ice: '❄',
  lightning: '⚡',
};

const TOWER_LABELS: Record<TowerType, string> = {
  fire: '火',
  ice: '冰',
  lightning: '雷',
};

interface TowerProps {
  id: string;
  x: number;
  y: number;
  type: TowerType;
  level: number;
  attack: number;
  range: number;
  selected: boolean;
}

export const Tower: React.FC<TowerProps> = ({
  id,
  x,
  y,
  type,
  level,
  attack,
  range,
  selected,
}) => {
  const { selectTower, gold, upgradeTower } = useGameStore();
  const color = TOWER_COLORS[type];
  const canUpgrade = level < 3;
  const upgradePrice = canUpgrade ? UPGRADE_PRICES[level] : 0;
  const canAffordUpgrade = gold >= upgradePrice;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectTower(selected ? null : id);
  };

  return (
    <g onClick={handleClick} style={{ cursor: 'pointer' }}>
      {selected && (
        <circle
          cx={x}
          cy={y}
          r={range}
          fill={color}
          fillOpacity={0.08}
          stroke={color}
          strokeOpacity={0.4}
          strokeWidth={2}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}

      <circle cx={x} cy={y} r={22} fill="#2c3e50" stroke={color} strokeWidth={3} />

      <circle cx={x} cy={y} r={16} fill={color} fillOpacity={0.85} />

      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        fill="#fff"
        fontSize={14}
        fontWeight="bold"
        pointerEvents="none"
      >
        {TOWER_LABELS[type]}
      </text>

      <g pointerEvents="none">
        {[...Array(level)].map((_, i) => (
          <circle
            key={i}
            cx={x - 16 + i * 12}
            cy={y - 28}
            r={4}
            fill="#f1c40f"
            stroke="#d35400"
            strokeWidth={1}
          />
        ))}
      </g>

      {selected && (
        <foreignObject
          x={x - 90}
          y={y + 30}
          width={180}
          height={canUpgrade ? 150 : 110}
          pointerEvents="auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: 'rgba(26, 37, 47, 0.98)',
              borderRadius: 8,
              padding: 12,
              border: `2px solid ${color}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color }}>
              {TOWER_SYMBOLS[type]} {TOWER_CONFIG[type].name} Lv.{level}
            </div>
            <div>攻击力：<span style={{ color: '#e74c3c' }}>{attack}</span></div>
            <div>攻击范围：<span style={{ color: '#3498db' }}>{range}px</span></div>
            {canUpgrade ? (
              <button
                disabled={!canAffordUpgrade}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canAffordUpgrade) upgradeTower(id);
                }}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '6px 8px',
                  background: canAffordUpgrade ? '#27ae60' : '#7f8c8d',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: canAffordUpgrade ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                }}
              >
                升级（{upgradePrice}金）
              </button>
            ) : (
              <div style={{ marginTop: 8, color: '#f1c40f', textAlign: 'center', fontWeight: 'bold' }}>
                ★ 满级 ★
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

interface ToolbarProps {
  width?: number;
  iconSize?: number;
}

export const TowerToolbar: React.FC<ToolbarProps> = ({ width = 200, iconSize = 50 }) => {
  const { gold, placingTower, setPlacingTower } = useGameStore();
  const towerTypes: TowerType[] = ['fire', 'ice', 'lightning'];

  return (
    <div
      style={{
        width,
        height: '100%',
        background: '#2c3e50',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        borderRight: '2px solid #34495e',
        flexShrink: 0,
      }}
    >
      <div style={{ color: '#ecf0f1', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
        🛡️ 防御塔
      </div>

      {towerTypes.map((type) => {
        const price = { fire: 80, ice: 100, lightning: 120 }[type];
        const canAfford = gold >= price;
        const isSelected = placingTower === type;
        const color = TOWER_COLORS[type];
        const hoverStyle: React.CSSProperties = {
          transition: 'transform 0.15s, box-shadow 0.15s',
          transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isSelected ? `0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
        };

        return (
          <div
            key={type}
            onClick={() => canAfford && setPlacingTower(isSelected ? null : type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 10,
              borderRadius: 10,
              background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              opacity: canAfford ? 1 : 0.5,
              border: isSelected ? `2px solid ${color}` : '2px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (canAfford) {
                (e.currentTarget.style.transform = 'translateY(-4px)');
                (e.currentTarget.style.boxShadow = `0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.4)`);
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget.style.transform = 'translateY(0)');
                (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)');
              }
            }}
          >
            <div
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: iconSize * 0.5,
                fontWeight: 'bold',
                ...hoverStyle,
                flexShrink: 0,
              }}
            >
              {TOWER_LABELS[type]}
            </div>
            <div style={{ color: '#ecf0f1', fontSize: 13 }}>
              <div style={{ fontWeight: 'bold' }}>{TOWER_CONFIG[type].name}</div>
              <div style={{ color: canAfford ? '#f1c40f' : '#e74c3c', marginTop: 2 }}>
                💰 {price}
              </div>
            </div>
          </div>
        );
      })}

      {placingTower && (
        <div
          style={{
            marginTop: 'auto',
            padding: 10,
            borderRadius: 6,
            background: 'rgba(52, 152, 219, 0.3)',
            border: '1px solid #3498db',
            color: '#ecf0f1',
            fontSize: 11,
            textAlign: 'center',
          }}
        >
          点击网格空地放置
          <br />
          <button
            onClick={() => setPlacingTower(null)}
            style={{
              marginTop: 6,
              padding: '4px 8px',
              background: '#e74c3c',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            取消
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          color: '#95a5a6',
          fontSize: 10,
          lineHeight: 1.6,
          borderTop: '1px solid #34495e',
          paddingTop: 12,
        }}
      >
        🔥 火塔：灼烧伤害<br />
        ❄ 冰塔：减速效果<br />
        ⚡ 雷塔：连锁攻击
      </div>
    </div>
  );
};
