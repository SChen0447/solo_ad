import { useEffect, useState } from 'react';
import {
  GridConfig,
  GridItemConfig,
  getGridContainerStyle,
  getGridItemStyle
} from '../utils/gridStyles';

interface GridPreviewProps {
  gridConfig: GridConfig;
  itemsConfig: GridItemConfig[];
  selectedItem: number | null;
  onItemSelect: (index: number | null) => void;
}

export default function GridPreview({
  gridConfig,
  itemsConfig,
  selectedItem,
  onItemSelect
}: GridPreviewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onItemSelect(null);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerBar}>
        <span style={styles.headerTitle}>预览区域</span>
        <span style={styles.headerHint}>
          {selectedItem !== null
            ? `已选中子项 #${selectedItem + 1}`
            : '点击子元素进行编辑'}
        </span>
      </div>
      <div
        style={styles.previewArea}
        onClick={handleContainerClick}
      >
        <div style={getGridContainerStyle(gridConfig)}>
          {itemsConfig.map((itemConfig, index) => {
            const isSelected = selectedItem === index;
            const isHovered = hoveredIndex === index;
            const baseStyle = getGridItemStyle(itemConfig, index);
            return (
              <div
                key={index}
                onClick={e => {
                  e.stopPropagation();
                  onItemSelect(index);
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  ...baseStyle,
                  ...(isMobile
                    ? { fontSize: '14px', minWidth: '40px', minHeight: '40px' }
                    : {}),
                  border: isSelected
                    ? '3px solid #f97316'
                    : '1px solid #d1d5db',
                  boxShadow: isSelected
                    ? '0 0 0 3px rgba(249, 115, 22, 0.2), 0 2px 8px rgba(0,0,0,0.12)'
                    : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transform: isSelected ? 'scale(1.02)' : undefined,
                  transition: 'box-shadow 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                {index + 1}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: isMobile ? '11px' : '13px',
                      fontWeight: 500,
                      transition: 'opacity 0.2s',
                      opacity: 1,
                      backdropFilter: 'blur(1px)'
                    }}
                  >
                    点击选中
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  headerBar: {
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151'
  },
  headerHint: {
    fontSize: '12px',
    color: '#6b7280'
  },
  previewArea: {
    flex: 1,
    backgroundColor: '#eef2ff',
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box'
  }
};
