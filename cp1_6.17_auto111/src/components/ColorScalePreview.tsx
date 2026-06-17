import React, { useState, memo } from 'react';
import {
  useColorStore,
  CoreColor,
  SCALE_LABELS,
} from '../stores/colorStore';
import { getContrastColor } from '../utils/colorUtils';

interface ColorScaleSwatchProps {
  hex: string;
  label: string;
  coreId: string;
  scaleIndex: number;
  isSelected: boolean;
  onSelect: (coreId: string, scaleIndex: number) => void;
}

const ColorScaleSwatch = memo<ColorScaleSwatchProps>(
  ({ hex, label, coreId, scaleIndex, isSelected, onSelect }) => {
    const [copied, setCopied] = useState(false);
    const [highlight, setHighlight] = useState(false);
    const [hovered, setHovered] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(hex);
        setCopied(true);
        setHighlight(true);
        onSelect(coreId, scaleIndex);

        setTimeout(() => setCopied(false), 1500);
        setTimeout(() => setHighlight(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    };

    const textColor = getContrastColor(hex);

    return (
      <div
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          flexShrink: 0,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          onClick={handleClick}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '4px',
            backgroundColor: hex,
            cursor: 'pointer',
            border: highlight
              ? '2px solid #111827'
              : isSelected
              ? '2px solid #3B82F6'
              : '1px solid rgba(0,0,0,0.08)',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease, transform 0.1s ease',
            overflow: 'visible',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#FFFFFF',
              backgroundColor: 'rgba(0,0,0,0.75)',
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s ease',
              pointerEvents: 'none',
            }}
          >
            {hex}
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '-16px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              color: '#6B7280',
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        </div>

        {copied && (
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(17, 24, 39, 0.92)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
              animation: 'copiedToast 1.5s ease-out forwards',
            }}
          >
            Copied!
          </div>
        )}
      </div>
    );
  }
);

ColorScaleSwatch.displayName = 'ColorScaleSwatch';

interface CoreColorCardProps {
  color: CoreColor;
}

const CoreColorCard = memo<CoreColorCardProps>(({ color }) => {
  const [showDelete, setShowDelete] = useState(false);
  const [, forceUpdate] = useState(0);

  const toggleColorExpanded = useColorStore((s) => s.toggleColorExpanded);
  const removeCoreColor = useColorStore((s) => s.removeCoreColor);
  const setSelectedColor = useColorStore((s) => s.setSelectedColor);
  const selected = useColorStore((s) => s.selected);

  const isSelectedCore = selected.coreId === color.id;
  const textColor = getContrastColor(color.hex);

  const handleCardClick = () => {
    toggleColorExpanded(color.id);
    forceUpdate((n) => n + 1);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeCoreColor(color.id);
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={() => setShowDelete(false)}
        style={{
          position: 'relative',
          width: '60px',
          height: '60px',
          borderRadius: '8px',
          backgroundColor: color.hex,
          cursor: 'pointer',
          border: isSelectedCore ? '2px solid #3B82F6' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: color.expanded
            ? '0 4px 12px rgba(59, 130, 246, 0.25)'
            : '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          marginBottom: '6px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: textColor,
            opacity: 0.9,
          }}
        >
          {color.hex}
        </div>

        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            border: '2px solid #FFFFFF',
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: showDelete ? 1 : 0,
            transform: showDelete ? 'scale(1)' : 'scale(0.7)',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          width: '60px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#555555',
          fontWeight: 500,
        }}
      >
        {color.role}
      </div>

      <div
        style={{
          marginTop: '20px',
          maxHeight: color.expanded ? '100px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out',
          paddingTop: color.expanded ? '12px' : '0px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '4px',
            paddingBottom: '24px',
            overflowX: 'auto',
            overflowY: 'visible',
            padding: '4px 4px 28px 4px',
            scrollbarWidth: 'thin',
          }}
          className="scale-row"
          onWheel={(e) => {
            const container = e.currentTarget;
            container.scrollLeft += e.deltaY;
          }}
        >
          {color.scale.map((hex, idx) => (
            <ColorScaleSwatch
              key={`${color.id}-${idx}`}
              hex={hex}
              label={SCALE_LABELS[idx]}
              coreId={color.id}
              scaleIndex={idx}
              isSelected={
                selected.coreId === color.id && selected.scaleIndex === idx
              }
              onSelect={setSelectedColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

CoreColorCard.displayName = 'CoreColorCard';

export const ColorScalePreview: React.FC = () => {
  const coreColors = useColorStore((s) => s.coreColors);

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px 16px',
        }}
        className="core-colors-grid"
      >
        {coreColors.map((color) => (
          <div
            key={color.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <CoreColorCard color={color} />
          </div>
        ))}
      </div>

      {coreColors.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: '#9CA3AF',
            fontSize: '14px',
          }}
        >
          暂无核心色，请点击上方按钮添加
        </div>
      )}
    </div>
  );
};

export default ColorScalePreview;
