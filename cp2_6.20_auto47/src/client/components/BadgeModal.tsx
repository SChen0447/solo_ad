import { useEffect, useState } from 'react';
import { Badge } from '../types';

interface BadgeModalProps {
  visible: boolean;
  badges: Badge[];
  onClose: () => void;
}

export default function BadgeModal({ visible, badges, onClose }: BadgeModalProps) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnimating(true);
    }
  }, [visible]);

  if (!visible || badges.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-[10px] shadow-xl p-8 max-w-sm w-full mx-4 text-center"
        style={{
          animation: animating ? 'badgeSlideDown 0.3s ease-out forwards' : 'none',
        }}
      >
        <style>{`
          @keyframes badgeSlideDown {
            0% {
              opacity: 0;
              transform: translateY(-100%);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <div className="text-6xl mb-4">
          {badges[0].icon}
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-2">
          🎉 恭喜解锁徽章！
        </h3>

        <p className="text-lg font-semibold mb-1" style={{ color: badges[0].color }}>
          {badges[0].name}
        </p>

        <p className="text-sm text-gray-500 mb-6">
          您已累计服务 {badges[0].hours} 小时，获得「{badges[0].name}」徽章！
        </p>

        {badges.length > 1 && (
          <div className="flex justify-center gap-2 mb-4">
            {badges.slice(1).map((badge, idx) => (
              <div key={idx} className="text-center">
                <span className="text-3xl">{badge.icon}</span>
                <p className="text-xs mt-1" style={{ color: badge.color }}>{badge.name}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="px-8 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            borderRadius: '8px',
          }}
        >
          太棒了！
        </button>
      </div>
    </div>
  );
}
