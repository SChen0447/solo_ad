import React, { useState } from 'react';
import type { Link, Card as CardType } from '../types';
import { useCardStore } from '../store/useCardStore';
import { X } from 'lucide-react';

interface LinkLineProps {
  link: Link;
  sourceCard: CardType | undefined;
  targetCard: CardType | undefined;
  isHighlighted: boolean;
  isDimmed: boolean;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 200;

export const LinkLine: React.FC<LinkLineProps> = ({
  link,
  sourceCard,
  targetCard,
  isHighlighted,
  isDimmed,
}) => {
  const { updateLinkLabel, deleteLink } = useCardStore();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(link.label);
  const [showActions, setShowActions] = useState(false);

  if (!sourceCard || !targetCard) return null;

  const sx = sourceCard.x + CARD_WIDTH;
  const sy = sourceCard.y + CARD_HEIGHT / 2;
  const tx = targetCard.x;
  const ty = targetCard.y + CARD_HEIGHT / 2;

  const dx = tx - sx;
  const dy = ty - sy;
  const cx1 = sx + dx * 0.5;
  const cy1 = sy;
  const cx2 = sx + dx * 0.5;
  const cy2 = ty;

  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  const pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveLabel = () => {
    updateLinkLabel(link.id, label.trim());
    setIsEditing(false);
  };

  const classes = [
    'link-line',
    isHighlighted ? 'link-highlighted' : '',
    isDimmed ? 'link-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className={classes}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        if (!isEditing) setLabel(link.label);
      }}
    >
      <path
        className="link-halo"
        d={pathD}
        fill="none"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        className="link-path"
        d={pathD}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        className="link-animated"
        d={pathD}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="8 16"
      />
      <defs>
        <marker
          id={`arrow-${link.id}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      <path
        className="link-path-arrow"
        d={pathD}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${link.id})`}
      />

      <foreignObject
        x={midX - 60}
        y={midY - 14}
        width={120}
        height={28}
      >
        <div
          className="link-label-wrapper"
          style={{
            transform: 'translateX(0)',
          }}
        >
          {isEditing ? (
            <div className="link-label-edit">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="关联说明"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLabel();
                  if (e.key === 'Escape') {
                    setLabel(link.label);
                    setIsEditing(false);
                  }
                }}
              />
              <button
                className="icon-btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveLabel();
                }}
              >
                ✓
              </button>
            </div>
          ) : (
            <div className="link-label-content">
              <span className="link-label-text">
                {link.label || '双击添加说明'}
              </span>
              {showActions && (
                <button
                  className="icon-btn-xs icon-btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLink(link.id);
                  }}
                  title="删除连线"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};
