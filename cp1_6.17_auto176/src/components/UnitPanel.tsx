import React from 'react';
import { UnitType, Faction, EngagementBehavior, Unit, UNIT_STATS, FACTION_COLORS, UNIT_COLORS } from '../types';

interface UnitPanelProps {
  faction: Faction;
  unitTypes: UnitType[];
  selectedUnitType: UnitType | null;
  selectedUnit: Unit | null;
  deployedUnits: Unit[];
  maxUnits: number;
  isSimulating: boolean;
  engagementBehavior: EngagementBehavior;
  terrainDensity: number;
  onSelectUnitType: (type: UnitType | null) => void;
  onSelectUnit: (unitId: string | null) => void;
  onRemoveUnit: (unitId: string) => void;
  onEngagementChange: (behavior: EngagementBehavior) => void;
  onTerrainDensityChange: (density: number) => void;
  onRegenerateMap: () => void;
  onStartSimulation: () => void;
  onResetSimulation: () => void;
}

const UnitPanel: React.FC<UnitPanelProps> = ({
  faction,
  unitTypes,
  selectedUnitType,
  selectedUnit,
  deployedUnits,
  maxUnits,
  isSimulating,
  engagementBehavior,
  terrainDensity,
  onSelectUnitType,
  onSelectUnit,
  onRemoveUnit,
  onEngagementChange,
  onTerrainDensityChange,
  onRegenerateMap,
  onStartSimulation,
  onResetSimulation,
}) => {
  const factionUnits = deployedUnits.filter((u) => u.faction === faction);
  const factionColor = FACTION_COLORS[faction];
  const isLeftPanel = faction === 'blue';

  const UnitIcon: React.FC<{ type: UnitType; size?: number }> = ({ type, size = 32 }) => {
    const color = UNIT_COLORS[type];

    if (type === 'infantry') {
      return (
        <svg width={size} height={size} viewBox="-16 -16 32 32">
          <circle cx="0" cy="0" r="12" fill={color} stroke={factionColor} strokeWidth="2" />
          <circle cx="-4" cy="-3" r="2" fill="#fff" />
          <circle cx="4" cy="-3" r="2" fill="#fff" />
        </svg>
      );
    } else if (type === 'tank') {
      return (
        <svg width={size} height={size} viewBox="-16 -16 32 32">
          <rect x="-14" y="-10" width="28" height="20" rx="2" fill={color} stroke={factionColor} strokeWidth="2" />
          <rect x="-8" y="-6" width="16" height="8" fill="#2a3a1a" />
          <rect x="6" y="-2" width="8" height="4" fill="#2a3a1a" />
        </svg>
      );
    } else {
      return (
        <svg width={size} height={size} viewBox="-16 -16 32 32">
          <polygon
            points="0,-14 -12,10 12,10"
            fill={color}
            stroke={factionColor}
            strokeWidth="2"
          />
          <rect x="-2" y="-2" width="14" height="4" fill="#333" transform="rotate(-30 5 0)" />
        </svg>
      );
    }
  };

  const panelStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '10px',
    border: '2px solid #8B7355',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#8B7355',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #8B7355',
    paddingBottom: '6px',
    marginBottom: '4px',
  };

  const buttonStyle = (active: boolean = false): React.CSSProperties => ({
    background: active ? 'rgba(76, 175, 80, 0.2)' : 'rgba(50, 70, 50, 0.6)',
    border: `2px solid ${active ? '#4CAF50' : '#5a6a5a'}`,
    color: '#e0e0e0',
    padding: '8px 12px',
    fontFamily: "'Roboto Mono', monospace",
    fontSize: '12px',
    cursor: isSimulating ? 'not-allowed' : 'pointer',
    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
    transition: 'all 0.15s ease',
    opacity: isSimulating ? 0.5 : 1,
  });

  const unitCardStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    background: selected ? 'rgba(255, 214, 0, 0.15)' : 'rgba(40, 60, 40, 0.4)',
    border: `1px solid ${selected ? '#FFD600' : '#3a4a3a'}`,
    borderRadius: '4px',
    cursor: isSimulating ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    opacity: isSimulating ? 0.6 : 1,
  });

  return (
    <div style={panelStyle}>
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: factionColor,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          {faction === 'blue' ? '蓝军' : '红军'}
        </h2>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
          已部署: {factionUnits.length} / {maxUnits}
        </p>
      </div>

      <div>
        <div style={sectionTitleStyle}>单位类型</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {unitTypes.map((type) => {
            const stats = UNIT_STATS[type];
            const isSelected = selectedUnitType === type;
            const typeName = type === 'infantry' ? '步兵' : type === 'tank' ? '坦克' : '炮兵';

            return (
              <div
                key={type}
                style={{
                  ...buttonStyle(isSelected),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px',
                }}
                onClick={() => !isSimulating && onSelectUnitType(isSelected ? null : type)}
              >
                <UnitIcon type={type} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{typeName}</div>
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                    <span style={{ color: '#4CAF50' }}>HP:{stats.hp}</span>{' '}
                    <span style={{ color: '#FF9800' }}>ATK:{stats.attack}</span>{' '}
                    <span style={{ color: '#2196F3' }}>RNG:{stats.range}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedUnit && selectedUnit.faction === faction && (
        <div>
          <div style={sectionTitleStyle}>选中单位</div>
          <div style={unitCardStyle(true)}>
            <UnitIcon type={selectedUnit.type} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>
                {selectedUnit.type === 'infantry' ? '步兵' : selectedUnit.type === 'tank' ? '坦克' : '炮兵'} #{selectedUnit.id.slice(-4)}
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                HP: <span style={{ color: '#4CAF50' }}>{selectedUnit.hp}/{selectedUnit.maxHp}</span>
              </div>
            </div>
            <button
              style={{
                background: 'rgba(244, 67, 54, 0.3)',
                border: '1px solid #F44336',
                color: '#F44336',
                padding: '4px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                borderRadius: '3px',
              }}
              onClick={() => onRemoveUnit(selectedUnit.id)}
            >
              删除
            </button>
          </div>
        </div>
      )}

      {selectedUnit && selectedUnit.faction === faction && (
        <div>
          <div style={sectionTitleStyle}>行动指令</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
            点击地图格设置路线，右键结束
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8B7355', marginBottom: '4px' }}>遭遇敌人时:</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['attack', 'flank', 'ignore'] as EngagementBehavior[]).map((behavior) => (
                <button
                  key={behavior}
                  style={{
                    ...buttonStyle(engagementBehavior === behavior),
                    flex: 1,
                    fontSize: '10px',
                    padding: '6px 4px',
                  }}
                  onClick={() => onEngagementChange(behavior)}
                >
                  {behavior === 'attack' ? '优先攻击' : behavior === 'flank' ? '绕行' : '无视'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <div style={sectionTitleStyle}>已部署单位</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
          {factionUnits.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
              暂无单位
            </div>
          ) : (
            factionUnits.map((unit) => (
              <div
                key={unit.id}
                style={unitCardStyle(selectedUnit?.id === unit.id)}
                onClick={() => !isSimulating && onSelectUnit(unit.id)}
              >
                <UnitIcon type={unit.type} size={24} />
                <span style={{ fontSize: '11px', flex: 1 }}>
                  {unit.type === 'infantry' ? '步兵' : unit.type === 'tank' ? '坦克' : '炮兵'}
                </span>
                <span style={{ fontSize: '10px', color: '#4CAF50' }}>{unit.hp}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {isLeftPanel && (
        <>
          <div>
            <div style={sectionTitleStyle}>地图设置</div>
            <div style={{ fontSize: '11px', color: '#8B7355', marginBottom: '6px' }}>
              地形丰度: {terrainDensity}%
            </div>
            <input
              type="range"
              min="30"
              max="70"
              value={terrainDensity}
              onChange={(e) => onTerrainDensityChange(Number(e.target.value))}
              disabled={isSimulating}
              style={{
                width: '100%',
                accentColor: '#4CAF50',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
              }}
            />
            <button
              style={{ ...buttonStyle(false), width: '100%', marginTop: '8px' }}
              onClick={onRegenerateMap}
            >
              重新生成地图
            </button>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              style={{
                ...buttonStyle(false),
                background: 'rgba(76, 175, 80, 0.3)',
                borderColor: '#4CAF50',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
              }}
              onClick={onStartSimulation}
              disabled={isSimulating}
            >
              开始推演
            </button>
            <button
              style={{ ...buttonStyle(false), padding: '10px' }}
              onClick={onResetSimulation}
            >
              重置
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UnitPanel;
