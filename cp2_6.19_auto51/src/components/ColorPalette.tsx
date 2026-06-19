import React from 'react';
import type { ColorInfo, FilledRegion, ProcessedImageData } from '../modules/imageProcessor/types';

interface ColorPaletteProps {
  colorPalette: ColorInfo[];
  selectedColorIndex: number | null;
  onColorSelect: (index: number) => void;
  processedData: ProcessedImageData | null;
  filledRegions: FilledRegion[];
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  colorPalette,
  selectedColorIndex,
  onColorSelect,
  processedData,
  filledRegions
}) => {
  const getCompletionCount = (colorIdx: number): { done: number; total: number } => {
    if (!processedData) return { done: 0, total: 0 };
    let total = 0;
    let done = 0;
    for (const r of processedData.regions) {
      if (r.colorIndex === colorIdx) {
        total++;
        const filled = filledRegions.find(f => f.regionId === r.id);
        if (filled && filled.colorIndex === colorIdx) {
          done++;
        }
      }
    }
    return { done, total };
  };

  if (colorPalette.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>色板</div>
          <div style={styles.headerSubtitle}>点击颜色开始填色</div>
        </div>
        <div style={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2 0-.49-.18-.94-.51-1.28-.33-.35-.54-.81-.54-1.3 0-1.1.9-2 2-2h2.37c2.56 0 4.67-2.07 4.67-4.63C21.89 6.01 17.5 2 12 2z" />
            <circle cx="6.5" cy="11.5" r="1.5" />
            <circle cx="9.5" cy="7.5" r="1.5" />
            <circle cx="14.5" cy="7.5" r="1.5" />
            <circle cx="17.5" cy="11.5" r="1.5" />
          </svg>
          <div style={styles.emptyText}>上传图片后</div>
          <div style={styles.emptyText}>将生成可用颜色</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>色板</div>
        <div style={styles.headerSubtitle}>
          {selectedColorIndex !== null
            ? `已选: ${selectedColorIndex + 1} 号色`
            : '选择颜色后点击画布'}
        </div>
      </div>

      <div style={styles.paletteGrid}>
        {colorPalette.map((color) => {
          const { done, total } = getCompletionCount(color.index);
          const isSelected = selectedColorIndex === color.index;
          const isComplete = total > 0 && done === total;
          const progress = total > 0 ? (done / total) * 100 : 0;
          const brightness = (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000;
          const textColor = brightness > 128 ? '#333' : '#fff';

          return (
            <button
              key={color.index}
              style={{
                ...styles.colorItem,
                borderColor: isSelected ? '#4A5043' : 'transparent',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(74,80,67,0.25), 0 0 0 2px #A7B7A0'
                  : '0 1px 3px rgba(0,0,0,0.08)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                opacity: isComplete ? 0.7 : 1
              }}
              onClick={() => onColorSelect(color.index)}
            >
              <div
                style={{
                  ...styles.colorSwatch,
                  background: color.hex,
                  color: textColor
                }}
              >
                <span style={styles.colorNumber}>{color.index + 1}</span>
                {total > 0 && (
                  <div style={styles.swatchProgress}>
                    <div
                      style={{
                        ...styles.swatchProgressBar,
                        width: `${progress}%`,
                        background: 'rgba(0,0,0,0.25)'
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={styles.colorInfo}>
                <div style={styles.colorLabel}>{color.hex.toUpperCase()}</div>
                <div style={styles.colorCount}>
                  {done}/{total} 块
                </div>
              </div>
              {isComplete && (
                <div style={styles.checkMark}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7F63" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={styles.tips}>
        <div style={styles.tipsTitle}>操作提示</div>
        <div style={styles.tipsItem}>1. 点击上方色块选择颜色</div>
        <div style={styles.tipsItem}>2. 点击画布上对应编号区域填充</div>
        <div style={styles.tipsItem}>3. 选错颜色会有红色边框提示</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '240px',
    height: '100%',
    background: '#FAF8F5',
    borderLeft: '1px solid #E8E2D8',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto' as const
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#4A5043'
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#8A8A8A'
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  colorItem: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px',
    borderRadius: '10px',
    background: '#FFFFFF',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  colorSwatch: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: '6px',
    overflow: 'hidden'
  },
  colorNumber: {
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'monospace',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  swatchProgress: {
    position: 'absolute',
    left: '6px',
    right: '6px',
    bottom: '6px',
    height: '3px',
    background: 'rgba(255,255,255,0.35)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  swatchProgressBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease'
  },
  colorInfo: {
    padding: '8px 4px 4px 4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  colorLabel: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#8A8A8A',
    letterSpacing: '0.5px'
  },
  colorCount: {
    fontSize: '11px',
    color: '#6B7F63',
    fontWeight: 500
  },
  checkMark: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#E8EEE4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#ccc',
    padding: '40px 10px'
  },
  emptyText: {
    fontSize: '13px',
    color: '#aaa'
  },
  tips: {
    marginTop: 'auto',
    padding: '14px',
    borderRadius: '10px',
    background: '#F4F0E8',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  tipsTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8A8A8A',
    marginBottom: '2px'
  },
  tipsItem: {
    fontSize: '11.5px',
    color: '#666',
    lineHeight: 1.5
  }
};

export default ColorPalette;
