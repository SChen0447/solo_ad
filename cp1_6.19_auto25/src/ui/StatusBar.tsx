import { useGameStore } from '@/store/useGameStore';
import { ELEMENT_COLORS, ELEMENT_NAMES, ElementType } from '@/types';

const ELEMENTS: ElementType[] = ['fire', 'water', 'earth', 'wind'];

export default function StatusBar() {
  const inventory = useGameStore((s) => s.inventory);
  const craftHistory = useGameStore((s) => s.craftHistory);
  const showCraftHistory = useGameStore((s) => s.showCraftHistory);
  const toggleCraftHistory = useGameStore((s) => s.toggleCraftHistory);

  const counts: Record<ElementType, number> = { fire: 0, water: 0, earth: 0, wind: 0 };
  for (const c of inventory) {
    counts[c.element]++;
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          background: 'rgba(26, 26, 46, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 9,
          color: '#e0e0e0',
          borderBottom: '1px solid #3a3a5e',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {ELEMENTS.map((el) => (
            <div
              key={el}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16">
                {getElementShape(el)}
              </svg>
              <span style={{ color: ELEMENT_COLORS[el] }}>{counts[el]}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 7, color: '#888' }}>
            总计: {inventory.length}
          </span>
          <button
            onClick={toggleCraftHistory}
            style={{
              background: showCraftHistory ? 'rgba(255, 140, 0, 0.3)' : 'rgba(255,255,255,0.08)',
              border: showCraftHistory ? '1px solid #ff8c00' : '1px solid #555',
              color: showCraftHistory ? '#ff8c00' : '#aaa',
              borderRadius: 4,
              padding: '3px 8px',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 7,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            合成记录
          </button>
        </div>
      </div>

      {showCraftHistory && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 8,
            width: 240,
            background: 'rgba(26, 26, 46, 0.92)',
            borderRadius: 8,
            padding: 12,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            color: '#e0e0e0',
            border: '1px solid #3a3a5e',
            zIndex: 35,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          <div style={{ color: '#ffd700', marginBottom: 8, fontSize: 9 }}>
            合成历史
          </div>
          {craftHistory.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center' }}>暂无记录</div>
          ) : (
            craftHistory.map((result, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 8px',
                  marginBottom: 4,
                  background: `rgba(${hexToRgb(result.color)}, 0.1)`,
                  border: `1px solid rgba(${hexToRgb(result.color)}, 0.3)`,
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: result.color }}>{result.name}</span>
                <span style={{ color: '#ffd700', fontSize: 7 }}>
                  {'★'.repeat(result.rarity)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function getElementShape(el: ElementType): React.ReactNode {
  const c = ELEMENT_COLORS[el];
  switch (el) {
    case 'fire':
      return <polygon points="8,2 14,14 2,14" fill={c} />;
    case 'water':
      return <circle cx="8" cy="8" r="6" fill={c} />;
    case 'earth':
      return <rect x="3" y="3" width="10" height="10" fill={c} />;
    case 'wind':
      return <polygon points="8,1 15,8 8,15 1,8" fill={c} />;
  }
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
