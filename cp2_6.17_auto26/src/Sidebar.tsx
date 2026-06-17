import { useState } from 'react';
import { MaterialType } from '@/types';
import { MATERIAL_CONFIGS } from '@/utils';

interface SidebarProps {
  selectedMaterial: MaterialType | null;
  onSelectMaterial: (material: MaterialType) => void;
  onLoadScene: (type: 'mirror' | 'spiral' | 'random') => void;
}

const MATERIAL_ITEMS: {
  type: MaterialType;
  label: string;
  desc: string;
  color: string;
  border: string;
  isGlass: boolean;
}[] = [
  { type: 'wood', label: '木材', desc: '碎裂产生木屑', color: '#b08d5b', border: '#b08d5b', isGlass: false },
  { type: 'iron', label: '铁块', desc: '碰撞发出火星', color: '#777777', border: '#777777', isGlass: false },
  { type: 'glass', label: '玻璃', desc: '破碎飞溅液滴', color: 'transparent', border: '#88ccff', isGlass: true },
  { type: 'explosive', label: '炸药', desc: '爆炸范围冲击', color: '#ff4444', border: '#ff4444', isGlass: false },
  { type: 'launcher', label: '发射器', desc: '释放冲击波', color: '#aa66ff', border: '#aa66ff', isGlass: false },
];

const SCENE_PRESETS: { label: string; type: 'mirror' | 'spiral' | 'random' }[] = [
  { label: '镜像对称型', type: 'mirror' },
  { label: '螺旋嵌套型', type: 'spiral' },
  { label: '随机散落型', type: 'random' },
];

export default function Sidebar({ selectedMaterial, onSelectMaterial, onLoadScene }: SidebarProps) {
  const [hoveredMaterial, setHoveredMaterial] = useState<MaterialType | null>(null);
  const [randomPressed, setRandomPressed] = useState(false);

  return (
    <div
      style={{
        width: 320,
        background: '#1e1e2f',
        borderRadius: 8,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'Orbitron, sans-serif',
            color: '#e0e0e0',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          连锁反应模拟器
        </div>
        <div
          style={{
            fontFamily: '"Source Sans 3", sans-serif',
            color: '#888',
            fontSize: 13,
            marginTop: 4,
          }}
        >
          选择材质方块
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MATERIAL_ITEMS.map((item) => {
          const isSelected = selectedMaterial === item.type;
          const isHovered = hoveredMaterial === item.type;

          return (
            <div
              key={item.type}
              onClick={() => onSelectMaterial(item.type)}
              onMouseEnter={() => setHoveredMaterial(item.type)}
              onMouseLeave={() => setHoveredMaterial(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.2s',
                position: 'relative',
                padding: '8px 4px',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  borderRadius: '50%',
                  background: item.color,
                  border: item.isGlass
                    ? `2px solid ${item.border}`
                    : isSelected
                      ? '2px solid #ff6699'
                      : '2px solid transparent',
                  boxSizing: 'border-box',
                  ...(isSelected && !item.isGlass
                    ? { border: '2px solid #ff6699' }
                    : {}),
                  ...(item.isGlass && isSelected
                    ? { border: '2px solid #ff6699', boxShadow: '0 0 0 1px #ff6699' }
                    : {}),
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    color: isSelected ? '#ffffff' : '#e0e0e0',
                    fontSize: 14,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
                <span style={{ color: '#888', fontSize: 12 }}>{item.desc}</span>
              </div>

              {isHovered && MATERIAL_CONFIGS[item.type] && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: 8,
                    background: '#1e1e2f',
                    borderRadius: 4,
                    padding: '8px 12px',
                    color: '#e0e0e0',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    animation: 'fadeIn 0.3s',
                    border: '1px solid #333355',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                  <div>重量: {MATERIAL_CONFIGS[item.type].weight}</div>
                  <div>弹性: {MATERIAL_CONFIGS[item.type].restitution}</div>
                  <div>摩擦: {MATERIAL_CONFIGS[item.type].friction}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <div style={{ color: '#e0e0e0', fontSize: 15, marginBottom: 8 }}>预设场景</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SCENE_PRESETS.map((preset) => (
            <button
              key={preset.type}
              onClick={() => onLoadScene(preset.type)}
              style={{
                width: '100%',
                height: 36,
                background: '#2a2a4a',
                color: '#e0e0e0',
                borderRadius: 6,
                border: '1px solid #333355',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: '"Source Sans 3", sans-serif',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3a3a5a';
                e.currentTarget.style.borderColor = '#ff6699';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2a2a4a';
                e.currentTarget.style.borderColor = '#333355';
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onLoadScene('random')}
        onMouseDown={() => setRandomPressed(true)}
        onMouseUp={() => setRandomPressed(false)}
        onMouseLeave={() => setRandomPressed(false)}
        style={{
          width: '100%',
          height: 40,
          background: randomPressed ? '#ff4477' : '#ff6699',
          color: 'white',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: '"Source Sans 3", sans-serif',
          fontWeight: 600,
          transform: randomPressed ? 'scale(0.95)' : 'scale(1)',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!randomPressed) e.currentTarget.style.background = '#ff4477';
        }}
        onMouseOut={(e) => {
          if (!randomPressed) e.currentTarget.style.background = '#ff6699';
        }}
      >
        随机生成场景
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
