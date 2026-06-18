import { useGameStore } from '@/store/useGameStore';
import { ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_DESCS, ElementType } from '@/types';

const ELEMENTS: ElementType[] = ['fire', 'water', 'earth', 'wind'];

export default function InventoryPanel() {
  const showInventory = useGameStore((s) => s.showInventory);
  const inventory = useGameStore((s) => s.inventory);
  const toggleInventory = useGameStore((s) => s.toggleInventory);

  if (!showInventory) return null;

  const counts: Record<ElementType, number> = { fire: 0, water: 0, earth: 0, wind: 0 };
  for (const c of inventory) {
    counts[c.element]++;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 360,
        background: 'rgba(26, 26, 46, 0.92)',
        borderRadius: 12,
        padding: 16,
        fontFamily: '"Press Start 2P", monospace',
        color: '#e0e0e0',
        fontSize: 10,
        border: '2px solid #3a3a5e',
        backgroundImage: `repeating-linear-gradient(
          90deg,
          rgba(60, 40, 20, 0.15) 0px,
          rgba(60, 40, 20, 0.05) 2px,
          transparent 2px,
          transparent 8px
        )`,
        zIndex: 25,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ color: '#ffd700', fontSize: 12 }}>库存</span>
        <button
          onClick={toggleInventory}
          style={{
            background: 'none',
            border: '1px solid #666',
            color: '#999',
            borderRadius: 4,
            padding: '2px 8px',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            cursor: 'pointer',
          }}
        >
          关闭[I]
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {ELEMENTS.map((el) => (
          <div
            key={el}
            style={{
              padding: 8,
              background: `rgba(${hexToRgb(ELEMENT_COLORS[el])}, 0.1)`,
              border: `1px solid ${ELEMENT_COLORS[el]}`,
              borderRadius: 6,
              textAlign: 'center',
              fontSize: 8,
            }}
          >
            <div style={{ color: ELEMENT_COLORS[el], fontSize: 16, marginBottom: 4 }}>
              {counts[el]}
            </div>
            <div style={{ color: ELEMENT_COLORS[el] }}>
              {ELEMENT_NAMES[el]}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 4,
          maxHeight: 180,
          overflowY: 'auto',
        }}
      >
        {inventory.map((crystal, i) => (
          <div
            key={`${crystal.id}_${i}`}
            style={{
              width: 40,
              height: 40,
              border: `2px solid ${ELEMENT_COLORS[crystal.element]}`,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `rgba(${hexToRgb(ELEMENT_COLORS[crystal.element])}, 0.15)`,
              position: 'relative',
              cursor: 'default',
              title: `${ELEMENT_NAMES[crystal.element]}: ${ELEMENT_DESCS[crystal.element]}`,
            }}
          >
            {getElementSymbol(crystal.element)}
          </div>
        ))}
      </div>

      {inventory.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', fontSize: 8, marginTop: 12 }}>
          库存为空，去野外采集结晶吧！
        </div>
      )}
    </div>
  );
}

function getElementSymbol(element: ElementType): React.ReactNode {
  const colors = ELEMENT_COLORS;
  const size = 18;
  switch (element) {
    case 'fire':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <polygon points="8,1 14,13 2,13" fill={colors.fire} />
        </svg>
      );
    case 'water':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill={colors.water} />
        </svg>
      );
    case 'earth':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <rect x="3" y="3" width="10" height="10" fill={colors.earth} />
        </svg>
      );
    case 'wind':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <polygon points="8,1 15,8 8,15 1,8" fill={colors.wind} />
        </svg>
      );
  }
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
