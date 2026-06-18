import { useMemo } from 'react';
import {
  useGameStore,
  Blessing,
  FragmentColor,
} from '../store/gameStore';
import {
  canActivateBlessing,
  getBlessingRequirementText,
  activateBlessingById,
} from '../game/blessing';
import { getCollectedFragmentsByColor } from '../game/collectible';

export default function BlessingPanel({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  const blessings = useGameStore((s) => s.blessings);
  const fragments = useGameStore((s) => s.fragments);

  const collectedCounts = useMemo(() => {
    return getCollectedFragmentsByColor();
  }, [fragments]);

  const handleActivate = (blessing: Blessing) => {
    if (canActivateBlessing(blessing)) {
      activateBlessingById(blessing.id);
    }
  };

  const colorDots: { color: FragmentColor; label: string }[] = [
    { color: 'gold', label: '金' },
    { color: 'jade', label: '翠' },
    { color: 'blue', label: '蓝' },
    { color: 'red', label: '红' },
  ];

  const colorMap: Record<FragmentColor, string> = {
    gold: '#f7b731',
    jade: '#20bf6b',
    blue: '#4b7bec',
    red: '#fc5c65',
  };

  const totalCollected = Object.values(collectedCounts).reduce((a, b) => a + b, 0);

  return (
    <div className={`blessing-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h2>梦境祝福</h2>
        <p className="sub-title">已收集 {totalCollected} / 12 碎片</p>
        {onClose && <button className="close-btn" onClick={onClose}>×</button>}
      </div>

      <div className="fragment-counts">
        {colorDots.map(({ color, label }) => (
          <div key={color} className="fragment-count-item">
            <span
              className="color-dot"
              style={{ backgroundColor: colorMap[color] }}
            />
            <span className="count-text">{label}: {collectedCounts[color]}</span>
          </div>
        ))}
      </div>

      <div className="blessing-list">
        {blessings.map((blessing, index) => {
          const canActivate = canActivateBlessing(blessing);
          return (
            <div
              key={blessing.id}
              className={`blessing-card ${
                blessing.activated ? 'activated' : ''
              } ${canActivate ? 'can-activate' : ''}`}
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
              onClick={() => handleActivate(blessing)}
            >
              <div className="blessing-card-header">
                <h3>{blessing.name}</h3>
                {blessing.activated && <span className="active-badge">已激活</span>}
              </div>
              <p className="blessing-desc">{blessing.description}</p>
              <p className="blessing-req">
                需要：{getBlessingRequirementText(blessing)}
              </p>
              {canActivate && !blessing.activated && (
                <button className="activate-btn">点击激活</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
