import { forwardRef, useState, useEffect } from 'react';
import { GridConfig, generateCellKey } from '../utils/gridUtils';

interface GridPreviewProps {
  config: GridConfig;
  onCellClick: (cellKey: string, position: { x: number; y: number }) => void;
}

const GridPreview = forwardRef<HTMLDivElement, GridPreviewProps>(
  ({ config, onCellClick }, ref) => {
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const columns = isMobile ? 1 : config.columns;

    const cells: { row: number; col: number; key: string }[] = [];
    for (let r = 1; r <= config.rows; r++) {
      for (let c = 1; c <= config.columns; c++) {
        cells.push({ row: r, col: c, key: generateCellKey(r, c) });
      }
    }

    const handleCellClick = (e: React.MouseEvent<HTMLDivElement>, cellKey: string) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.bottom + 8
      };
      onCellClick(cellKey, position);
    };

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${config.rows}, ${config.rowHeight}px)`,
      columnGap: isMobile ? 0 : `${config.columnGap}px`,
      rowGap: `${config.rowGap}px`,
      transition: 'all 0.2s ease-out',
      width: '100%',
      height: '100%'
    };

    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#282840',
        borderRadius: '8px',
        padding: '20px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>👁️</span>
            预览区域
          </h2>
          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '12px',
            color: '#8a8aaa',
            fontFamily: 'monospace'
          }}>
            <span>{config.columns}×{config.rows}</span>
            {isMobile && (
              <span style={{
                backgroundColor: '#3a3a5a',
                padding: '2px 8px',
                borderRadius: '4px',
                color: '#4fc3f7'
              }}>
                📱 移动端
              </span>
            )}
          </div>
        </div>

        <div
          ref={ref}
          style={gridStyle}
        >
          {cells.map(({ row, col, key }) => {
            const isHovered = hoveredCell === key;
            const bgColor = config.cellColors[key] || 'transparent';

            return (
              <div
                key={key}
                data-cell-key={key}
                onClick={e => handleCellClick(e, key)}
                onMouseEnter={() => setHoveredCell(key)}
                onMouseLeave={() => setHoveredCell(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${isHovered ? '#4fc3f7' : '#4a4a6a'}`,
                  borderRadius: '4px',
                  backgroundColor: bgColor,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: isHovered ? '#4fc3f7' : '#a0a0c0',
                  fontWeight: isHovered ? 600 : 400,
                  boxShadow: isHovered ? '0 0 12px rgba(79, 195, 247, 0.3)' : 'none',
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  overflow: 'hidden',
                  userSelect: 'none'
                }}
              >
                <span>{row},{col}</span>
                {isHovered && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    backgroundColor: 'rgba(79, 195, 247, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px'
                  }}>
                    🎨
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

GridPreview.displayName = 'GridPreview';

export default GridPreview;
